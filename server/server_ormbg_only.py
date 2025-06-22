from fastapi import FastAPI, UploadFile, File, Response, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
import time
import os
import logging

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
        "https://pixgone.vercel.app/",  # Replace with your actual Vercel URL
        "https://*.vercel.app",  # Allow all Vercel subdomains
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for lazy loading
ormbg_processor = None
model_loaded = False

def load_ormbg_model():
    global ormbg_processor, model_loaded
    if not model_loaded:
        try:
            import torch
            from ormbg import ORMBGProcessor
            
            # Railway will download the model during deployment
            ormbg_model_path = os.path.expanduser("~/.ormbg/ormbg.pth")
            
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(ormbg_model_path), exist_ok=True)
            
            # Download model if not exists
            if not os.path.exists(ormbg_model_path):
                logger.info("Downloading ORMBG model...")
                import requests
                model_url = "https://huggingface.co/schirrmacher/ormbg/resolve/main/models/ormbg.pth"
                response = requests.get(model_url)
                with open(ormbg_model_path, 'wb') as f:
                    f.write(response.content)
                logger.info("ORMBG model downloaded successfully")
            
            logger.info("Loading ORMBG model...")
            ormbg_processor = ORMBGProcessor(ormbg_model_path)
            
            # Use CPU for Railway (GPU is expensive)
            ormbg_processor.to("cpu")
            logger.info("ORMBG model loaded on CPU")
                
            model_loaded = True
            logger.info("ORMBG model loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load ORMBG model: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to load ORMBG model: {str(e)}")

def process_with_ormbg(image):
    load_ormbg_model()
    return ormbg_processor.process_image(image)

@app.post("/remove_background/")
async def remove_background(file: UploadFile = File(...), method: str = Form(default="ormbg")):
    try:
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data)).convert('RGB')
        
        start_time = time.time()
        logger.info(f"Processing image with ORMBG...")
        
        # Only support ORMBG
        if method != "ormbg":
            raise HTTPException(status_code=400, detail="Only 'ormbg' method is supported in this minimal version")
        
        no_bg_image = process_with_ormbg(image)
        
        process_time = time.time() - start_time
        logger.info(f"Background removal completed in {process_time:.2f} seconds")
        
        with io.BytesIO() as output:
            no_bg_image.save(output, format="PNG")
            content = output.getvalue()

        return Response(content=content, media_type="image/png")

    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {
        "message": "ORMBG Background Removal API", 
        "description": "Minimal API for background removal using Open RMBG",
        "available_methods": ["ormbg"],
        "model_loaded": model_loaded,
        "status": "healthy"
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy", 
        "model_loaded": model_loaded,
        "method": "ormbg"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    logger.info(f"Starting ORMBG Background Removal Server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port) 