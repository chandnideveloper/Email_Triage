"""Lifecycle management for Microsoft Graph webhook subscriptions."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from email_triage.config import TriageConfig, get_config
from email_triage.graph_client.client import GraphClient, GraphError
from email_triage.models.schemas import WebhookSubscriptionRecord
from email_triage.storage.email_repository import EmailRepository
from email_triage.utils.logger import get_logger

log = get_logger(__name__)


class SubscriptionManager:
    """Creates, inspects, renews, and deletes Microsoft Graph webhook subscriptions."""

    def __init__(
        self,
        client: GraphClient,
        repository: EmailRepository | None = None,
        config: TriageConfig | None = None,
    ) -> None:
        self.client = client
        self.repository = repository or EmailRepository()
        self.config = config or get_config()

    def create_mail_subscription(
        self,
        mailbox: str | None = None,
        notification_url: str | None = None,
        minutes: int | None = None,
        client_state: str | None = None,
    ) -> WebhookSubscriptionRecord:
        """Registers a new webhook subscription with Microsoft Graph for inbox message events."""
        target_mailbox = (mailbox or self.config.target_mailbox).strip()
        callback_url = (notification_url or self.config.webhook_notification_url).strip()
        state = (client_state or self.config.webhook_client_state).strip()
        duration_minutes = min(minutes or self.config.webhook_subscription_minutes, 4230)  # max ~3 days

        if not callback_url:
            raise ValueError("webhook_notification_url is not configured.")

        # Expiration timestamp in ISO-8601 UTC
        expiration = (datetime.now(UTC) + timedelta(minutes=duration_minutes)).strftime("%Y-%m-%dT%H:%M:%SZ")

        payload = {
            "changeType": "created,updated",
            "notificationUrl": callback_url,
            "resource": f"/users/{target_mailbox}/mailFolders('inbox')/messages",
            "expirationDateTime": expiration,
            "clientState": state,
        }

        log.info("Creating Graph webhook subscription for mailbox=%s url=%s", target_mailbox, callback_url)
        resp = self.client.request("POST", "/subscriptions", json_data=payload)

        sub_id = resp.get("id", "")
        record = WebhookSubscriptionRecord(
            subscription_id=sub_id,
            resource=resp.get("resource", payload["resource"]),
            notification_url=callback_url,
            expiration_datetime=resp.get("expirationDateTime", expiration),
            client_state=state,
            status="ACTIVE",
        )
        self.repository.save_subscription(record)
        log.info("Registered webhook subscription id=%s expires=%s", sub_id, record.expiration_datetime)
        return record

    def renew_subscription(self, subscription_id: str, minutes: int = 4200) -> WebhookSubscriptionRecord:
        """Extends the expiration time of an existing subscription."""
        expiration = (datetime.now(UTC) + timedelta(minutes=minutes)).strftime("%Y-%m-%dT%H:%M:%SZ")
        payload = {"expirationDateTime": expiration}

        log.info("Renewing subscription id=%s until %s", subscription_id, expiration)
        resp = self.client.request("PATCH", f"/subscriptions/{subscription_id}", json_data=payload)

        record = self.repository.get_subscription(subscription_id)
        if record:
            record.expiration_datetime = resp.get("expirationDateTime", expiration)
            record.status = "ACTIVE"
            self.repository.save_subscription(record)
        else:
            record = WebhookSubscriptionRecord(
                subscription_id=subscription_id,
                resource=resp.get("resource", ""),
                notification_url="",
                expiration_datetime=expiration,
                client_state="",
            )
            self.repository.save_subscription(record)
        return record

    def delete_subscription(self, subscription_id: str) -> bool:
        """Deletes a webhook subscription from Microsoft Graph."""
        log.info("Deleting webhook subscription id=%s", subscription_id)
        try:
            self.client.request("DELETE", f"/subscriptions/{subscription_id}")
            record = self.repository.get_subscription(subscription_id)
            if record:
                record.status = "DELETED"
                self.repository.save_subscription(record)
            return True
        except GraphError as exc:
            log.warning("Failed to delete subscription id=%s: %s", subscription_id, exc)
            return False
