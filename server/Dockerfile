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

# Create the model directory in /opt and download the model
RUN echo "--- Creating directory /opt/models/ormbg ---"
RUN mkdir -p /opt/models/ormbg

RUN echo "--- Downloading model file ---"
RUN wget -O /opt/models/ormbg/ormbg.pth https://huggingface.co/schirrmacher/ormbg/resolve/main/models/ormbg.pth

# --- DETAILED PATH VERIFICATION DURING BUILD ---
RUN echo "--- Verifying root directory (/) ---" && ls -la /
RUN echo "--- Verifying /opt directory ---" && ls -la /opt
RUN echo "--- Verifying /opt/models directory ---" && ls -la /opt/models
RUN echo "--- Verifying /opt/models/ormbg directory ---" && ls -la /opt/models/ormbg
RUN echo "--- Verifying model file with size ---" && ls -lh /opt/models/ormbg/ormbg.pth
# --- END DETAILED PATH VERIFICATION ---

# Set PYTHONPATH to include the current directory
ENV PYTHONPATH=/app

EXPOSE 8080

CMD ["python", "-m", "uvicorn", "server_ormbg_only:app", "--host", "0.0.0.0", "--port", "8080"] 