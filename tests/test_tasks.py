"""Unit tests for background Celery tasks in eager mode."""
from __future__ import annotations

import base64
import httpx
import pytest

from email_triage.config import TriageConfig
from email_triage.models.schemas import EmailCategory, EmailRecord, Priority, ProcessingStatus
from email_triage.storage.email_repository import EmailRepository
from email_triage.tasks.celery_tasks import (
    task_download_attachments,
    task_process_single_email,
    task_triage_email,
)


def test_task_triage_email_lifecycle(tmp_path):
    cfg = TriageConfig(
        repository_storage_path=tmp_path / "store.json",
        task_always_eager=True,
    )
    repo = EmailRepository(config=cfg, persist_to_disk=False)

    email = EmailRecord(
        internal_id="task-test-email-01",
        subject="URGENT: Outstanding payment needed immediately",
        body_plain="Please remit $5,000.00 today as discussed.",
        processing_status=ProcessingStatus.INGESTED,
    )
    repo.save_email(email)

    res = task_triage_email(internal_id="task-test-email-01")
    assert res["status"] == "TRIAGED"
    assert res["category"] in (EmailCategory.URGENT.value, EmailCategory.INVOICE_FINANCE.value)
    assert res["priority"] in (Priority.CRITICAL.value, Priority.HIGH.value)

    updated = repo.get_email("task-test-email-01")
    assert updated is not None
    assert updated.processing_status == ProcessingStatus.TRIAGED
    assert updated.triage.action_required is True


def test_task_process_single_email_mocked(tmp_path, monkeypatch):
    monkeypatch.setenv("GRAPH_CLIENT_ID", "mock-cid")
    monkeypatch.setenv("GRAPH_CLIENT_SECRET", "mock-csec")
    monkeypatch.setenv("GRAPH_TENANT_ID", "mock-tid")

    mock_email_response = {
        "id": "graph-msg-1234",
        "subject": "Action Required: Quarterly Tax Review",
        "body": {"contentType": "text", "content": "Please review the attached client accounts."},
        "receivedDateTime": "2026-11-20T14:00:00Z",
        "hasAttachments": False,
    }

    def transport_handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if "oauth2/v2.0/token" in url:
            return httpx.Response(200, json={"access_token": "mock-token", "expires_in": 3600})
        if "messages/graph-msg-1234" in url:
            return httpx.Response(200, json=mock_email_response)
        return httpx.Response(404)

    transport = httpx.MockTransport(transport_handler)
    from email_triage.authentication.graph_auth import GraphAuthProvider
    from email_triage.graph_client.client import GraphClient

    cfg = TriageConfig(client_id="mock-cid", client_secret="mock-csec", tenant_id="mock-tid")
    auth = GraphAuthProvider(config=cfg, transport=transport)

    monkeypatch.setattr(
        "email_triage.tasks.celery_tasks.GraphClient",
        lambda config=None: GraphClient(auth_provider=auth, config=cfg, transport=transport),
    )

    result = task_process_single_email(mailbox="triage@example.com", message_id="graph-msg-1234")
    assert result["status"] == "SUCCESS"

    repo = EmailRepository()
    saved = repo.get_by_graph_id("graph-msg-1234")
    assert saved is not None
    assert saved.subject == "Action Required: Quarterly Tax Review"
    assert saved.processing_status == ProcessingStatus.TRIAGED


def test_task_download_attachments_mocked(tmp_path, monkeypatch):
    monkeypatch.setenv("GRAPH_CLIENT_ID", "mock-cid")
    monkeypatch.setenv("GRAPH_CLIENT_SECRET", "mock-csec")
    monkeypatch.setenv("GRAPH_TENANT_ID", "mock-tid")

    pdf_bytes = b"%PDF-1.5 Sample test invoice document"
    pdf_b64 = base64.b64encode(pdf_bytes).decode("ascii")

    mock_attachments_list = {
        "value": [
            {"id": "att-mock-1", "name": "Invoice_999.pdf", "contentType": "application/pdf", "size": len(pdf_bytes), "isInline": False}
        ]
    }
    mock_attachment_item = {
        "id": "att-mock-1",
        "name": "Invoice_999.pdf",
        "contentType": "application/pdf",
        "contentBytes": pdf_b64,
    }

    def transport_handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if "oauth2/v2.0/token" in url:
            return httpx.Response(200, json={"access_token": "mock-token", "expires_in": 3600})
        if "attachments/att-mock-1" in url:
            return httpx.Response(200, json=mock_attachment_item)
        if "attachments" in url:
            return httpx.Response(200, json=mock_attachments_list)
        return httpx.Response(404)

    transport = httpx.MockTransport(transport_handler)
    from email_triage.authentication.graph_auth import GraphAuthProvider
    from email_triage.graph_client.client import GraphClient

    cfg = TriageConfig(
        client_id="mock-cid", client_secret="mock-csec", tenant_id="mock-tid",
        attachment_storage_dir=tmp_path / "att",
    )
    auth = GraphAuthProvider(config=cfg, transport=transport)

    monkeypatch.setattr(
        "email_triage.tasks.celery_tasks.GraphClient",
        lambda config=None: GraphClient(auth_provider=auth, config=cfg, transport=transport),
    )

    repo = EmailRepository(config=cfg)
    email = EmailRecord(internal_id="em-att-test-01", has_attachments=True)
    repo.save_email(email)

    stored_ids = task_download_attachments(
        mailbox="triage@example.com",
        message_id="msg-with-att",
        email_internal_id="em-att-test-01",
    )
    assert len(stored_ids) == 1

    updated = repo.get_email("em-att-test-01")
    assert updated is not None
    assert len(updated.attachments) == 1
    assert updated.attachments[0].filename == "Invoice_999.pdf"
    assert updated.processing_status == ProcessingStatus.ATTACHMENTS_PROCESSED
