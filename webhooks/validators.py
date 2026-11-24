"""Validators for Microsoft Graph webhook handshakes and notification payloads."""
from __future__ import annotations

from typing import Any

from email_triage.utils.logger import get_logger

log = get_logger(__name__)


class WebhookValidationError(Exception):
    """Raised when a webhook payload fails security or schema verification."""


def validate_handshake_token(validation_token: str | None) -> str:
    """Validates the validationToken query parameter provided by Microsoft during subscription creation.

    Microsoft Graph sends a GET (or POST) with a plain text validationToken query param that must
    be echoed back in plain text with HTTP 200 within 10 seconds.
    """
    if not validation_token or not validation_token.strip():
        raise WebhookValidationError("validationToken query parameter is missing or empty.")
    # Token should be URL-decoded and safe
    return validation_token.strip()


def validate_notification_payload(
    payload: dict[str, Any],
    expected_client_state: str | None = None,
) -> list[dict[str, Any]]:
    """Validates incoming Microsoft Graph notification payload structure and clientState secret.

    Returns the list of valid notification item dictionaries.
    """
    if not isinstance(payload, dict):
        raise WebhookValidationError("Webhook payload must be a JSON object.")

    items = payload.get("value")
    if not isinstance(items, list) or not items:
        raise WebhookValidationError("Webhook payload missing 'value' array.")

    valid_items: list[dict[str, Any]] = []

    for item in items:
        if not isinstance(item, dict):
            continue

        # Check clientState secret if configured
        if expected_client_state:
            incoming_state = item.get("clientState")
            if incoming_state != expected_client_state:
                log.warning("Webhook notification rejected due to clientState mismatch")
                raise WebhookValidationError("clientState mismatch; notification source untrusted.")

        resource = item.get("resource")
        change_type = item.get("changeType")
        if not resource or not change_type:
            log.warning("Webhook notification item missing resource or changeType")
            continue

        valid_items.append(item)

    if not valid_items:
        raise WebhookValidationError("No valid notification items found in payload.")

    return valid_items
