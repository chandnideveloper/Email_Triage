"""Unit tests for Email Fetcher with mocked Graph API, pagination, and error handling."""
from __future__ import annotations

import httpx
import pytest

from email_triage.authentication.graph_auth import GraphAuthError, GraphAuthProvider
from email_triage.config import TriageConfig
from email_triage.graph_client.client import GraphClient, GraphError, GraphRateLimitError
from email_triage.graph_client.email_service import EmailService
from email_triage.ingestion.email_fetcher import EmailFetcher
from email_triage.models.schemas import EmailRecord
from email_triage.storage.email_repository import EmailRepository


def test_fetch_emails_with_pagination(tmp_path):
    page1 = {
        "value": [
            {
                "id": "msg-p1-01",
                "subject": "Invoice 1",
                "receivedDateTime": "2026-11-20T10:00:00Z",
                "body": {"contentType": "text", "content": "Please pay $100"},
            }
        ],
        "@odata.nextLink": "https://graph.microsoft.com/v1.0/users/triage@example.com/messages?$skip=1",
    }
    page2 = {
        "value": [
            {
                "id": "msg-p2-01",
                "subject": "Invoice 2",
                "receivedDateTime": "2026-11-20T11:00:00Z",
                "body": {"contentType": "text", "content": "Please pay $200"},
            }
        ]
    }

    def transport_handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if "oauth2/v2.0/token" in url:
            return httpx.Response(200, json={"access_token": "mock-token", "expires_in": 3600})
        if "$skip=1" in url:
            return httpx.Response(200, json=page2)
        return httpx.Response(200, json=page1)

    transport = httpx.MockTransport(transport_handler)
    cfg = TriageConfig(
        client_id="cid", client_secret="csec", tenant_id="tid",
        repository_storage_path=tmp_path / "store.json",
        attachment_storage_dir=tmp_path / "att",
    )
    auth = GraphAuthProvider(config=cfg, transport=transport)
    client = GraphClient(auth_provider=auth, config=cfg, transport=transport)
    service = EmailService(client)
    repo = EmailRepository(config=cfg, persist_to_disk=False)
    fetcher = EmailFetcher(email_service=service, repository=repo, config=cfg)

    results = fetcher.fetch_emails(mailbox="triage@example.com", max_emails=10)
    assert len(results) == 2
    assert results[0].graph_message_id == "msg-p1-01"
    assert results[1].graph_message_id == "msg-p2-01"


def test_fetch_emails_skips_duplicates(tmp_path):
    msg_data = {
        "value": [
            {
                "id": "msg-existing-01",
                "subject": "Already Ingested Message",
                "receivedDateTime": "2026-11-20T10:00:00Z",
                "body": {"contentType": "text", "content": "Existing body"},
            }
        ]
    }

    def transport_handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if "oauth2/v2.0/token" in url:
            return httpx.Response(200, json={"access_token": "mock-token", "expires_in": 3600})
        return httpx.Response(200, json=msg_data)

    transport = httpx.MockTransport(transport_handler)
    cfg = TriageConfig(client_id="cid", client_secret="csec", tenant_id="tid")
    auth = GraphAuthProvider(config=cfg, transport=transport)
    client = GraphClient(auth_provider=auth, config=cfg, transport=transport)
    service = EmailService(client)
    repo = EmailRepository(config=cfg, persist_to_disk=False)

    # Pre-seed repository with this message ID
    repo.save_email(EmailRecord(graph_message_id="msg-existing-01", subject="Already Ingested"))

    fetcher = EmailFetcher(email_service=service, repository=repo, config=cfg)
    results = fetcher.fetch_emails(mailbox="triage@example.com", max_emails=10)
    # Deduplication skips the existing message
    assert len(results) == 0


def test_auth_failure_handling():
    cfg_unconfigured = TriageConfig(client_id="", client_secret="", tenant_id="")
    auth = GraphAuthProvider(config=cfg_unconfigured)
    with pytest.raises(GraphAuthError) as exc:
        auth.get_access_token()
    assert exc.value.code == "AUTH_CONFIG_MISSING"


def test_graph_rate_limit_retry_recovery():
    attempts = 0

    def transport_handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        url = str(request.url)
        if "oauth2/v2.0/token" in url:
            return httpx.Response(200, json={"access_token": "mock-token", "expires_in": 3600})
        attempts += 1
        if attempts == 1:
            return httpx.Response(429, headers={"Retry-After": "1"}, json={"error": {"code": "activityLimitReached"}})
        return httpx.Response(200, json={"value": [{"id": "recovered-msg", "subject": "Recovered"}]})

    transport = httpx.MockTransport(transport_handler)
    cfg = TriageConfig(client_id="cid", client_secret="csec", tenant_id="tid")
    auth = GraphAuthProvider(config=cfg, transport=transport)
    client = GraphClient(auth_provider=auth, config=cfg, transport=transport)
    service = EmailService(client)

    resp = service.list_messages("triage@example.com")
    assert len(resp["value"]) == 1
    assert resp["value"][0]["id"] == "recovered-msg"
    assert attempts == 2
