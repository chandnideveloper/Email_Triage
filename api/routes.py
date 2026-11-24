"""API endpoints for Email Triage.

Provides FastAPI APIRouter and standalone FastAPI app, plus pure service functions
that can be called directly or mounted inside Django/FastAPI.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, BackgroundTasks, FastAPI, HTTPException, Query, Request, Response
from fastapi.responses import PlainTextResponse

from email_triage.config import get_config
from email_triage.models.schemas import EmailCategory, Priority, ProcessingStatus
from email_triage.storage.email_repository import EmailRepository
from email_triage.tasks.celery_tasks import task_process_single_email, task_sync_mailbox, task_triage_email
from email_triage.utils.logger import get_logger
from email_triage.webhooks.handler import WebhookHandler
from email_triage.webhooks.validators import WebhookValidationError, validate_handshake_token

log = get_logger(__name__)

router = APIRouter(prefix="/api/triage", tags=["Email Triage"])


# --- API Routes ---

@router.post("/sync")
def trigger_sync(background_tasks: BackgroundTasks, mailbox: str | None = None) -> dict[str, Any]:
    """Triggers an incremental email synchronization run."""
    cfg = get_config()
    target = mailbox or cfg.target_mailbox
    log.info("API trigger_sync requested for %s", target)
    if cfg.task_always_eager:
        result = task_sync_mailbox(mailbox=target)
        return {"status": "COMPLETED", "result": result}
    # Asynchronous background execution
    background_tasks.add_task(task_sync_mailbox, mailbox=target)
    return {"status": "ENQUEUED", "mailbox": target}


@router.get("/emails")
def list_emails(
    category: str | None = Query(None, description="Filter by EmailCategory"),
    priority: str | None = Query(None, description="Filter by Priority"),
    status: str | None = Query(None, description="Filter by ProcessingStatus"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> dict[str, Any]:
    """Retrieves a paginated list of triaged emails with optional filtering."""
    repo = EmailRepository()
    emails = repo.list_emails(category=category, priority=priority, status=status, limit=limit, offset=offset)
    return {
        "count": len(emails),
        "total": repo.count_emails(),
        "limit": limit,
        "offset": offset,
        "items": [e.to_dict() for e in emails],
    }


@router.get("/emails/{email_id}")
def get_email_detail(email_id: str) -> dict[str, Any]:
    """Retrieves complete email details including body, triage scores, and extracted entities."""
    repo = EmailRepository()
    email = repo.get_email(email_id)
    if not email:
        # Check by graph_message_id as fallback
        email = repo.get_by_graph_id(email_id)
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    return email.to_dict()


@router.get("/emails/{email_id}/attachments")
def get_email_attachments(email_id: str) -> dict[str, Any]:
    """Retrieves attachment metadata and IBEX integration payloads for an email."""
    repo = EmailRepository()
    email = repo.get_email(email_id) or repo.get_by_graph_id(email_id)
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    return {
        "email_id": email.internal_id,
        "count": len(email.attachments),
        "attachments": [a.to_dict() for a in email.attachments],
    }


@router.post("/emails/{email_id}/retry")
def retry_email_processing(email_id: str) -> dict[str, Any]:
    """Retries processing or triage for a failed email."""
    repo = EmailRepository()
    email = repo.get_email(email_id)
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    email.retry_count += 1
    email.processing_status = ProcessingStatus.RETRYING
    repo.save_email(email)
    result = task_triage_email(internal_id=email.internal_id)
    return {"status": "RETRIED", "result": result}


@router.get("/sync/status")
def get_sync_status(mailbox: str | None = None) -> dict[str, Any]:
    """Returns the current synchronization status, last sync timestamp, and delta token presence."""
    cfg = get_config()
    target = mailbox or cfg.target_mailbox
    repo = EmailRepository()
    state = repo.get_sync_state(target)
    return {
        "mailbox": state.mailbox,
        "last_status": state.last_status,
        "last_sync_time": state.last_sync_time,
        "emails_synced_total": state.emails_synced_total,
        "has_delta_link": bool(state.delta_link),
        "error_code": state.error_code,
    }


# --- Webhook Endpoints ---

@router.get("/webhook")
def webhook_validation_handshake(request: Request) -> Response:
    """Handles Microsoft Graph webhook subscription validation handshake.

    Microsoft Graph sends a GET request with a 'validationToken' query parameter.
    The endpoint must return HTTP 200 with the validationToken in the response body as text/plain.
    """
    token = request.query_params.get("validationToken")
    try:
        validated_token = validate_handshake_token(token)
        log.info("Successfully validated Microsoft Graph webhook handshake")
        return PlainTextResponse(content=validated_token, status_code=200)
    except WebhookValidationError as err:
        log.warning("Webhook handshake failed: %s", err)
        raise HTTPException(status_code=400, detail=str(err)) from err


@router.post("/webhook")
async def webhook_notification_receiver(
    request: Request,
    background_tasks: BackgroundTasks,
) -> Response:
    """Receives Microsoft Graph change notifications, validates clientState, and queues ingestion."""
    # Check if this POST request is a handshake validation instead of notification
    token = request.query_params.get("validationToken")
    if token:
        validated_token = validate_handshake_token(token)
        return PlainTextResponse(content=validated_token, status_code=200)

    try:
        body = await request.json()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid JSON payload") from exc

    handler = WebhookHandler()
    try:
        dispatch_result = handler.handle_notification_payload(body)
    except WebhookValidationError as err:
        log.warning("Webhook notification rejected: %s", err)
        raise HTTPException(status_code=403, detail=str(err)) from err

    # Dispatch ingestion tasks for scheduled message IDs
    cfg = get_config()
    for msg_id in dispatch_result.get("scheduled_message_ids", []):
        if cfg.task_always_eager:
            task_process_single_email(mailbox=cfg.target_mailbox, message_id=msg_id)
        else:
            background_tasks.add_task(task_process_single_email, mailbox=cfg.target_mailbox, message_id=msg_id)

    # Return HTTP 202 Accepted per Microsoft Graph requirements
    return Response(content="", status_code=202)


def create_app() -> FastAPI:
    """Application factory returning configured FastAPI application."""
    app = FastAPI(
        title="IBEX Email Triage Service",
        description="Independent, secure Outlook email ingestion, classification, and triage module.",
        version="0.2.0",
    )
    app.include_router(router)
    return app


# Export standalone app for ASGI runners (uvicorn email_triage.api.routes:app)
app = create_app()
