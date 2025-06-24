from fastapi import FastAPI, UploadFile, File, Response, Form, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from PIL import Image
import io
import shutil
from rembg import remove as rembg_remove, new_session
import time
import numpy as np
import tempfile
import uuid  
import os
import subprocess
from transformers import pipeline
from transparent_background import Remover
import logging
import asyncio
from datetime import datetime, timedelta
import torch
from ormbg import ORMBGProcessor 
from typing import Dict, Optional
from contextlib import contextmanager
import requests
import json
import threading
from collections import defaultdict

from carvekit.ml.files.models_loc import download_all

download_all()

from carvekit.ml.wrap.u2net import U2NET
from carvekit.ml.wrap.basnet import BASNET
from carvekit.ml.wrap.fba_matting import FBAMatting
from carvekit.ml.wrap.deeplab_v3 import DeepLabV3
from carvekit.ml.wrap.tracer_b7 import TracerUniversalB7
from carvekit.api.interface import Interface
from carvekit.pipelines.postprocessing import MattingMethod
from carvekit.pipelines.preprocessing import PreprocessingStub
from carvekit.trimap.generator import TrimapGenerator


# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Add ORMBG model initialization
ormbg_model_path = os.path.expanduser("~/.ormbg/ormbg.pth")
try:
    ormbg_processor = ORMBGProcessor(ormbg_model_path)
    if torch.cuda.is_available():
        ormbg_processor.to("cuda")
    else:
        ormbg_processor.to("cpu")
except FileNotFoundError:
    logger.error(f"ORMBG model file not found: {ormbg_model_path}")
    print("Error: ORMBG model file not found. Please run 'npm run setup-server' to download it.")
    exit(1)

app = FastAPI()

# Create temp_videos folder if it doesn't exist
TEMP_VIDEOS_DIR = "temp_videos"
os.makedirs(TEMP_VIDEOS_DIR, exist_ok=True)

# Create a frames directory within temp_videos
FRAMES_DIR = os.path.join(TEMP_VIDEOS_DIR, "frames")
os.makedirs(FRAMES_DIR, exist_ok=True)

# Add a dictionary to store processing status
processing_status = {}

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Railway GraphQL API configuration
RAILWAY_API_URL = "https://backboard.railway.app/graphql/v2"
RAILWAY_API_TOKEN = os.getenv("RAILWAY_API_TOKEN")
RAILWAY_PROJECT_ID = os.getenv("RAILWAY_PROJECT_ID")

# Railway pricing (per Railway docs)
RAILWAY_PRICING = {
    "CPU_USAGE": 20.0,  # $20 per vCPU per month
    "MEMORY_USAGE_GB": 10.0,  # $10 per GB per month  
    "NETWORK_TX_GB": 0.05,  # $0.05 per GB
}

# Rate limiting configuration
DAILY_LIMIT = int(os.environ.get("DAILY_LIMIT", "50"))  # Requests per day per IP
RATE_LIMIT = "10/minute"  # Requests per minute per IP
ABUSE_THRESHOLD = int(os.environ.get("ABUSE_THRESHOLD", "100"))  # Max requests per day before blocking

# In-memory storage for daily request tracking (use Redis in production)
daily_requests = defaultdict(int)
blocked_ips = set()
storage_lock = threading.Lock()

def get_client_ip(request: Request) -> str:
    """Get the real client IP address, considering proxies"""
    x_forwarded_for = request.headers.get("X-Forwarded-For")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.client.host

def is_ip_blocked(ip: str) -> bool:
    """Check if an IP is blocked"""
    with storage_lock:
        return ip in blocked_ips

def track_daily_request(ip: str) -> bool:
    """Track daily requests and check limits. Returns True if limit exceeded."""
    today = datetime.now().strftime("%Y-%m-%d")
    key = f"{ip}:{today}"
    
    with storage_lock:
        daily_requests[key] += 1
        
        # Check for abuse (automatic blocking)
        if daily_requests[key] > ABUSE_THRESHOLD:
            blocked_ips.add(ip)
            print(f"🚫 IP {ip} blocked for abuse: {daily_requests[key]} requests today")
            return True
        
        # Check daily limit
        if daily_requests[key] > DAILY_LIMIT:
            print(f"⚠️ IP {ip} exceeded daily limit: {daily_requests[key]}/{DAILY_LIMIT}")
            return True
        
        print(f"📊 IP {ip} requests today: {daily_requests[key]}/{DAILY_LIMIT}")
        return False

