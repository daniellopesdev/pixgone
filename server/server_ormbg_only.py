from fastapi import FastAPI
import os
import sys

print("=== Starting PixGone Server ===")
print(f"Python version: {sys.version}")
print(f"Current directory: {os.getcwd()}")
print(f"Files in directory: {os.listdir('.')}")

app = FastAPI()

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