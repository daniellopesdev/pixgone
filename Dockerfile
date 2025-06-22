FROM python:3.11-slim

WORKDIR /app

COPY server/requirements.txt .
RUN pip install -r requirements.txt

COPY server/server_ormbg_only.py .

EXPOSE 8080

CMD ["python", "-m", "uvicorn", "server_ormbg_only:app", "--host", "0.0.0.0", "--port", "8080"] 