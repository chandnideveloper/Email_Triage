"""Tasks package."""
try:
    from celery_app import celery_app
except ImportError:
    try:
        from email_triage.celery_app import celery_app
    except ImportError:
        from .celery_tasks import celery_app

from .celery_tasks import (
    task_download_attachments,
    task_process_single_email,
    task_renew_subscriptions,
    task_sync_mailbox,
    task_triage_email,
)

if celery_app and hasattr(celery_app, "task"):
    @celery_app.task
    def test_email_processing(email_id: str):
        print(f"Processing email: {email_id}")
        return {
            "email_id": email_id,
            "status": "processed",
            "message": "Email processed successfully",
        }
else:
    def test_email_processing(email_id: str):
        return {
            "email_id": email_id,
            "status": "processed",
            "message": "Email processed successfully",
        }

__all__ = [
    "task_sync_mailbox",
    "task_process_single_email",
    "task_download_attachments",
    "task_triage_email",
    "task_renew_subscriptions",
    "test_email_processing",
]
