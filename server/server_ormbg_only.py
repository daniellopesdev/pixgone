from fastapi import FastAPI, UploadFile, File, Response, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
import time
import os
import logging
import sys
import numpy as np

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PixGone", version="1.0.0")

# Add CORS middleware - Updated for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:9877", 
        "https://pixgone.vercel.app",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for lazy loading
ormbg_processor = None
model_loaded = False
model_error = None
use_fallback = False

def simple_background_removal(image):
    """Simple background removal using color-based segmentation"""
    try:
        import cv2
        from skimage import segmentation, morphology, filters
        
        # Convert PIL to numpy array
        img_array = np.array(image)
        
        # Convert to different color spaces for better segmentation
        hsv = cv2.cvtColor(img_array, cv2.COLOR_RGB2HSV)
        lab = cv2.cvtColor(img_array, cv2.COLOR_RGB2LAB)
        
        # Use multiple segmentation approaches
        # 1. SLIC superpixels
        segments = segmentation.slic(img_array, n_segments=150, compactness=10, sigma=1)
        
        # 2. Find the most likely background segments (edges and corners)
        h, w = segments.shape
        edge_segments = set()
        
        # Sample edge pixels
        edge_pixels = [(0, j) for j in range(w)] + [(h-1, j) for j in range(w)] + \
                     [(i, 0) for i in range(h)] + [(i, w-1) for i in range(h)]
        
        for i, j in edge_pixels:
            edge_segments.add(segments[i, j])
        
        # Create mask - assume edge segments are background
        mask = np.ones((h, w), dtype=bool)
        for seg_id in edge_segments:
            mask[segments == seg_id] = False
        
        # Clean up the mask
        mask = morphology.remove_small_objects(mask, min_size=100)
        mask = morphology.remove_small_holes(mask, area_threshold=100)
        
        # Apply Gaussian blur to soften edges
        mask_float = mask.astype(np.float32)
        mask_smooth = filters.gaussian(mask_float, sigma=1.0)
        
        # Create RGBA image
        rgba_array = np.dstack([img_array, (mask_smooth * 255).astype(np.uint8)])
        
        return Image.fromarray(rgba_array, 'RGBA')
        
    except Exception as e:
        logger.error(f"Advanced background removal failed: {e}")
        return remove_white_background(image)

def remove_white_background(image):
    """Simple white/bright background removal"""
    try:
        # Convert to RGBA
        rgba = image.convert('RGBA')
        data = np.array(rgba)
        
        # Create mask for bright pixels (likely background)
        brightness = np.mean(data[:,:,:3], axis=2)
        mask = brightness < 220  # Keep darker pixels
        
        # Apply some morphological operations to clean up
        from skimage import morphology
        mask = morphology.remove_small_objects(mask, min_size=50)
        mask = morphology.binary_closing(mask, morphology.disk(2))
        
        # Apply mask
        data[:,:,3] = mask.astype(np.uint8) * 255
        
        return Image.fromarray(data, 'RGBA')
    except Exception as e:
        logger.error(f"Simple background removal failed: {e}")
        # Last resort - just return original with alpha channel
        return image.convert('RGBA')

def download_model_file(url, filepath):
    """Download model file with progress logging"""
    try:
        import requests
        logger.info(f"Downloading model from {url}")
        response = requests.get(url, stream=True, timeout=300)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0
        
        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        progress = (downloaded / total_size) * 100
                        if downloaded % (1024 * 1024 * 10) == 0:  # Log every 10MB
                            logger.info(f"Download progress: {progress:.1f}%")
        
        logger.info("Model download completed successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to download model: {e}")
        return False

