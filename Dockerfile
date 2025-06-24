FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy server files
COPY server/ .

# Expose port
EXPOSE 8080

# Set environment variable
ENV PORT=8080

# Start the working server with cost monitoring
CMD ["python", "server_ormbg_only.py"] 