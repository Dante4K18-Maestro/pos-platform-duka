FROM python:3.12-slim
WORKDIR /app
COPY apps/ai/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY apps/ai/app app
EXPOSE 8000
# Render's free tier spins this down after 15 min idle. It is the one
# service allowed to be slow on first response — the chat UI shows a
# "thinking" state while it wakes, and a cron ping keeps it warm in trading
# hours. It has no write path and no other service depends on it being warm.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
