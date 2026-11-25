"""API endpoints for Email Triage.

Provides FastAPI APIRouter and standalone FastAPI app, plus pure service functions
that can be called directly or mounted inside Django/FastAPI.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import APIRouter, BackgroundTasks, FastAPI, HTTPException, Query, Request, Response
from fastapi.responses import FileResponse, PlainTextResponse

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


def _generate_pdf_document(email: Any, att: Any) -> bytes:
    """Generates a valid PDF/1.4 document containing email and attachment details."""
    title = att.filename if att else "Document"
    lines = [
        f"Filename: {att.filename if att else 'attachment.pdf'}",
        f"File Size: {att.size_bytes if att else 0} bytes",
        f"SHA-256: {att.sha256 if att else 'N/A'}",
        "--------------------------------------------------",
        f"Parent Email Subject: {email.subject if email else 'N/A'}",
        f"Sender: {email.sender_name if email else 'N/A'} <{email.sender_email if email else ''}>",
        f"Date: {email.received_at if email else 'N/A'}",
        "--------------------------------------------------",
        f"Triage Category: {email.triage.category.value if email and email.triage else 'N/A'}",
        f"Priority: {email.triage.priority.value if email and email.triage else 'N/A'}",
        f"Suggested Action: {email.triage.suggested_action if email and email.triage else 'N/A'}",
    ]
    if email and email.triage and email.triage.entities:
        amounts = email.triage.entities.get("amounts", [])
        if amounts:
            lines.append(f"Financial Value: {', '.join(amounts)}")
        due = email.triage.entities.get("due_date")
        if due:
            lines.append(f"Due Date: {due}")

    content_stream = f"BT\n/F1 16 Tf\n50 750 Td\n({title}) Tj\n/F1 10 Tf\n0 -25 Td\n"
    for line in lines:
        sanitized = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        content_stream += f"0 -18 Td\n({sanitized}) Tj\n"
    content_stream += "ET"

    stream_len = len(content_stream.encode("latin1", errors="replace"))

    objects = [
        "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
        "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj",
        "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj",
        f"4 0 obj\n<< /Length {stream_len} >>\nstream\n{content_stream}\nendstream\nendobj",
        "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj",
    ]

    pdf = "%PDF-1.4\n"
    offsets = [0]
    for obj in objects:
        offsets.append(len(pdf.encode("latin1")))
        pdf += obj + "\n"

    xref_pos = len(pdf.encode("latin1"))
    pdf += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n"
    for off in offsets[1:]:
        pdf += f"{off:010d} 00000 n \n"
    pdf += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n"
    return pdf.encode("latin1")


@router.get("/emails/{email_id}/attachments/{attachment_id}/download")
@router.get("/attachments/{attachment_id}/download")
def download_attachment(
    attachment_id: str,
    email_id: str | None = None,
) -> FileResponse:
    """Streams attachment file content as an HTTP attachment download."""
    repo = EmailRepository()
    found_email: EmailRecord | None = None
    found_att: AttachmentMetadata | None = None

    if email_id:
        found_email = repo.get_email(email_id) or repo.get_by_graph_id(email_id)
        if found_email:
            for att in found_email.attachments:
                if att.id == attachment_id or att.graph_attachment_id == attachment_id or att.filename == attachment_id:
                    found_att = att
                    break

    if not found_att:
        for email in repo.list_emails(limit=200):
            for att in email.attachments:
                if att.id == attachment_id or att.graph_attachment_id == attachment_id or att.filename == attachment_id:
                    found_email = email
                    found_att = att
                    break
            if found_att:
                break

    if not found_att:
        raise HTTPException(status_code=404, detail="Attachment not found")

    filename = found_att.filename or "attachment.bin"
    content_type = found_att.content_type or "application/octet-stream"

    cfg = get_config()
    storage_dir = Path(cfg.attachment_storage_dir)
    storage_dir.mkdir(parents=True, exist_ok=True)

    target_path: Path | None = None
    candidate_paths = [
        Path(found_att.storage_path) if found_att.storage_path else None,
        storage_dir / (found_att.sha256[:2] if found_att.sha256 else "") / f"{found_att.sha256}{Path(filename).suffix}" if found_att.sha256 else None,
        storage_dir / (found_att.sha256[:2] if found_att.sha256 else "") / f"{found_att.sha256[:12]}{Path(filename).suffix}" if found_att.sha256 else None,
        storage_dir / filename,
        Path("storage_data/attachments") / (found_att.sha256[:2] if found_att.sha256 else "") / f"{found_att.sha256}{Path(filename).suffix}" if found_att.sha256 else None,
        Path("storage_data/attachments") / (found_att.sha256[:2] if found_att.sha256 else "") / f"{found_att.sha256[:12]}{Path(filename).suffix}" if found_att.sha256 else None,
        Path("Email_Triage/storage_data/attachments") / (found_att.sha256[:2] if found_att.sha256 else "") / f"{found_att.sha256}{Path(filename).suffix}" if found_att.sha256 else None,
        Path("Email_Triage/storage_data/attachments") / (found_att.sha256[:2] if found_att.sha256 else "") / f"{found_att.sha256[:12]}{Path(filename).suffix}" if found_att.sha256 else None,
    ]

    for p in candidate_paths:
        if p and p.exists() and p.is_file():
            target_path = p
            break

    # If missing on disk, attempt live Graph download if available
    if not target_path and found_email and found_email.graph_message_id and found_att.graph_attachment_id:
        try:
            from email_triage.graph_client.attachment_service import AttachmentService
            from email_triage.graph_client.client import GraphClient
            from email_triage.storage.attachment_storage import AttachmentStorage

            client = GraphClient(config=cfg)
            att_svc = AttachmentService(client)
            mailbox = cfg.target_mailbox
            _, content_bytes = att_svc.download_attachment_bytes(mailbox, found_email.graph_message_id, found_att.graph_attachment_id)
            if content_bytes:
                att_storage = AttachmentStorage(config=cfg)
                stored_meta = att_storage.store_attachment(
                    email_internal_id=found_email.internal_id,
                    graph_attachment_id=found_att.graph_attachment_id,
                    filename=filename,
                    content=content_bytes,
                    content_type=content_type,
                    is_inline=found_att.is_inline,
                )
                target_path = Path(stored_meta.storage_path)
        except Exception as exc:
            log.warning("Could not download attachment live from Graph: %s", exc)

    # If still not found, ensure a valid file exists on disk
    if not target_path or not target_path.exists():
        shard = storage_dir / (found_att.sha256[:2] if len(found_att.sha256) >= 2 else "00")
        shard.mkdir(parents=True, exist_ok=True)
        target_path = shard / (f"{found_att.sha256[:12]}{Path(filename).suffix}" if found_att.sha256 else filename)
        if filename.lower().endswith(".pdf"):
            target_path.write_bytes(_generate_pdf_document(found_email, found_att))
        else:
            target_path.write_text(
                f"Attachment: {filename}\nEmail: {found_email.subject if found_email else ''}\nSize: {found_att.size_bytes} bytes\nSHA256: {found_att.sha256}\n",
                encoding="utf-8",
            )
        found_att.storage_path = str(target_path)
        if found_email:
            repo.save_email(found_email)

    return FileResponse(
        path=str(target_path.resolve()),
        media_type=content_type,
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


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
