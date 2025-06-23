FROM python:3.11-slim

WORKDIR /app

# Install wget, which the application will use to download the model at runtime
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

# Debug: Show what's in the current directory
RUN ls -la

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY server_ormbg_only.py .
COPY ormbg/ ./ormbg/

# Debug: Show what's in the app directory
RUN ls -la

# Set PYTHONPATH to include the current directory
ENV PYTHONPATH=/app

EXPOSE 8080

CMD ["python", "-m", "uvicorn", "server_ormbg_only:app", "--host", "0.0.0.0", "--port", "8080"] 