"""Celery background tasks for asynchronous email ingestion, triage, and synchronization."""
from __future__ import annotations

import functools
from typing import Any, Callable

from email_triage.config import TriageConfig, get_config
from email_triage.graph_client.attachment_service import AttachmentService
from email_triage.graph_client.client import GraphClient
from email_triage.graph_client.email_service import EmailService
from email_triage.ingestion.email_parser import EmailParser
from email_triage.ingestion.sync_service import SyncService
from email_triage.models.schemas import ProcessingStatus
from email_triage.storage.attachment_storage import AttachmentStorage, AttachmentValidationError
from email_triage.storage.email_repository import EmailRepository
from email_triage.triage import TriageEngine
from email_triage.utils.logger import get_logger

log = get_logger(__name__)

# Attempt importing Celery, otherwise provide transparent fallback decorator
try:
    from celery import Celery

    _CELERY_AVAILABLE = True
except ImportError:
    Celery = None
    _CELERY_AVAILABLE = False


config = get_config()

if _CELERY_AVAILABLE:
    celery_app = Celery(
        "email_triage",
        broker=config.celery_broker_url,
        backend=config.celery_result_backend,
    )
    celery_app.conf.update(
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        task_always_eager=config.task_always_eager,
    )
else:
    celery_app = None


def task_decorator(*d_args, **d_kwargs):
    """Decorator registering with Celery if available, or providing an eager runner fallback."""

    def decorator(func: Callable[..., Any]):
        if _CELERY_AVAILABLE and celery_app:
            registered = celery_app.task(*d_args, **d_kwargs)(func)
            return registered

        # Fallback wrapper mimicking Celery .delay() and .apply_async()
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)

        def delay(*args, **kwargs):
            return func(*args, **kwargs)

        def apply_async(args=None, kwargs=None, **_opt):
            return func(*(args or ()), **(kwargs or {}))

        wrapper.delay = delay
        wrapper.apply_async = apply_async
        return wrapper

    if len(d_args) == 1 and callable(d_args[0]):
        fn = d_args[0]
        d_args = ()
        return decorator(fn)
    return decorator


# --- Task Implementations ---

@task_decorator(bind=True, max_retries=3, default_retry_delay=5)
def task_sync_mailbox(self=None, mailbox: str | None = None) -> dict[str, Any]:
    """Asynchronous background task to incrementally sync mailbox changes."""
    log.info("Starting task_sync_mailbox for mailbox=%s", mailbox)
    try:
        cfg = get_config()
        client = GraphClient(config=cfg)
        service = EmailService(client)
        repo = EmailRepository(config=cfg)
        sync_svc = SyncService(service, repo, config=cfg)
        result = sync_svc.sync_mailbox(mailbox)
        return result
    except Exception as exc:
        log.error("task_sync_mailbox failed with %s", type(exc).__name__)
        if hasattr(self, "retry"):
            raise self.retry(exc=exc)
        raise


@task_decorator(bind=True, max_retries=3, default_retry_delay=5)
def task_process_single_email(self=None, mailbox: str | None = None, message_id: str = "") -> dict[str, Any]:
    """Fetches full message details, saves to repository, downloads attachments, and runs triage."""
    log.info("Processing single email message_id=%s", message_id)
    if not message_id:
        return {"status": "SKIPPED", "reason": "empty_message_id"}

    try:
        cfg = get_config()
        client = GraphClient(config=cfg)
        email_svc = EmailService(client)
        repo = EmailRepository(config=cfg)
        parser = EmailParser()

        target_mailbox = (mailbox or cfg.target_mailbox).strip()
        raw_msg = email_svc.get_message(target_mailbox, message_id)
        email_record = parser.parse_graph_message(raw_msg)
        repo.save_email(email_record)

        # Download attachments if present
        if email_record.has_attachments:
            task_download_attachments(target_mailbox, message_id, email_record.internal_id)

        # Execute triage
        triage_engine = TriageEngine()
        email_record = triage_engine.triage_email(email_record)
        repo.save_email(email_record)

        return {"status": "SUCCESS", "internal_id": email_record.internal_id}
    except Exception as exc:
        log.error("task_process_single_email failed for id=%s: %s", message_id, type(exc).__name__)
        if hasattr(self, "retry"):
            raise self.retry(exc=exc)
        raise


