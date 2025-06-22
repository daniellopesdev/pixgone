from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PixGone", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "PixGone - AI Background Removal API", 
        "description": "Simple and reliable background removal service",
        "status": "healthy",
        "version": "1.0.0"
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "method": "minimal_test",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    logger.info(f"Environment PORT: {os.environ.get('PORT', 'Not set')}")
    logger.info(f"Using port: {port}")
    logger.info(f"Starting PixGone Minimal Server on 0.0.0.0:{port}...")
    uvicorn.run(app, host="0.0.0.0", port=port) 