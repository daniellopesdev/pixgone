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
import urllib.request
import shutil
import requests
import logging
from typing import Optional
import sqlite3
import hashlib
import hmac

print("=== Starting PixGone Server ===")
print(f"Python version: {sys.version}")
print(f"Current directory: {os.getcwd()}")

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Railway GraphQL API configuration
RAILWAY_API_URL = "https://backboard.railway.app/graphql/v2"
RAILWAY_API_TOKEN = os.getenv("RAILWAY_API_TOKEN")
RAILWAY_PROJECT_ID = os.getenv("RAILWAY_PROJECT_ID")

# Ko-fi webhook configuration
KOFI_WEBHOOK_SECRET = os.getenv("KOFI_WEBHOOK_SECRET")
KOFI_VERIFICATION_TOKEN = os.getenv("KOFI_VERIFICATION_TOKEN")

# App cost threshold configuration
BASE_THRESHOLD = float(os.getenv("BASE_THRESHOLD", "5.0"))  # $5 base threshold
DONATION_DB_PATH = "donations.db"

# Railway pricing (per Railway docs)
RAILWAY_PRICING = {
    "CPU_USAGE": 20.0,  # $20 per vCPU per month
    "MEMORY_USAGE_GB": 10.0,  # $10 per GB per month  
    "NETWORK_TX_GB": 0.05,  # $0.05 per GB
}

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add CORS middleware with more permissive settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://www.pixgone.com",
        "https://pixgone.com", 
        "https://*.pixgone.com",
        "http://localhost:3000",  # For local development
        "http://localhost:3001",  # Alternative local port
        "*"  # Fallback for any other origins
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

print("✅ CORS middleware configured")

# Rate limiting configuration
try:
    DAILY_LIMIT = int(os.environ.get("DAILY_LIMIT", "50"))  # Requests per day per IP
except ValueError:
    print(f"⚠️ Invalid DAILY_LIMIT value: '{os.environ.get('DAILY_LIMIT')}', using default: 50")
    DAILY_LIMIT = 50

RATE_LIMIT = "10/minute"  # Requests per minute per IP

try:
    ABUSE_THRESHOLD = int(os.environ.get("ABUSE_THRESHOLD", "100"))  # Max requests per day before blocking
except ValueError:
    print(f"⚠️ Invalid ABUSE_THRESHOLD value: '{os.environ.get('ABUSE_THRESHOLD')}', using default: 100")
    ABUSE_THRESHOLD = 100

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

# Log environment variable status
print("\n📊 Environment Configuration Status:")
print(f"  - DAILY_LIMIT: {DAILY_LIMIT}")
print(f"  - ABUSE_THRESHOLD: {ABUSE_THRESHOLD}")
print(f"  - RAILWAY_API_TOKEN: {'✅ Set' if RAILWAY_API_TOKEN else '❌ Not set'}")
print(f"  - RAILWAY_PROJECT_ID: {'✅ Set' if RAILWAY_PROJECT_ID else '❌ Not set'}")
if RAILWAY_API_TOKEN == "*****":
    print("  ⚠️ RAILWAY_API_TOKEN appears to be a placeholder ('*****')")
if RAILWAY_PROJECT_ID == "*****":
    print("  ⚠️ RAILWAY_PROJECT_ID appears to be a placeholder ('*****')")
print("")

# Database initialization for donations
def init_donation_db():
    """Initialize SQLite database for donation tracking"""
    try:
        conn = sqlite3.connect(DONATION_DB_PATH)
        cursor = conn.cursor()
        
        # Create donations table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS donations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                kofi_id TEXT UNIQUE,
                donor_name TEXT,
                amount REAL,
                message TEXT,
                currency TEXT DEFAULT 'USD',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                month_year TEXT
            )
        ''')
        
        # Create index for efficient queries
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_month_year 
            ON donations(month_year)
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_kofi_id 
            ON donations(kofi_id)
        ''')
        
        conn.commit()
        conn.close()
        print("✅ Donation database initialized")
        
    except Exception as e:
        print(f"❌ Error initializing donation database: {e}")