@task_decorator(bind=True, max_retries=2, default_retry_delay=5)
def task_download_attachments(self=None, mailbox: str | None = None, message_id: str = "", email_internal_id: str = "") -> list[str]:
    """Downloads and persists attachments for a given email record."""
    log.info("Downloading attachments for message_id=%s", message_id)
    stored_ids: list[str] = []
    try:
        cfg = get_config()
        client = GraphClient(config=cfg)
        att_svc = AttachmentService(client)
        att_storage = AttachmentStorage(config=cfg)
        repo = EmailRepository(config=cfg)

        target_mailbox = (mailbox or cfg.target_mailbox).strip()
        attachments_meta = att_svc.list_attachments(target_mailbox, message_id)

        email = repo.get_email(email_internal_id)
        downloaded_list = []

        for att_info in attachments_meta:
            att_id = att_info.get("id")
            if not att_id:
                continue

            filename, content = att_svc.download_attachment_bytes(target_mailbox, message_id, att_id)
            if not content:
                continue

            try:
                meta = att_storage.store_attachment(
                    email_internal_id=email_internal_id,
                    graph_attachment_id=att_id,
                    filename=filename,
                    content=content,
                    content_type=att_info.get("contentType", "application/octet-stream"),
                    is_inline=bool(att_info.get("isInline", False)),
                )
                downloaded_list.append(meta)
                stored_ids.append(meta.id)
            except AttachmentValidationError as val_err:
                log.warning("Skipped invalid attachment %s: %s", filename, val_err)

        if email:
            email.attachments = downloaded_list
            email.processing_status = ProcessingStatus.ATTACHMENTS_PROCESSED
            repo.save_email(email)

        return stored_ids
    except Exception as exc:
        log.error("task_download_attachments error for msg=%s: %s", message_id, type(exc).__name__)
        if hasattr(self, "retry"):
            raise self.retry(exc=exc)
        raise


@task_decorator(bind=True, max_retries=2)
def task_triage_email(self=None, internal_id: str = "") -> dict[str, Any]:
    """Runs or re-runs triage analysis on an existing email record."""
    log.info("Running triage for email internal_id=%s", internal_id)
    try:
        repo = EmailRepository()
        email = repo.get_email(internal_id)
        if not email:
            return {"status": "NOT_FOUND"}

        triage_engine = TriageEngine()
        email = triage_engine.triage_email(email)
        repo.save_email(email)
        return {"status": "TRIAGED", "category": email.triage.category.value, "priority": email.triage.priority.value}
    except Exception as exc:
        log.error("task_triage_email error for id=%s: %s", internal_id, type(exc).__name__)
        if hasattr(self, "retry"):
            raise self.retry(exc=exc)
        raise


@task_decorator
def task_renew_subscriptions() -> dict[str, Any]:
    """Scans and renews webhook subscriptions nearing expiration."""
    log.info("Checking webhook subscriptions for renewal")
    try:
        cfg = get_config()
        client = GraphClient(config=cfg)
        repo = EmailRepository(config=cfg)
        from email_triage.webhooks.subscription_manager import SubscriptionManager

        mgr = SubscriptionManager(client, repo, config=cfg)
        renewed: list[str] = []
        for sub in repo.list_subscriptions():
            if sub.status == "ACTIVE":
                mgr.renew_subscription(sub.subscription_id)
                renewed.append(sub.subscription_id)
        return {"status": "SUCCESS", "renewed": renewed}
    except Exception as exc:
        log.error("task_renew_subscriptions error: %s", type(exc).__name__)
        return {"status": "FAILED", "error": type(exc).__name__}
