"""Backward-compatibility alias pointing to Huey application."""
import sys
from pathlib import Path

current_dir = str(Path(__file__).resolve().parent)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

try:
    from huey_app import huey as celery_app
except ImportError:
    from email_triage.huey_app import huey as celery_app

__all__ = ["celery_app"]

if __name__ == "__main__":
    print("Email Triage uses Huey with SQLite instead of Celery/Redis.")
    print("To run the background worker: python run_worker.py")