# Initialize database on startup
init_donation_db()

def get_current_month_donations() -> float:
    """Get total donations for current month"""
    try:
        conn = sqlite3.connect(DONATION_DB_PATH)
        cursor = conn.cursor()
        
        current_month = datetime.now().strftime("%Y-%m")
        cursor.execute('''
            SELECT COALESCE(SUM(amount), 0) 
            FROM donations 
            WHERE month_year = ?
        ''', (current_month,))
        
        total = cursor.fetchone()[0]
        conn.close()
        return float(total)
        
    except Exception as e:
        logger.error(f"Error getting current month donations: {e}")
        return 0.0

def get_top_contributors(limit: int = 10) -> list:
    """Get top contributors for current month"""
    try:
        conn = sqlite3.connect(DONATION_DB_PATH)
        cursor = conn.cursor()
        
        current_month = datetime.now().strftime("%Y-%m")
        cursor.execute('''
            SELECT donor_name, SUM(amount) as total_amount
            FROM donations 
            WHERE month_year = ? AND donor_name IS NOT NULL
            GROUP BY donor_name
            ORDER BY total_amount DESC
            LIMIT ?
        ''', (current_month, limit))
        
        contributors = [
            {"name": row[0], "amount": float(row[1])} 
            for row in cursor.fetchall()
        ]
        conn.close()
        return contributors
        
    except Exception as e:
        logger.error(f"Error getting top contributors: {e}")
        return []

def is_app_enabled() -> dict:
    """Check if app should be enabled based on costs vs donations"""
    try:
        current_cost = 0.0
        if RAILWAY_API_TOKEN and RAILWAY_PROJECT_ID:
            usage_data = fetch_railway_usage()
            if usage_data:
                costs = calculate_costs(usage_data)
                current_cost = costs.get("total_cost", 0.0)
        
        monthly_donations = get_current_month_donations()
        available_budget = monthly_donations - current_cost
        is_enabled = available_budget > 0
        
        return {
            "enabled": is_enabled,
            "current_cost": round(current_cost, 2),
            "monthly_donations": round(monthly_donations, 2),
            "available_budget": round(available_budget, 2),
            "base_threshold": BASE_THRESHOLD,
            "reason": None if is_enabled else "Monthly budget exceeded"
        }
        
    except Exception as e:
        logger.error(f"Error checking app status: {e}")
        return {
            "enabled": True,  # Default to enabled if error
            "current_cost": 0.0,
            "monthly_donations": 0.0,
            "available_budget": 0.0,
            "base_threshold": BASE_THRESHOLD,
            "reason": "Error checking status"
        }

def verify_kofi_webhook(payload: str, signature: str) -> bool:
    """Verify Ko-fi webhook signature"""
    if not KOFI_WEBHOOK_SECRET:
        logger.warning("KOFI_WEBHOOK_SECRET not configured, skipping verification")
        return True
    
    try:
        expected_signature = hmac.new(
            KOFI_WEBHOOK_SECRET.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected_signature)
    except Exception as e:
        logger.error(f"Error verifying webhook signature: {e}")
        return False

