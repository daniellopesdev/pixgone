from fastapi import FastAPI, UploadFile, File, Response, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
import time
import os
import sys

print("=== Starting PixGone Server ===")
print(f"Python version: {sys.version}")
print(f"Current directory: {os.getcwd()}")

app = FastAPI()

# Add CORS middleware with more permissive settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("✅ CORS middleware configured")

def try_import_ormbg():
    """Try to import ormbg, return None if failed"""
    try:
        from rembg import remove
        print("✅ ormbg imported successfully")
        return remove
    except ImportError as e:
        print(f"❌ ormbg import failed: {e}")
        return None
    except Exception as e:
        print(f"❌ ormbg error: {e}")
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
async def remove_background(file: UploadFile = File(...)):
    print("🔄 Processing background removal request")
    try:
        # Validate file
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        image_data = await file.read()
        if len(image_data) == 0:
            raise HTTPException(status_code=400, detail="Empty file")
        
        image = Image.open(io.BytesIO(image_data)).convert('RGB')
        print(f"Processing image: {image.size}")
        
        start_time = time.time()
        
        # Try ormbg first
        remove_func = try_import_ormbg()
        if remove_func:
            try:
                print("Using ormbg for background removal")
                no_bg_image = remove_func(image)
                process_time = time.time() - start_time
                print(f"ormbg completed in {process_time:.2f} seconds")
            except Exception as e:
                print(f"ormbg failed: {e}, falling back to simple method")
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

        print("✅ Processing completed successfully")
        return Response(content=content, media_type="image/png")

    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error processing image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@app.get("/")
async def root():
    print("Root endpoint called")
    return {"message": "PixGone API is running!"}

@app.get("/health")
async def health():
    print("Health endpoint called")
    return {"status": "healthy"}

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