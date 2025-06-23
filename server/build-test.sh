#!/bin/bash

echo "🔍 Testing Docker build and model file..."

# Check if model file exists
if [ -f "models/ormbg/ormbg.pth" ]; then
    echo "✅ Model file found: models/ormbg/ormbg.pth"
    ls -lh models/ormbg/ormbg.pth
else
    echo "❌ Model file not found: models/ormbg/ormbg.pth"
    exit 1
fi

# Build Docker image
echo "🐳 Building Docker image..."
docker build -t pixgone-test .

# Test if model file is in the container
echo "🔍 Testing if model file is in container..."
docker run --rm pixgone-test ls -la /root/.ormbg/

echo "✅ Docker build test completed" 