async def fetch_railway_usage() -> Optional[dict]:
    """Fetch current Railway project usage via GraphQL API"""
    if not RAILWAY_API_TOKEN or not RAILWAY_PROJECT_ID:
        logger.warning("Railway API token or project ID not configured")
        logger.info(f"RAILWAY_API_TOKEN exists: {bool(RAILWAY_API_TOKEN)}")
        logger.info(f"RAILWAY_PROJECT_ID exists: {bool(RAILWAY_PROJECT_ID)}")
        return None
    
    # Query for current month usage
    now = datetime.utcnow()
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    logger.info(f"Fetching Railway usage from {start_of_month} to {now}")
    
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
    
    logger.info(f"Railway API request variables: {variables}")
    
    try:
        response = requests.post(
            RAILWAY_API_URL,
            json={"query": query, "variables": variables},
            headers=headers,
            timeout=10
        )
        
        logger.info(f"Railway API response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            logger.info(f"Railway API response data: {data}")
            
            if "data" in data and "usage" in data["data"]:
                usage_data = data["data"]["usage"]
                logger.info(f"Railway usage data: {usage_data}")
                return usage_data
            else:
                logger.error(f"Unexpected Railway API response structure: {data}")
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
    
    logger.info(f"Calculating costs from usage data: {usage_data}")
    
    if not usage_data:
        logger.warning("No usage data provided for cost calculation")
        return costs
    
    for item in usage_data:
        measurement = item.get("measurement")
        value = float(item.get("value", 0))
        
        logger.info(f"Processing measurement: {measurement}, value: {value}")
        
        if measurement == "CPU_USAGE":
            # Convert vCPU-minutes to monthly cost estimate
            costs["cpu_cost"] = (value / (30 * 24 * 60)) * RAILWAY_PRICING["CPU_USAGE"]
            logger.info(f"CPU cost calculated: ${costs['cpu_cost']:.4f}")
        elif measurement == "MEMORY_USAGE_GB":
            # Convert GB-minutes to monthly cost estimate  
            costs["memory_cost"] = (value / (30 * 24 * 60)) * RAILWAY_PRICING["MEMORY_USAGE_GB"]
            logger.info(f"Memory cost calculated: ${costs['memory_cost']:.4f}")
        elif measurement == "NETWORK_TX_GB":
            costs["network_cost"] = value * RAILWAY_PRICING["NETWORK_TX_GB"]
            logger.info(f"Network cost calculated: ${costs['network_cost']:.4f}")
        else:
            logger.warning(f"Unknown measurement type: {measurement}")
    
    costs["total_cost"] = costs["cpu_cost"] + costs["memory_cost"] + costs["network_cost"]
    logger.info(f"Final calculated costs: {costs}")
    return costs

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

def download_model_if_needed(model_path):
    """Checks if the model file exists and downloads it if it doesn't."""
    model_dir = os.path.dirname(model_path)
    if not os.path.exists(model_path):
        print(f"--- Model not found at {model_path}. Starting download. ---")
        try:
            print(f"--- Creating directory: {model_dir} ---")
            os.makedirs(model_dir, exist_ok=True)
            
            # Try different possible URLs for the model file
            urls_to_try = [
                "https://huggingface.co/schirrmacher/ormbg/resolve/main/models/ormbg.pth",
                "https://huggingface.co/schirrmacher/ormbg/raw/main/models/ormbg.pth",
                "https://huggingface.co/schirrmacher/ormbg/resolve/main/ormbg.pth"
            ]
            
            success = False
            for url in urls_to_try:
                try:
                    print(f"--- Trying URL: {url} ---")
                    
                    # Create a request with headers to mimic a browser
                    req = urllib.request.Request(
                        url,
                        headers={
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    )
                    
                    # Download with timeout
                    with urllib.request.urlopen(req, timeout=300) as response, open(model_path, 'wb') as out_file:
                        shutil.copyfileobj(response, out_file)
                    
                    if os.path.exists(model_path):
                        print("--- ✅ Model download successful. ---")
                        file_size = os.path.getsize(model_path) / (1024*1024)
                        print(f"--- 📁 Model file size: {file_size:.1f} MB ---")
                        success = True
                        break
                    else:
                        print(f"--- ❌ Download completed but file not found at {model_path} ---")
                        
                except Exception as e:
                    print(f"--- ❌ Failed with URL {url}: {e} ---")
                    continue
            
            # If direct downloads failed, try huggingface_hub
            if not success:
                print("--- 🔄 Trying Hugging Face Hub download... ---")
                try:
                    from huggingface_hub import hf_hub_download
                    print("--- 📥 Downloading via Hugging Face Hub ---")
                    downloaded_path = hf_hub_download(
                        repo_id="schirrmacher/ormbg",
                        filename="models/ormbg.pth",
                        cache_dir=model_dir
                    )
                    # Move to the expected location
                    shutil.move(downloaded_path, model_path)
                    print("--- ✅ Hugging Face Hub download successful. ---")
                    file_size = os.path.getsize(model_path) / (1024*1024)
                    print(f"--- 📁 Model file size: {file_size:.1f} MB ---")
                    success = True
                except Exception as e:
                    print(f"--- ❌ Hugging Face Hub download failed: {e} ---")
            
            if not success:
                print("--- ❌ All download attempts failed. ---")
                return False
                
            return True
            
        except Exception as e:
            print(f"--- ❌ An exception occurred during download: {e} ---")
            return False
    else:
        print("--- ✅ Model file already exists. Skipping download. ---")
        return True

def try_import_custom_ormbg():
    """Try to import custom ORMBG implementation"""
    try:
        from ormbg import ORMBGProcessor
        print("✅ Custom ORMBG imported successfully")
        # Default path is now inside the /opt directory
        model_path = os.environ.get("ORMBG_MODEL_PATH", "/opt/models/ormbg/ormbg.pth")
        print(f"🔍 Looking for model at: {model_path}")

        # Download the model at runtime if it doesn't exist
        if not download_model_if_needed(model_path):
            print("❌ Aborting custom ORMBG setup due to download failure.")
            return None
        
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

@app.options("/{full_path:path}")
async def options_handler(request: Request):
    """Handle CORS preflight requests"""
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true",
        }
    )

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
    
    # Check if app is enabled based on costs vs donations
    app_status = is_app_enabled()
    if not app_status["enabled"]:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "Service temporarily unavailable",
                "message": "Service is currently disabled due to cost limits. Please donate to help keep it running!",
                "code": "SERVICE_DISABLED",
                "app_status": app_status
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
    """Public endpoint to get current rate limit status for the requesting IP, now also includes server costs and app status."""
    client_ip = get_client_ip(request)
    today = datetime.now().strftime("%Y-%m-%d")
    key = f"{client_ip}:{today}"
    
    with storage_lock:
        current_requests = daily_requests.get(key, 0)
        is_blocked = client_ip in blocked_ips

    # Fetch costs (Railway API integration)
    logger.info("Fetching Railway usage for rate-limit-info endpoint")
    usage_data = await fetch_railway_usage()
    
    if usage_data:
        logger.info(f"Usage data received, calculating costs")
        costs = calculate_costs(usage_data)
    else:
        logger.warning("No usage data available, returning zero costs")
        costs = {
            "cpu_cost": 0.0,
            "memory_cost": 0.0,
            "network_cost": 0.0,
            "total_cost": 0.0
        }
    
    # Get app status
    app_status = is_app_enabled()
        
    response_data = {
        "ip": client_ip,
        "requests_today": current_requests,
        "daily_limit": DAILY_LIMIT,
        "remaining_requests": max(0, DAILY_LIMIT - current_requests),
        "is_blocked": is_blocked,
        "rate_limit": RATE_LIMIT,
        "costs": costs,
        "app_status": app_status
    }
    
    # Add debug info if in development or if costs are zero
    if costs["total_cost"] == 0.0:
        response_data["debug"] = {
            "railway_api_configured": bool(RAILWAY_API_TOKEN and RAILWAY_PROJECT_ID),
            "usage_data_received": bool(usage_data),
            "timestamp": datetime.utcnow().isoformat()
        }
    
    logger.info(f"Returning rate limit info: {response_data}")
    return response_data

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

