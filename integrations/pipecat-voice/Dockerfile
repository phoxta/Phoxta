FROM python:3.12-slim

WORKDIR /app

# Pipecat's Silero VAD + audio deps want these.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg git && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY bot.py server.py ./

EXPOSE 8765
CMD ["python", "server.py"]
