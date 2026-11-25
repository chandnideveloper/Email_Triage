"""Huey background worker runner for Email Triage tasks using SQLite backend."""
import sys
from pathlib import Path

# Add project root to path
current_dir = str(Path(__file__).resolve().parent)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from huey.bin.huey_consumer import consumer_main
from huey_app import huey

# Ensure all tasks are imported and registered with Huey's task registry
try:
    import tasks.celery_tasks
except ImportError:
    from email_triage.tasks import celery_tasks

if __name__ == "__main__":
    print("=" * 65)
    print("  Starting Email Triage Huey Background Worker")
    print(f"  Queue Database: {huey.storage.filename}")
    print("  Worker Mode: Threaded (Windows & Linux compatible)")
    print("=" * 65)
    # Default options: huey_app.huey, 2 worker threads, thread worker type
    args = ["huey_consumer", "huey_app.huey", "-w", "2", "-k", "thread"]
    if len(sys.argv) > 1:
        args.extend(sys.argv[1:])
    sys.argv = args
    consumer_main()
