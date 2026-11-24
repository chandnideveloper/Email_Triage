"""Webhook notification event handler and background dispatch."""
from __future__ import annotations

import re
import threading
from typing import Any

from email_triage.config import TriageConfig, get_config
from email_triage.utils.logger import get_logger
from email_triage.webhooks.validators import validate_notification_payload

log = get_logger(__name__)

# Cache processed notification event IDs to prevent duplicate handling
_PROCESSED_EVENTS_LOCK = threading.Lock()
_PROCESSED_EVENTS: set[str] = set()


class WebhookHandler:
    """Processes validated Graph webhook notifications and schedules email ingestion."""

    def __init__(self, config: TriageConfig | None = None) -> None:
        self.config = config or get_config()

    @staticmethod
    def extract_message_id_from_resource(resource: str) -> str | None:
        """Extracts the Microsoft Graph message ID from resource string (e.g. Users/.../Messages/AAMk...)."""
        match = re.search(r"Messages/([^/?]+)", resource, re.IGNORECASE)
        if match:
            return match.group(1)
        match_bracket = re.search(r"Messages\('([^']+)'\)", resource, re.IGNORECASE)
        if match_bracket:
            return match_bracket.group(1)
        return None

    def handle_notification_payload(
        self,
        payload: dict[str, Any],
        client_state: str | None = None,
    ) -> dict[str, Any]:
        """Validates notification payload, filters duplicates, and extracts message IDs for ingestion."""
        expected_state = client_state if client_state is not None else self.config.webhook_client_state
        valid_items = validate_notification_payload(payload, expected_client_state=expected_state)

        scheduled_messages: list[str] = []
        skipped_count = 0

        for item in valid_items:
            resource = item.get("resource", "")
            resource_data = item.get("resourceData", {})
            msg_id = resource_data.get("id") or self.extract_message_id_from_resource(resource)

            if not msg_id:
                log.warning("Could not extract message ID from notification resource=%s", resource)
                continue

            event_key = f"{item.get('subscriptionId', '')}:{msg_id}:{item.get('changeType', '')}"

            with _PROCESSED_EVENTS_LOCK:
                if event_key in _PROCESSED_EVENTS:
                    log.debug("Skipping duplicate notification for event_key=%s", event_key)
                    skipped_count += 1
                    continue
                _PROCESSED_EVENTS.add(event_key)
                if len(_PROCESSED_EVENTS) > 10000:
                    _PROCESSED_EVENTS.clear()

            scheduled_messages.append(msg_id)

        log.info(
            "Webhook notifications processed: %s scheduled, %s skipped",
            len(scheduled_messages),
            skipped_count,
        )

        return {
            "status": "ACCEPTED",
            "scheduled_message_ids": scheduled_messages,
            "skipped_count": skipped_count,
        }