@app.get("/debug/railway-costs")
async def debug_railway_costs():
    """Debug endpoint to test Railway API integration and cost calculation"""
    debug_info = {
        "railway_config": {
            "api_url": RAILWAY_API_URL,
            "has_api_token": bool(RAILWAY_API_TOKEN),
            "has_project_id": bool(RAILWAY_PROJECT_ID),
            "token_length": len(RAILWAY_API_TOKEN) if RAILWAY_API_TOKEN else 0,
            "project_id": RAILWAY_PROJECT_ID if RAILWAY_PROJECT_ID else "Not set"
        },
        "pricing": RAILWAY_PRICING
    }
    
    # Try to fetch usage data
    try:
        usage_data = await fetch_railway_usage()
        debug_info["usage_data"] = usage_data
        
        if usage_data:
            costs = calculate_costs(usage_data)
            debug_info["calculated_costs"] = costs
        else:
            debug_info["calculated_costs"] = "No usage data available"
            
    except Exception as e:
        debug_info["error"] = str(e)
        debug_info["calculated_costs"] = "Error fetching data"
    
    return debug_info

@app.get("/debug/env-check")
async def debug_env_check():
    """Debug endpoint to check environment variables"""
    return {
        "kofi_webhook_secret_set": bool(KOFI_WEBHOOK_SECRET),
        "kofi_verification_token_set": bool(KOFI_VERIFICATION_TOKEN),
        "base_threshold": BASE_THRESHOLD,
        "donation_db_path": DONATION_DB_PATH,
        "railway_api_token_set": bool(RAILWAY_API_TOKEN),
        "railway_project_id_set": bool(RAILWAY_PROJECT_ID)
    }