def load_ormbg_model():
    global ormbg_processor, model_loaded, model_error, use_fallback
    if not model_loaded and model_error is None:
        try:
            logger.info("Starting ORMBG model loading process...")
            
            # Try importing required packages
            try:
                import torch
                logger.info(f"PyTorch version: {torch.__version__}")
            except ImportError as e:
                logger.warning(f"PyTorch not available: {e}")
                raise ImportError(f"PyTorch not available: {e}")
            
            try:
                from ormbg import ORMBGProcessor
                logger.info("ORMBG package imported successfully")
            except ImportError as e:
                logger.warning(f"ORMBG package not available: {e}")
                logger.info("Falling back to simple background removal")
                use_fallback = True
                model_loaded = True
                return
            
            # Set model path
            model_dir = os.path.expanduser("~/.ormbg")
            ormbg_model_path = os.path.join(model_dir, "ormbg.pth")
            
            # Create directory if it doesn't exist
            os.makedirs(model_dir, exist_ok=True)
            logger.info(f"Model directory: {model_dir}")
            
            # Download model if not exists
            if not os.path.exists(ormbg_model_path):
                logger.info("Model file not found, downloading...")
                model_url = "https://huggingface.co/schirrmacher/ormbg/resolve/main/models/ormbg.pth"
                
                if not download_model_file(model_url, ormbg_model_path):
                    logger.warning("Failed to download ORMBG model, using fallback")
                    use_fallback = True
                    model_loaded = True
                    return
            else:
                logger.info("Model file already exists")
            
            # Verify model file
            if not os.path.exists(ormbg_model_path):
                logger.warning("Model file verification failed, using fallback")
                use_fallback = True
                model_loaded = True
                return
            
            file_size = os.path.getsize(ormbg_model_path)
            logger.info(f"Model file size: {file_size / (1024*1024):.1f} MB")
            
            # Load the model
            logger.info("Initializing ORMBG processor...")
            ormbg_processor = ORMBGProcessor(ormbg_model_path)
            
            # Use CPU for Railway (GPU is expensive and not available)
            logger.info("Moving model to CPU...")
            ormbg_processor.to("cpu")
            
            model_loaded = True
            logger.info("ORMBG model loaded successfully on CPU")
            
        except Exception as e:
            model_error = str(e)
            logger.error(f"Failed to load ORMBG model: {e}")
            logger.info("Falling back to simple background removal")
            use_fallback = True
            model_loaded = True
            model_error = None  # Clear error since we have fallback

def process_with_ormbg(image):
    if not model_loaded:
        load_ormbg_model()
    
    if use_fallback:
        logger.info("Using fallback background removal")
        return simple_background_removal(image)
    
    if model_error:
        logger.info("Model error detected, using fallback")
        return simple_background_removal(image)
    
    if not model_loaded or ormbg_processor is None:
        logger.info("Model not loaded, using fallback")
        return simple_background_removal(image)
    
    try:
        logger.info("Using ORMBG model for background removal")
        return ormbg_processor.process_image(image)
    except Exception as e:
        logger.error(f"Error processing image with ORMBG: {e}")
        logger.info("ORMBG failed, falling back to simple method")
        return simple_background_removal(image)

@app.post("/remove_background/")
async def remove_background(file: UploadFile = File(...), method: str = Form(default="ormbg")):
    try:
        # Validate file
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        image_data = await file.read()
        if len(image_data) == 0:
            raise HTTPException(status_code=400, detail="Empty file")
        
        image = Image.open(io.BytesIO(image_data)).convert('RGB')
        logger.info(f"Processing image: {image.size}")
        
        start_time = time.time()
        
        # Use simple background removal
        logger.info("Using simple background removal algorithm")
        no_bg_image = simple_background_removal(image)
        
        process_time = time.time() - start_time
        logger.info(f"Background removal completed in {process_time:.2f} seconds")
        
        # Convert to PNG
        with io.BytesIO() as output:
            no_bg_image.save(output, format="PNG")
            content = output.getvalue()

        return Response(content=content, media_type="image/png")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error processing image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@app.get("/")
async def root():
    return {
        "message": "PixGone - AI Background Removal API", 
        "description": "Simple and reliable background removal service",
        "available_methods": ["ormbg"],
        "status": "healthy",
        "version": "1.0.0"
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "method": "simple_segmentation",
        "version": "1.0.0"
    }

# Preload model on startup
@app.on_event("startup")
async def startup_event():
    logger.info("Starting up PixGone API...")
    logger.info("Model will be loaded on first request to optimize startup time")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    logger.info(f"Starting PixGone Server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port) 