"""Unit tests for FastAPI API routes and webhook endpoints."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from email_triage.api.routes import app
from email_triage.models.schemas import EmailCategory, EmailRecord, Priority, ProcessingStatus, TriageResult
from email_triage.storage.email_repository import EmailRepository


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_api_list_and_detail_emails(client: TestClient, isolated_repo: EmailRepository):
    # Seed 2 test emails
    email1 = EmailRecord(
        internal_id="em-01",
        subject="BAS Review",
        body_plain="Content 1",
        triage=TriageResult(category=EmailCategory.INVOICE_FINANCE, priority=Priority.HIGH),
        processing_status=ProcessingStatus.TRIAGED,
    )
    email2 = EmailRecord(
        internal_id="em-02",
        subject="Team Catchup",
        body_plain="Content 2",
        triage=TriageResult(category=EmailCategory.MEETING_SCHEDULING, priority=Priority.MEDIUM),
        processing_status=ProcessingStatus.TRIAGED,
    )
    isolated_repo.save_email(email1)
    isolated_repo.save_email(email2)

    # 1. List all
    resp = client.get("/api/triage/emails")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2

    # 2. Filter by category
    resp_filtered = client.get("/api/triage/emails", params={"category": "Invoice / Finance"})
    assert resp_filtered.status_code == 200
    assert len(resp_filtered.json()["items"]) == 1
    assert resp_filtered.json()["items"][0]["internal_id"] == "em-01"

    # 3. Detail
    resp_detail = client.get("/api/triage/emails/em-01")
    assert resp_detail.status_code == 200
    assert resp_detail.json()["subject"] == "BAS Review"

    # 4. Detail 404
    resp_404 = client.get("/api/triage/emails/non-existent-id")
    assert resp_404.status_code == 404


def test_api_sync_status(client: TestClient):
    resp = client.get("/api/triage/sync/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "last_status" in data
    assert "emails_synced_total" in data


def test_api_webhook_handshake(client: TestClient):
    # Microsoft Graph GET handshake with validationToken
    token = "EchoThisSecureToken12345"
    resp = client.get("/api/triage/webhook", params={"validationToken": token})
    assert resp.status_code == 200
    assert resp.text == token
    assert "text/plain" in resp.headers["content-type"]


def test_api_webhook_notification_received(client: TestClient, monkeypatch: pytest.MonkeyPatch):
    # Mock background ingestion task so test doesn't make live Graph API calls
    monkeypatch.setattr(
        "email_triage.api.routes.task_process_single_email",
        lambda mailbox=None, message_id="": {"status": "MOCKED"},
    )

    payload = {
        "value": [
            {
                "subscriptionId": "sub-api-test",
                "clientState": "test-secret-state",
                "changeType": "created",
                "resource": "Users/triage@example.com/Messages/msg-webhook-api-1",
                "resourceData": {"id": "msg-webhook-api-1"},
            }
        ]
    }
    resp = client.post("/api/triage/webhook", json=payload)
    # Must return HTTP 202 Accepted per Graph specification
    assert resp.status_code == 202
