FROM python:3.11-slim

WORKDIR /app

# Install wget for downloading the model
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

# Debug: Show what's in the current directory
RUN ls -la

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY server_ormbg_only.py .
COPY ormbg/ ./ormbg/

# Debug: Show what's in the app directory
RUN ls -la

# Create the model directory inside the app's working directory and download the model
RUN mkdir -p /app/models/ormbg
RUN wget -O /app/models/ormbg/ormbg.pth https://huggingface.co/schirrmacher/ormbg/resolve/main/models/ormbg.pth

# Debug: Verify the model file was downloaded
RUN ls -la /app/models/ormbg/
RUN echo "Model file size:" && ls -lh /app/models/ormbg/ormbg.pth

# Set PYTHONPATH to include the current directory
ENV PYTHONPATH=/app

EXPOSE 8080

CMD ["python", "-m", "uvicorn", "server_ormbg_only:app", "--host", "0.0.0.0", "--port", "8080"] 