def cleanup_old_requests():
    """Clean up old request tracking data"""
    with storage_lock:
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        keys_to_delete = []
        
        for key in daily_requests.keys():
            if key.endswith(f":{yesterday}") or len(key.split(":")) != 2:
                keys_to_delete.append(key)
        
        for key in keys_to_delete:
            del daily_requests[key]
        
        if keys_to_delete:
            print(f"🧹 Cleaned up {len(keys_to_delete)} old request tracking entries")

async def cleanup_old_videos():
    while True:
        current_time = datetime.now()
        for item in os.listdir(TEMP_VIDEOS_DIR):
            item_path = os.path.join(TEMP_VIDEOS_DIR, item)
            item_modified = datetime.fromtimestamp(os.path.getmtime(item_path))
            if current_time - item_modified > timedelta(minutes=10):
                if os.path.isfile(item_path):
                    os.remove(item_path)
                    logger.info(f"Removed old file: {item_path}")
                elif os.path.isdir(item_path):
                    shutil.rmtree(item_path)
                    logger.info(f"Removed old directory: {item_path}")
        await asyncio.sleep(600)  # Run every 10 minutes

# Pre-load all models
bria_model = pipeline("image-segmentation", model="briaai/RMBG-1.4", trust_remote_code=True, device="cpu")
inspyrenet_model = Remover()
inspyrenet_model.model.cpu()
rembg_models = {
    'u2net': new_session('u2net'),
    'u2net_human_seg': new_session('u2net_human_seg'),
    'isnet-general-use': new_session('isnet-general-use'),
    'isnet-anime': new_session('isnet-anime')
}

# Initialize Carvekit models
def initialize_carvekit_model(seg_pipe_class, device='cuda'):
    model = Interface(
        pre_pipe=PreprocessingStub(),
        post_pipe=MattingMethod(
            matting_module=FBAMatting(device=device, input_tensor_size=2048, batch_size=1),
            trimap_generator=TrimapGenerator(),
            device=device
        ),
        seg_pipe=seg_pipe_class(device=device, batch_size=1)
    )
    model.segmentation_pipeline.to('cpu')
    return model

carvekit_models = {
    'u2net': initialize_carvekit_model(U2NET),
    'tracer': initialize_carvekit_model(TracerUniversalB7),
    'basnet': initialize_carvekit_model(BASNET),
    'deeplab': initialize_carvekit_model(DeepLabV3)
}

# Ensure GPU memory is cleared after initialization
torch.cuda.empty_cache()

def process_with_bria(image):
    result = bria_model(image, return_mask=True)
    mask = result
    if not isinstance(mask, Image.Image):
        mask = Image.fromarray((mask * 255).astype('uint8'))
    no_bg_image = Image.new("RGBA", image.size, (0, 0, 0, 0))
    no_bg_image.paste(image, mask=mask)
    return no_bg_image

def process_with_ormbg(image):
    result = ormbg_processor.process_image(image)
    return result

def process_with_inspyrenet(image):
    return inspyrenet_model.process(image, type='rgba')

def process_with_rembg(image, model='u2net'):
    return rembg_remove(image, session=rembg_models[model])

def process_with_carvekit(image, model='u2net'):
    # Initialize segmentation network based on model input
    if model == 'u2net':
        seg_net = U2NET(device='cuda', batch_size=1)
    elif model == 'tracer':
        seg_net = TracerUniversalB7(device='cuda', batch_size=1)
    elif model == 'basnet':
        seg_net = BASNET(device='cuda', batch_size=1)
    elif model == 'deeplab':
        seg_net = DeepLabV3(device='cuda', batch_size=1)
    else:
        raise ValueError("Unsupported model type")

    # Setup the post-processing components
    fba = FBAMatting(device='cuda', input_tensor_size=2048, batch_size=1)
    trimap = TrimapGenerator()
    preprocessing = PreprocessingStub()
    postprocessing = MattingMethod(matting_module=fba, trimap_generator=trimap, device='cuda')

    interface = Interface(pre_pipe=preprocessing, post_pipe=postprocessing, seg_pipe=seg_net)
    processed_image = interface([image])[0]
    
    return processed_image

