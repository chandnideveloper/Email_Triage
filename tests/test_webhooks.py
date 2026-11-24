"""Unit tests for Webhooks validation and event handling."""
from __future__ import annotations

import pytest

from email_triage.config import TriageConfig
from email_triage.webhooks.handler import WebhookHandler
from email_triage.webhooks.validators import (
    WebhookValidationError,
    validate_handshake_token,
    validate_notification_payload,
)


def test_validate_handshake_token():
    token = "SecretHandshakeToken12345"
    assert validate_handshake_token(token) == token

    with pytest.raises(WebhookValidationError):
        validate_handshake_token("")

    with pytest.raises(WebhookValidationError):
        validate_handshake_token(None)


def test_validate_notification_payload_valid():
    payload = {
        "value": [
            {
                "subscriptionId": "sub-101",
                "clientState": "test-secret-state",
                "changeType": "created",
                "resource": "Users/triage@example.com/Messages/msg-001",
                "resourceData": {"id": "msg-001"},
            }
        ]
    }
    items = validate_notification_payload(payload, expected_client_state="test-secret-state")
    assert len(items) == 1
    assert items[0]["subscriptionId"] == "sub-101"


def test_validate_notification_payload_client_state_mismatch():
    payload = {
        "value": [
            {
                "subscriptionId": "sub-101",
                "clientState": "wrong-state",
                "changeType": "created",
                "resource": "Users/triage@example.com/Messages/msg-001",
            }
        ]
    }
    with pytest.raises(WebhookValidationError) as exc:
        validate_notification_payload(payload, expected_client_state="test-secret-state")
    assert "clientState mismatch" in str(exc.value)


def test_webhook_handler_deduplication():
    cfg = TriageConfig(webhook_client_state="test-secret-state")
    handler = WebhookHandler(config=cfg)

    payload = {
        "value": [
            {
                "subscriptionId": "sub-001",
                "clientState": "test-secret-state",
                "changeType": "created",
                "resource": "Users/triage@example.com/Messages/msg-dup-10",
                "resourceData": {"id": "msg-dup-10"},
            }
        ]
    }

    # First dispatch
    res1 = handler.handle_notification_payload(payload, client_state="test-secret-state")
    assert "msg-dup-10" in res1["scheduled_message_ids"]
    assert res1["skipped_count"] == 0

    # Second duplicate dispatch
    res2 = handler.handle_notification_payload(payload, client_state="test-secret-state")
    assert "msg-dup-10" not in res2["scheduled_message_ids"]
    assert res2["skipped_count"] == 1
