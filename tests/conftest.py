"""Pytest fixtures and mock transports for Email Triage tests."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import httpx
import pytest

from email_triage.config import TriageConfig
from email_triage.storage.email_repository import EmailRepository


@pytest.fixture(autouse=True)
def isolated_repo(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> EmailRepository:
    """Provides an isolated in-memory/temp-file EmailRepository for each test."""
    store_file = tmp_path / "test_store.json"
    att_dir = tmp_path / "attachments"
    monkeypatch.setenv("REPOSITORY_STORAGE_PATH", str(store_file))
    monkeypatch.setenv("ATTACHMENT_STORAGE_DIR", str(att_dir))
    monkeypatch.setenv("TASK_ALWAYS_EAGER", "True")
    monkeypatch.setenv("GRAPH_CLIENT_ID", "test-client-id")
    monkeypatch.setenv("GRAPH_CLIENT_SECRET", "test-client-secret")
    monkeypatch.setenv("GRAPH_TENANT_ID", "test-tenant-id")
    monkeypatch.setenv("TARGET_MAILBOX", "triage-test@example.com")
    monkeypatch.setenv("WEBHOOK_CLIENT_STATE", "test-secret-state")

    cfg = TriageConfig(
        client_id="test-client-id",
        client_secret="test-client-secret",
        tenant_id="test-tenant-id",
        target_mailbox="triage-test@example.com",
        repository_storage_path=store_file,
        attachment_storage_dir=att_dir,
        task_always_eager=True,
        webhook_client_state="test-secret-state",
    )
    repo = EmailRepository(config=cfg, persist_to_disk=False)
    repo.clear()
    return repo


@pytest.fixture
def mock_auth_transport() -> httpx.MockTransport:
    """Mocks Microsoft Entra OAuth2 token endpoint response."""

    def handler(request: httpx.Request) -> httpx.Response:
        if "oauth2/v2.0/token" in str(request.url):
            return httpx.Response(
                200,
                json={
                    "token_type": "Bearer",
                    "expires_in": 3599,
                    "access_token": "mock-test-access-token-xyz123",
                },
            )
        return httpx.Response(404)

    return httpx.MockTransport(handler)