@contextmanager
def inspyrenet_video_model_context():
    try:
        model = Remover()
        model.model.cuda()
        yield model
    finally:
        model.model.cpu()
        del model
        torch.cuda.empty_cache()

@contextmanager
def carvekit_video_model_context(model_name):
    try:
        if model_name == 'u2net':
            seg_net = U2NET(device='cuda', batch_size=1)
        elif model_name == 'tracer':
            seg_net = TracerUniversalB7(device='cuda', batch_size=1)
        elif model_name == 'basnet':
            seg_net = BASNET(device='cuda', batch_size=1)
        elif model_name == 'deeplab':
            seg_net = DeepLabV3(device='cuda', batch_size=1)
        else:
            raise ValueError("Unsupported model type")

        fba = FBAMatting(device='cuda', input_tensor_size=2048, batch_size=1)
        trimap = TrimapGenerator()
        preprocessing = PreprocessingStub()
        postprocessing = MattingMethod(matting_module=fba, trimap_generator=trimap, device='cuda')

        interface = Interface(pre_pipe=preprocessing, post_pipe=postprocessing, seg_pipe=seg_net)
        yield interface
    finally:
        del seg_net, fba, trimap, preprocessing, postprocessing, interface
        torch.cuda.empty_cache()


# Create a global lock for GPU operations
gpu_lock = asyncio.Lock()

@app.post("/remove_background/")
async def remove_background(request: Request, file: UploadFile = File(...), method: str = Form(...)):
    # Get client IP and check for abuse
    client_ip = get_client_ip(request)
    
    # Check if IP is blocked
    if is_ip_blocked(client_ip):
        raise HTTPException(
            status_code=429, 
            detail={
                "error": "IP blocked for abuse",
                "message": "Your IP has been blocked due to excessive usage. Please try again tomorrow or contact support.",
                "code": "IP_BLOCKED"
            }
        )
    
    # Track daily request
    if track_daily_request(client_ip):
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Daily limit exceeded",
                "message": f"You have exceeded the daily limit of {DAILY_LIMIT} requests. Please try again tomorrow.",
                "limit": DAILY_LIMIT,
                "code": "DAILY_LIMIT_EXCEEDED"
            }
        )
    
    try:
        # Validate file
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        image_data = await file.read()
        if len(image_data) == 0:
            raise HTTPException(status_code=400, detail="Empty file")
        
        # Check file size (limit to 10MB)
        if len(image_data) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=400, 
                detail={
                    "error": "File too large",
                    "message": "Image file size must be less than 10MB",
                    "max_size_mb": 10
                }
            )
        
        image = Image.open(io.BytesIO(image_data)).convert('RGB')
        print(f"Processing image: {image.size} for IP: {client_ip}")
        
        start_time = time.time()

        async def process_image():
            if method == 'bria':
                return await asyncio.to_thread(process_with_bria, image)
            elif method == 'inspyrenet':
                async with gpu_lock:
                    try:
                        inspyrenet_model.model.to('cuda')
                        result = await asyncio.to_thread(inspyrenet_model.process, image, type='rgba')
                    finally:
                        inspyrenet_model.model.to('cpu')
                    return result
            elif method in ['u2net_human_seg', 'isnet-general-use', 'isnet-anime']:
                return await asyncio.to_thread(process_with_rembg, image, model=method)
            elif method == 'ormbg':
                return await asyncio.to_thread(process_with_ormbg, image)
            elif method in ['u2net', 'tracer', 'basnet', 'deeplab']:
                async with gpu_lock:
                    try:
                        carvekit_models[method].segmentation_pipeline.to('cuda')
                        result = await asyncio.to_thread(carvekit_models[method], [image])
                    finally:
                        carvekit_models[method].segmentation_pipeline.to('cpu')
                    return result[0]
            else:
                raise HTTPException(status_code=400, detail="Invalid method")

        no_bg_image = await process_image()
        
        process_time = time.time() - start_time
        print(f"Background removal time ({method}): {process_time:.2f} seconds")
        
        async with gpu_lock:
            torch.cuda.empty_cache()
        
        with io.BytesIO() as output:
            no_bg_image.save(output, format="PNG")
            content = output.getvalue()

        return Response(content=content, media_type="image/png")

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error processing image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

