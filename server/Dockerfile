FROM python:3.11-slim

WORKDIR /app

# Debug: Show what's in the current directory
RUN ls -la

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY server_ormbg_only.py .
COPY ormbg/ ./ormbg/

# Debug: Show what's in the app directory
RUN ls -la

# Copy the model file from the correct location
RUN mkdir -p /root/.ormbg
COPY models/ormbg/ormbg.pth /root/.ormbg/ormbg.pth

# Debug: Verify the model file was copied
RUN ls -la /root/.ormbg/
RUN echo "Model file size:" && ls -lh /root/.ormbg/ormbg.pth

# Set PYTHONPATH to include the current directory
ENV PYTHONPATH=/app

EXPOSE 8080

CMD ["python", "-m", "uvicorn", "server_ormbg_only:app", "--host", "0.0.0.0", "--port", "8080"] 