# Donation and App Status Endpoints
@app.post("/webhook/kofi")
async def kofi_webhook(request: Request):
    """Handle Ko-fi donation webhooks"""
    try:
        # Get the raw body for signature verification
        body = await request.body()
        payload = body.decode('utf-8')
        
        # Verify webhook signature
        signature = request.headers.get("X-Ko-Fi-Signature", "")
        if not verify_kofi_webhook(payload, signature):
            logger.warning("Invalid webhook signature")
            raise HTTPException(status_code=401, detail="Invalid signature")
        
        # Parse the webhook data
        data = json.loads(payload)
        logger.info(f"Received Ko-fi webhook: {data}")
        
        # Extract donation information
        donation_data = data.get("data", {})
        kofi_id = donation_data.get("id")
        donor_name = donation_data.get("from_name", "Anonymous")
        amount = float(donation_data.get("amount", 0))
        message = donation_data.get("message", "")
        currency = donation_data.get("currency", "USD")
        
        if not kofi_id or amount <= 0:
            raise HTTPException(status_code=400, detail="Invalid donation data")
        
        # Store donation in database
        try:
            conn = sqlite3.connect(DONATION_DB_PATH)
            cursor = conn.cursor()
            
            current_month = datetime.now().strftime("%Y-%m")
            
            cursor.execute('''
                INSERT OR IGNORE INTO donations 
                (kofi_id, donor_name, amount, message, currency, month_year)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (kofi_id, donor_name, amount, message, currency, current_month))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Donation stored: {donor_name} - ${amount}")
            
        except Exception as e:
            logger.error(f"Error storing donation: {e}")
            raise HTTPException(status_code=500, detail="Error storing donation")
        
        return {"status": "success", "message": "Donation recorded"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing Ko-fi webhook: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/app-status")
async def get_app_status():
    """Get current app status (enabled/disabled based on costs vs donations)"""
    try:
        status = is_app_enabled()
        logger.info(f"App status: {status}")
        return status
        
    except Exception as e:
        logger.error(f"Error getting app status: {e}")
        raise HTTPException(status_code=500, detail="Error checking app status")

@app.get("/api/donations/stats")
async def get_donation_stats():
    """Get donation statistics"""
    try:
        current_month = datetime.now().strftime("%Y-%m")
        monthly_donations = get_current_month_donations()
        top_contributors = get_top_contributors(10)
        
        # Get donation count for current month
        conn = sqlite3.connect(DONATION_DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT COUNT(*) FROM donations WHERE month_year = ?
        ''', (current_month,))
        donation_count = cursor.fetchone()[0]
        conn.close()
        
        return {
            "current_month": current_month,
            "total_donations": round(monthly_donations, 2),
            "donation_count": donation_count,
            "top_contributors": top_contributors
        }
        
    except Exception as e:
        logger.error(f"Error getting donation stats: {e}")
        raise HTTPException(status_code=500, detail="Error fetching donation stats")

@app.get("/api/donations/top-contributors")
async def get_top_contributors_endpoint(limit: int = 10):
    """Get top contributors for current month"""
    try:
        contributors = get_top_contributors(limit)
        return {"contributors": contributors}
        
    except Exception as e:
        logger.error(f"Error getting top contributors: {e}")
        raise HTTPException(status_code=500, detail="Error fetching contributors")

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