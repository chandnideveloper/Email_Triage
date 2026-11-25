"""Huey task queue application using SQLite backend (No Redis/Docker required)."""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from huey import SqliteHuey

# Ensure paths
current_dir = str(Path(__file__).resolve().parent)
parent_dir = str(Path(__file__).resolve().parent.parent)
for p in (parent_dir, current_dir):
    if p not in sys.path:
        sys.path.insert(0, p)

load_dotenv()

# Determine database path for task queue
queue_file = os.getenv("HUEY_QUEUE_PATH", "storage_data/triage_queue.db")
queue_path = Path(queue_file)
if not queue_path.is_absolute():
    queue_path = Path(__file__).resolve().parent / queue_path
queue_path.parent.mkdir(parents=True, exist_ok=True)

is_eager = os.getenv("TASK_ALWAYS_EAGER", "True").lower() in ("1", "true", "yes", "on")

huey = SqliteHuey(
    "email_triage",
    filename=str(queue_path),
    immediate=is_eager,
)
