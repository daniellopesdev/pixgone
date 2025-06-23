FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY server_ormbg_only.py .

# Add these lines to copy the model file
RUN mkdir -p /root/.ormbg
COPY ormbg.pth /root/.ormbg/ormbg.pth

EXPOSE 8080

CMD ["python", "-m", "uvicorn", "server_ormbg_only:app", "--host", "0.0.0.0", "--port", "8080"] 