async def process_frame(frame_path, method):
    img = Image.open(frame_path).convert('RGB')
    
    if method == 'bria':
        processed_frame = await asyncio.to_thread(process_with_bria, img)
    elif method in ['u2net_human_seg', 'isnet-general-use', 'isnet-anime']:
        processed_frame = await asyncio.to_thread(process_with_rembg, img, model=method)
    elif method == 'ormbg':
        processed_frame = await asyncio.to_thread(process_with_ormbg, img)
    else:
        raise ValueError("Invalid method")
    
    return processed_frame

async def process_video(video_path, method, video_id):
    try:
        processing_status[video_id] = {'status': 'processing', 'progress': 0, 'message': 'Initializing'}
        
        logger.info(f"Starting video processing: {video_path}")
        logger.info(f"Method: {method}")
        logger.info(f"Video ID: {video_id}")


        # Check video frame count
        frame_count_command = ['ffmpeg.ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_packets', 
                               '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', video_path]
        process = await asyncio.create_subprocess_exec(
            *frame_count_command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            logger.error(f"Error counting frames: {stderr.decode()}")
            processing_status[video_id] = {'status': 'error', 'message': 'Error counting frames'}
            return

        frame_count = int(stdout.decode().strip())
        logger.info(f"Video frame count: {frame_count}")

        #DISABLED VIDEO LENGTH LIMIT
        #if frame_count > 250:
        #    logger.warning(f"Video too long: {frame_count} frames")
        #    processing_status[video_id] = {'status': 'error', 'message': 'Video too long (max 250 frames)'}
        #    return

        # Create a unique directory for this video's frames
        frames_dir = os.path.join(FRAMES_DIR, video_id)
        os.makedirs(frames_dir, exist_ok=True)
        logger.info(f"Created frames directory: {frames_dir}")

        # Extract frames from video
        processing_status[video_id] = {'status': 'processing', 'progress': 0, 'message': 'Extracting frames'}
        extract_command = ['ffmpeg', '-i', video_path, f'{frames_dir}/frame_%05d.png']
        logger.info(f"Executing frame extraction command: {' '.join(extract_command)}")
        process = await asyncio.create_subprocess_exec(
            *extract_command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            logger.error(f"Error extracting frames: {stderr.decode()}")
            processing_status[video_id] = {'status': 'error', 'message': 'Error extracting frames'}
            return

        # Process frames
        processing_status[video_id] = {'status': 'processing', 'progress': 0, 'message': 'Removing background'}
        frame_files = sorted([f for f in os.listdir(frames_dir) if f.endswith('.png')])
        total_frames = len(frame_files)
        logger.info(f"Number of extracted frames: {total_frames}")

        if total_frames == 0:
            logger.error("No frames were extracted from the video")
            processing_status[video_id] = {'status': 'error', 'message': 'No frames were extracted from the video'}
            return

        # Initialize the model once, outside the batch processing loop
        if method == 'inspyrenet':
            print("start init")
            model_context = inspyrenet_video_model_context()
            print("start enter")
            model = model_context.__enter__()
            print("finish enter")
        elif method in ['u2net', 'tracer', 'basnet', 'deeplab']:
            model_context = carvekit_video_model_context(method)
            model = model_context.__enter__()
        else:
            model = None  # For other methods that don't require a specific model

        try:
            async def process_frame_batch(start_idx, end_idx):
                for i in range(start_idx, min(end_idx, total_frames)):
                    frame_file = frame_files[i]
                    frame_path = os.path.join(frames_dir, frame_file)
                    img = Image.open(frame_path).convert('RGB')

                    if method == 'inspyrenet':
                        processed_frame = model.process(img, type='rgba')
                    elif method in ['u2net', 'tracer', 'basnet', 'deeplab']:
                        processed_frame = model([img])[0]
                    else:
                        processed_frame = await process_frame(frame_path, method)

                    processed_frame.save(frame_path, format='PNG')
                    progress = (i + 1) / total_frames * 100
                    processing_status[video_id] = {'status': 'processing', 'progress': progress}

            batch_size = 3
            for i in range(0, total_frames, batch_size):
                await process_frame_batch(i, i + batch_size)
                await asyncio.sleep(0)  # Allow other tasks to run

        finally:
            # Ensure we clean up the model context
            if method in ['inspyrenet', 'u2net', 'tracer', 'basnet', 'deeplab']:
                model_context.__exit__(None, None, None)

        # Create output video
        processing_status[video_id] = {'status': 'processing', 'progress': 100, 'message': 'Encoding video'}
        output_path = os.path.join(TEMP_VIDEOS_DIR, f"output_{video_id}.webm")
        create_video_command = [
            'ffmpeg',
            '-framerate', '24',
            '-i', f'{frames_dir}/frame_%05d.png',
            '-c:v', 'libvpx-vp9',
            '-pix_fmt', 'yuva420p',
            '-lossless', '1',
            output_path
        ]
        logger.info(f"Executing video creation command: {' '.join(create_video_command)}")
        process = await asyncio.create_subprocess_exec(
            *create_video_command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            logger.error(f"Error creating output video: {stderr.decode()}")
            processing_status[video_id] = {'status': 'error', 'message': 'Error creating output video'}
            return

        logger.info(f"Video processing completed. Output path: {output_path}")
        processing_status[video_id] = {'status': 'completed', 'output_path': output_path}

    except Exception as e:
        logger.exception("Error in video processing")
        processing_status[video_id] = {'status': 'error', 'message': str(e)}
    finally:
        torch.cuda.empty_cache()

        # Clean up frames directory
        for file in os.listdir(frames_dir):
            os.remove(os.path.join(frames_dir, file))
        os.rmdir(frames_dir)
        logger.info(f"Cleaned up frames directory: {frames_dir}")

@app.post("/remove_background_video/")
async def remove_background_video(background_tasks: BackgroundTasks, file: UploadFile = File(...), method: str = Form(...)):
    try:
        logger.info(f"Starting video background removal with method: {method}")
        
        # Generate a unique filename for the uploaded video
        video_id = str(uuid.uuid4())
        filename = f"input_{video_id}.mp4"
        file_path = os.path.join(TEMP_VIDEOS_DIR, filename)
        
        # Save uploaded video to the temp_videos folder
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        logger.info(f"Video file saved: {file_path}")
        logger.info(f"File exists: {os.path.exists(file_path)}")
        logger.info(f"File size: {os.path.getsize(file_path)} bytes")

        if not os.path.exists(file_path):
            raise HTTPException(status_code=500, detail=f"Failed to create video file: {file_path}")

        # Start processing in the background
        background_tasks.add_task(process_video, file_path, method, video_id)
        
        return {"video_id": video_id}

    except Exception as e:
        logger.exception(f"Error in video processing: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error in video processing: {str(e)}")

@app.get("/status/{video_id}")
async def get_status(video_id: str):
    if video_id not in processing_status:
        raise HTTPException(status_code=404, detail="Video ID not found")
    
    status = processing_status[video_id]
    
    if status['status'] == 'completed':
        output_path = status['output_path']
        if not os.path.exists(output_path):
            raise HTTPException(status_code=404, detail="Processed video file not found")
        
        return FileResponse(output_path, media_type="video/webm", filename=f"processed_video_{video_id}.webm")
    
    return status

@app.get("/health")
async def health_check():
    """Health check endpoint for Railway and monitoring"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "rate_limiting": True,
        "cost_monitoring": bool(RAILWAY_API_TOKEN and RAILWAY_PROJECT_ID)
    }

@app.get("/admin/stats")
async def get_rate_limit_stats(request: Request):
    """Admin endpoint to view rate limiting statistics"""
    # Simple admin check (you should implement proper authentication)
    admin_key = request.headers.get("X-Admin-Key")
    if admin_key != os.environ.get("ADMIN_KEY", "pixgone-admin-2024"):
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    with storage_lock:
        today = datetime.now().strftime("%Y-%m-%d")
        today_stats = {k: v for k, v in daily_requests.items() if k.endswith(f":{today}")}
        
        return {
            "today_requests": len(today_stats),
            "total_requests_today": sum(today_stats.values()),
            "blocked_ips_count": len(blocked_ips),
            "blocked_ips": list(blocked_ips),
            "top_ips_today": sorted(today_stats.items(), key=lambda x: x[1], reverse=True)[:10],
            "limits": {
                "daily_limit": DAILY_LIMIT,
                "rate_limit": RATE_LIMIT,
                "abuse_threshold": ABUSE_THRESHOLD
            }
        }

@app.post("/admin/unblock/{ip}")
async def unblock_ip(ip: str, request: Request):
    """Admin endpoint to unblock an IP address"""
    admin_key = request.headers.get("X-Admin-Key")
    if admin_key != os.environ.get("ADMIN_KEY", "pixgone-admin-2024"):
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    with storage_lock:
        if ip in blocked_ips:
            blocked_ips.remove(ip)
            return {"message": f"IP {ip} has been unblocked"}
        else:
            return {"message": f"IP {ip} was not blocked"}

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(cleanup_old_videos())
    
    # Clean up old request tracking data daily
    async def daily_cleanup():
        while True:
            await asyncio.sleep(24 * 60 * 60)  # Run every 24 hours
            cleanup_old_requests()
    
    asyncio.create_task(daily_cleanup())
    print(f"✅ Rate limiting configured: {DAILY_LIMIT} requests/day, {RATE_LIMIT}")
    print(f"✅ Railway cost monitoring enabled: {bool(RAILWAY_API_TOKEN and RAILWAY_PROJECT_ID)}")

async def fetch_railway_usage() -> Optional[dict]:
    """Fetch current Railway project usage via GraphQL API"""
    if not RAILWAY_API_TOKEN or not RAILWAY_PROJECT_ID:
        logger.warning("Railway API token or project ID not configured")
        return None
    
    # Query for current month usage
    now = datetime.utcnow()
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    query = """
    query GetUsage($projectId: String!, $startDate: DateTime!, $endDate: DateTime!) {
        usage(
            projectId: $projectId
            startDate: $startDate
            endDate: $endDate
            measurements: [CPU_USAGE, MEMORY_USAGE_GB, NETWORK_TX_GB]
        ) {
            measurement
            value
        }
    }
    """
    
    variables = {
        "projectId": RAILWAY_PROJECT_ID,
        "startDate": start_of_month.isoformat() + "Z",
        "endDate": now.isoformat() + "Z"
    }
    
    headers = {
        "Authorization": f"Bearer {RAILWAY_API_TOKEN}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(
            RAILWAY_API_URL,
            json={"query": query, "variables": variables},
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if "data" in data and "usage" in data["data"]:
                return data["data"]["usage"]
            else:
                logger.error(f"Unexpected Railway API response: {data}")
                return None
        else:
            logger.error(f"Railway API request failed: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"Error fetching Railway usage: {e}")
        return None

def calculate_costs(usage_data: list) -> dict:
    """Calculate costs from Railway usage data"""
    costs = {
        "cpu_cost": 0.0,
        "memory_cost": 0.0,
        "network_cost": 0.0,
        "total_cost": 0.0
    }
    
    for item in usage_data:
        measurement = item.get("measurement")
        value = float(item.get("value", 0))
        
        if measurement == "CPU_USAGE":
            # Convert vCPU-minutes to monthly cost estimate
            costs["cpu_cost"] = (value / (30 * 24 * 60)) * RAILWAY_PRICING["CPU_USAGE"]
        elif measurement == "MEMORY_USAGE_GB":
            # Convert GB-minutes to monthly cost estimate  
            costs["memory_cost"] = (value / (30 * 24 * 60)) * RAILWAY_PRICING["MEMORY_USAGE_GB"]
        elif measurement == "NETWORK_TX_GB":
            costs["network_cost"] = value * RAILWAY_PRICING["NETWORK_TX_GB"]
    
    costs["total_cost"] = costs["cpu_cost"] + costs["memory_cost"] + costs["network_cost"]
    return costs

@app.get("/rate-limit-info")
async def get_rate_limit_info(request: Request):
    """Public endpoint to get current rate limit status for the requesting IP, now also includes server costs."""
    client_ip = get_client_ip(request)
    today = datetime.now().strftime("%Y-%m-%d")
    key = f"{client_ip}:{today}"
    
    with storage_lock:
        current_requests = daily_requests.get(key, 0)
        is_blocked = client_ip in blocked_ips

    # Fetch costs (reuse logic from /railway-costs)
    usage_data = await fetch_railway_usage()
    if usage_data:
        costs = calculate_costs(usage_data)
    else:
        costs = {
            "cpu_cost": 0.0,
            "memory_cost": 0.0,
            "network_cost": 0.0,
            "total_cost": 0.0
        }

    return {
        "ip": client_ip,
        "requests_today": current_requests,
        "daily_limit": DAILY_LIMIT,
        "remaining_requests": max(0, DAILY_LIMIT - current_requests),
        "is_blocked": is_blocked,
        "rate_limit": RATE_LIMIT,
        "costs": costs
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9876)