import os
import sys
from pathlib import Path
from celery import Celery
from dotenv import load_dotenv

# Ensure both current directory and parent directory are on sys.path
current_dir = str(Path(__file__).resolve().parent)
parent_dir = str(Path(__file__).resolve().parent.parent)
for p in (parent_dir, current_dir):
    if p not in sys.path:
        sys.path.insert(0, p)

load_dotenv()

celery_app = Celery(
    "email_triage",
    broker=os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0"),
    backend=os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1"),
    include=["tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

if __name__ == "__main__":
    celery_app.start()
