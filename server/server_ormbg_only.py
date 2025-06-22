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

app = FastAPI(title="ORMBG Background Removal API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
            
            ormbg_model_path = os.path.expanduser("~/.ormbg/ormbg.pth")
            if not os.path.exists(ormbg_model_path):
                raise FileNotFoundError(f"ORMBG model file not found: {ormbg_model_path}. Please run setup first.")
            
            logger.info("Loading ORMBG model...")
            ormbg_processor = ORMBGProcessor(ormbg_model_path)
            
            if torch.cuda.is_available():
                ormbg_processor.to("cuda")
                logger.info("ORMBG model loaded on GPU")
            else:
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
        "model_loaded": model_loaded
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
    logger.info("Starting ORMBG Background Removal Server...")
    uvicorn.run(app, host="0.0.0.0", port=9876) 