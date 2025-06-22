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

# Add CORS middleware
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

def simple_background_removal(image):
    """Ultra-simple background removal - removes white/bright backgrounds"""
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
        logger.error(f"Background removal failed: {e}")
        # Return original image with alpha channel
        return image.convert('RGBA')

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
        "method": "simple_threshold",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    logger.info(f"Starting PixGone Server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port) 