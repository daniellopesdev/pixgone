from fastapi import FastAPI, UploadFile, File, Response, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from PIL import Image
import io
import time
import os
import sys
import json
from datetime import datetime, timedelta
from collections import defaultdict
import threading

print("=== Starting PixGone Server ===")
print(f"Python version: {sys.version}")
print(f"Current directory: {os.getcwd()}")

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add CORS middleware with more permissive settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("✅ CORS middleware configured")

# Rate limiting configuration
DAILY_LIMIT = int(os.environ.get("DAILY_LIMIT", "50"))  # Requests per day per IP
RATE_LIMIT = "10/minute"  # Requests per minute per IP
ABUSE_THRESHOLD = int(os.environ.get("ABUSE_THRESHOLD", "100"))  # Max requests per day before blocking

# In-memory storage for daily request tracking (use Redis in production)
daily_requests = defaultdict(int)
blocked_ips = set()
storage_lock = threading.Lock()

def get_client_ip(request: Request) -> str:
    """Get client IP address, handling proxies"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host

def is_ip_blocked(ip: str) -> bool:
    """Check if IP is blocked due to abuse"""
    with storage_lock:
        return ip in blocked_ips

def track_daily_request(ip: str) -> bool:
    """Track daily request and return True if limit exceeded"""
    with storage_lock:
        today = datetime.now().strftime("%Y-%m-%d")
        key = f"{ip}:{today}"
        daily_requests[key] += 1
        
        # Check if IP should be blocked for abuse
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

def cleanup_old_records():
    """Clean up old daily records (older than 7 days)"""
    with storage_lock:
        today = datetime.now()
        keys_to_remove = []
        for key in daily_requests.keys():
            try:
                ip, date_str = key.split(":", 1)
                record_date = datetime.strptime(date_str, "%Y-%m-%d")
                if (today - record_date).days > 7:
                    keys_to_remove.append(key)
            except:
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            del daily_requests[key]

# Cleanup old records every hour
def cleanup_scheduler():
    while True:
        time.sleep(3600)  # 1 hour
        cleanup_old_records()

cleanup_thread = threading.Thread(target=cleanup_scheduler, daemon=True)
cleanup_thread.start()

print(f"✅ Rate limiting configured: {DAILY_LIMIT} requests/day, {RATE_LIMIT}")

def try_import_ormbg():
    """Try to import ormbg, return None if failed"""
    try:
        from rembg import remove, new_session
        print("✅ ormbg imported successfully")
        
        # Create a session with better model configuration
        session = new_session("u2net")
        print("✅ ormbg session created with u2net model")
        
        return lambda img: remove(img, session=session)
    except ImportError as e:
        print(f"❌ ormbg import failed: {e}")
        return None
    except Exception as e:
        print(f"❌ ormbg error: {e}")
        return None

def try_import_custom_ormbg():
    """Try to import custom ORMBG implementation"""
    try:
        from ormbg import ORMBGProcessor
        print("✅ Custom ORMBG imported successfully")
        # Default path is now inside the app's working directory
        model_path = os.environ.get("ORMBG_MODEL_PATH", "/app/models/ormbg/ormbg.pth")
        print(f"🔍 Looking for model at: {model_path}")
        
        # Check if file exists
        if os.path.exists(model_path):
            print(f"✅ Model file found at: {model_path}")
            file_size = os.path.getsize(model_path)
            print(f"📁 Model file size: {file_size / (1024*1024):.1f} MB")
        else:
            print(f"❌ Model file NOT found at: {model_path}")
            # List contents of the directory
            model_dir = os.path.dirname(model_path)
            if os.path.exists(model_dir):
                print(f"📂 Contents of {model_dir}:")
                try:
                    for item in os.listdir(model_dir):
                        item_path = os.path.join(model_dir, item)
                        if os.path.isfile(item_path):
                            size = os.path.getsize(item_path)
                            print(f"  📄 {item} ({size / (1024*1024):.1f} MB)")
                        else:
                            print(f"  📁 {item}/")
                except Exception as e:
                    print(f"  ❌ Error listing directory: {e}")
            else:
                print(f"❌ Directory does not exist: {model_dir}")
        
        processor = ORMBGProcessor(model_path)
        return processor.process_image
    except ImportError as e:
        print(f"❌ Custom ORMBG import failed: {e}")
        return None
    except Exception as e:
        print(f"❌ Custom ORMBG error: {e}")
        return None

def simple_background_removal(image):
    """Simple background removal - removes white/bright backgrounds"""
    try:
        # Convert to RGBA
        rgba = image.convert('RGBA')
        data = rgba.load()
        
        # Get image dimensions
        width, height = rgba.size
        
        # Simple threshold-based background removal
        for y in range(height):
            for x in range(width):
                r, g, b, a = data[x, y]
                
                # If pixel is bright (likely background), make it transparent
                brightness = (r + g + b) / 3
                if brightness > 200:  # Adjust threshold as needed
                    data[x, y] = (r, g, b, 0)  # Make transparent
                else:
                    data[x, y] = (r, g, b, 255)  # Keep opaque
        
        return rgba
        
    except Exception as e:
        print(f"Background removal failed: {e}")
        # Return original image with alpha channel
        return image.convert('RGBA')

@app.post("/remove_background/")
@limiter.limit(RATE_LIMIT)
async def remove_background(request: Request, file: UploadFile = File(...)):
    print("🔄 Processing background removal request")
    
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
        
        # Try custom ORMBG first (original implementation)
        custom_remove_func = try_import_custom_ormbg()
        if custom_remove_func:
            try:
                print("Using custom ORMBG for background removal")
                no_bg_image = custom_remove_func(image)
                process_time = time.time() - start_time
                print(f"Custom ORMBG completed in {process_time:.2f} seconds")
            except Exception as e:
                print(f"Custom ORMBG failed: {e}, trying standard ormbg")
                # Fall back to standard ormbg
                remove_func = try_import_ormbg()
                if remove_func:
                    try:
                        no_bg_image = remove_func(image)
                        process_time = time.time() - start_time
                        print(f"Standard ormbg completed in {process_time:.2f} seconds")
                    except Exception as e2:
                        print(f"Standard ormbg failed: {e2}, using simple method")
                        no_bg_image = simple_background_removal(image)
                        process_time = time.time() - start_time
                        print(f"Simple method completed in {process_time:.2f} seconds")
                else:
                    no_bg_image = simple_background_removal(image)
                    process_time = time.time() - start_time
                    print(f"Simple method completed in {process_time:.2f} seconds")
        else:
            # Try standard ormbg
            remove_func = try_import_ormbg()
            if remove_func:
                try:
                    print("Using standard ormbg for background removal")
                    no_bg_image = remove_func(image)
                    process_time = time.time() - start_time
                    print(f"Standard ormbg completed in {process_time:.2f} seconds")
                except Exception as e:
                    print(f"Standard ormbg failed: {e}, using simple method")
                    no_bg_image = simple_background_removal(image)
                    process_time = time.time() - start_time
                    print(f"Simple method completed in {process_time:.2f} seconds")
            else:
                # Use simple background removal
                print("Using simple background removal algorithm")
                no_bg_image = simple_background_removal(image)
                process_time = time.time() - start_time
                print(f"Background removal completed in {process_time:.2f} seconds")
        
        # Convert to PNG
        with io.BytesIO() as output:
            no_bg_image.save(output, format="PNG")
            content = output.getvalue()

        print(f"✅ Processing completed successfully for IP: {client_ip}")
        return Response(content=content, media_type="image/png")

    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error processing image for IP {client_ip}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@app.get("/")
async def root():
    print("Root endpoint called")
    return {"message": "PixGone API is running!"}

@app.get("/health")
async def health():
    print("Health endpoint called")
    return {"status": "healthy"}

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
    """Admin endpoint to unblock an IP"""
    admin_key = request.headers.get("X-Admin-Key")
    if admin_key != os.environ.get("ADMIN_KEY", "pixgone-admin-2024"):
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    with storage_lock:
        if ip in blocked_ips:
            blocked_ips.remove(ip)
            print(f"✅ IP {ip} unblocked by admin")
            return {"message": f"IP {ip} unblocked successfully"}
        else:
            return {"message": f"IP {ip} was not blocked"}

@app.get("/rate-limit-info")
async def get_rate_limit_info(request: Request):
    """Public endpoint to get current rate limit status for the requesting IP"""
    client_ip = get_client_ip(request)
    today = datetime.now().strftime("%Y-%m-%d")
    key = f"{client_ip}:{today}"
    
    with storage_lock:
        current_requests = daily_requests.get(key, 0)
        is_blocked = client_ip in blocked_ips
        
        return {
            "ip": client_ip,
            "requests_today": current_requests,
            "daily_limit": DAILY_LIMIT,
            "remaining_requests": max(0, DAILY_LIMIT - current_requests),
            "is_blocked": is_blocked,
            "rate_limit": RATE_LIMIT
        }

@app.get("/debug/model")
async def debug_model():
    """Debug endpoint to check model file availability"""
    model_path = os.environ.get("ORMBG_MODEL_PATH", os.path.expanduser("~/.ormbg/ormbg.pth"))
    
    debug_info = {
        "model_path": model_path,
        "file_exists": os.path.exists(model_path),
        "current_working_dir": os.getcwd(),
        "environment_vars": {
            "ORMBG_MODEL_PATH": os.environ.get("ORMBG_MODEL_PATH", "Not set"),
            "HOME": os.environ.get("HOME", "Not set"),
            "USERPROFILE": os.environ.get("USERPROFILE", "Not set")
        }
    }
    
    if os.path.exists(model_path):
        debug_info["file_size_mb"] = os.path.getsize(model_path) / (1024*1024)
        debug_info["file_accessible"] = os.access(model_path, os.R_OK)
    
    # Check directory contents
    model_dir = os.path.dirname(model_path)
    if os.path.exists(model_dir):
        try:
            debug_info["directory_contents"] = os.listdir(model_dir)
        except Exception as e:
            debug_info["directory_error"] = str(e)
    else:
        debug_info["directory_exists"] = False
    
    return debug_info

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    print(f"Environment PORT: {os.environ.get('PORT', 'Not set')}")
    print(f"Using port: {port}")
    print(f"Starting server on 0.0.0.0:{port}")
    
    try:
        uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1) 