"""Email and sync state repository with in-memory and persistent file/DB support."""
from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Any

from email_triage.config import TriageConfig, get_config
from email_triage.models.schemas import (
    EmailCategory,
    EmailRecord,
    Priority,
    ProcessingStatus,
    SyncStateRecord,
    WebhookSubscriptionRecord,
)
from email_triage.utils.logger import get_logger

log = get_logger(__name__)


class EmailRepository:
    """Thread-safe repository for persisting and querying emails, sync state, and webhooks."""

    # Shared in-memory state across repository instances within the same process
    _SHARED_LOCK = threading.Lock()
    _SHARED_EMAILS: dict[str, EmailRecord] = {}
    _SHARED_GRAPH_ID_INDEX: dict[str, str] = {}
    _SHARED_INTERNET_ID_INDEX: dict[str, str] = {}
    _SHARED_SYNC_STATES: dict[str, SyncStateRecord] = {}
    _SHARED_SUBSCRIPTIONS: dict[str, WebhookSubscriptionRecord] = {}

    def __init__(self, config: TriageConfig | None = None, persist_to_disk: bool = True) -> None:
        self.config = config or get_config()
        self.persist_to_disk = persist_to_disk
        self.storage_file = Path(self.config.repository_storage_path)

        if self.persist_to_disk and self.storage_file.exists():
            self._load_from_disk()

    def _load_from_disk(self) -> None:
        with self._SHARED_LOCK:
            try:
                data = json.loads(self.storage_file.read_text(encoding="utf-8"))
                self._SHARED_EMAILS.clear()
                self._SHARED_GRAPH_ID_INDEX.clear()
                self._SHARED_INTERNET_ID_INDEX.clear()
                self._SHARED_SYNC_STATES.clear()
                self._SHARED_SUBSCRIPTIONS.clear()
                has_duplicates = False
                for email_data in data.get("emails", []):
                    rec = EmailRecord.from_dict(email_data)
                    # Check for duplicates on disk by graph_message_id or internet_message_id
                    existing_id = None
                    if rec.graph_message_id and rec.graph_message_id in self._SHARED_GRAPH_ID_INDEX:
                        existing_id = self._SHARED_GRAPH_ID_INDEX[rec.graph_message_id]
                    elif rec.internet_message_id and rec.internet_message_id in self._SHARED_INTERNET_ID_INDEX:
                        existing_id = self._SHARED_INTERNET_ID_INDEX[rec.internet_message_id]

                    if existing_id:
                        has_duplicates = True
                        log.info("Pruned duplicate email '%s' (id=%s) matching existing id=%s", rec.subject, rec.internal_id, existing_id)
                        continue

                    self._SHARED_EMAILS[rec.internal_id] = rec
                    if rec.graph_message_id:
                        self._SHARED_GRAPH_ID_INDEX[rec.graph_message_id] = rec.internal_id
                    if rec.internet_message_id:
                        self._SHARED_INTERNET_ID_INDEX[rec.internet_message_id] = rec.internal_id
                for s_data in data.get("sync_states", []):
                    self._SHARED_SYNC_STATES[s_data["mailbox"]] = SyncStateRecord(**s_data)
                for sub_data in data.get("subscriptions", []):
                    self._SHARED_SUBSCRIPTIONS[sub_data["subscription_id"]] = WebhookSubscriptionRecord(**sub_data)
                log.info("Loaded repository from disk: %s emails", len(self._SHARED_EMAILS))
                if has_duplicates:
                    self._flush_to_disk()
            except Exception as exc:
                log.warning("Failed to load repository from disk (%s), starting fresh", type(exc).__name__)

    def _flush_to_disk(self) -> None:
        if not self.persist_to_disk:
            return
        try:
            self.storage_file.parent.mkdir(parents=True, exist_ok=True)
            snapshot = {
                "emails": [e.to_dict() for e in self._SHARED_EMAILS.values()],
                "sync_states": [s.to_dict() for s in self._SHARED_SYNC_STATES.values()],
                "subscriptions": [sub.to_dict() for sub in self._SHARED_SUBSCRIPTIONS.values()],
            }
            tmp_file = self.storage_file.with_suffix(".tmp")
            tmp_file.write_text(json.dumps(snapshot, indent=2), encoding="utf-8")
            tmp_file.replace(self.storage_file)
        except Exception as exc:
            log.error("Failed to flush repository snapshot to disk: %s", type(exc).__name__)

    # --- Email Operations ---
    def save_email(self, email: EmailRecord) -> EmailRecord:
        with self._SHARED_LOCK:
            # Check for existing duplicate by graph_message_id or internet_message_id
            existing_internal_id = None
            if email.graph_message_id and email.graph_message_id in self._SHARED_GRAPH_ID_INDEX:
                existing_internal_id = self._SHARED_GRAPH_ID_INDEX[email.graph_message_id]
            elif email.internet_message_id and email.internet_message_id in self._SHARED_INTERNET_ID_INDEX:
                existing_internal_id = self._SHARED_INTERNET_ID_INDEX[email.internet_message_id]

            if existing_internal_id and existing_internal_id != email.internal_id:
                # Reuse existing internal_id so we update in-place instead of creating a duplicate
                email.internal_id = existing_internal_id

            self._SHARED_EMAILS[email.internal_id] = email
            if email.graph_message_id:
                self._SHARED_GRAPH_ID_INDEX[email.graph_message_id] = email.internal_id
            if email.internet_message_id:
                self._SHARED_INTERNET_ID_INDEX[email.internet_message_id] = email.internal_id
        self._flush_to_disk()
        return email

    def get_email(self, internal_id: str) -> EmailRecord | None:
        with self._SHARED_LOCK:
            return self._SHARED_EMAILS.get(internal_id)

    def get_by_graph_id(self, graph_message_id: str) -> EmailRecord | None:
        with self._SHARED_LOCK:
            internal_id = self._SHARED_GRAPH_ID_INDEX.get(graph_message_id)
            if internal_id:
                return self._SHARED_EMAILS.get(internal_id)
            return None

    def get_by_internet_message_id(self, internet_message_id: str) -> EmailRecord | None:
        with self._SHARED_LOCK:
            internal_id = self._SHARED_INTERNET_ID_INDEX.get(internet_message_id)
            if internal_id:
                return self._SHARED_EMAILS.get(internal_id)
            return None

    def list_emails(
        self,
        category: EmailCategory | str | None = None,
        priority: Priority | str | None = None,
        status: ProcessingStatus | str | None = None,
        has_attachments: bool | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[EmailRecord]:
        with self._SHARED_LOCK:
            results = list(self._SHARED_EMAILS.values())

            if category:
                cat_val = category.value if isinstance(category, EmailCategory) else category
                results = [e for e in results if e.triage.category.value == cat_val]
            if priority:
                prio_val = priority.value if isinstance(priority, Priority) else priority
                results = [e for e in results if e.triage.priority.value == prio_val]
            if status:
                stat_val = status.value if isinstance(status, ProcessingStatus) else status
                results = [e for e in results if e.processing_status.value == stat_val]
            if has_attachments is not None:
                results = [e for e in results if e.has_attachments == has_attachments]

            # Order by received_at descending
            results.sort(key=lambda e: e.received_at or e.created_at, reverse=True)
            return results[offset : offset + limit]

    def count_emails(self) -> int:
        with self._SHARED_LOCK:
            return len(self._SHARED_EMAILS)

    # --- Sync State Operations ---
    def get_sync_state(self, mailbox: str) -> SyncStateRecord:
        with self._SHARED_LOCK:
            if mailbox not in self._SHARED_SYNC_STATES:
                self._SHARED_SYNC_STATES[mailbox] = SyncStateRecord(mailbox=mailbox)
            return self._SHARED_SYNC_STATES[mailbox]

    def save_sync_state(self, state: SyncStateRecord) -> None:
        with self._SHARED_LOCK:
            self._SHARED_SYNC_STATES[state.mailbox] = state
        self._flush_to_disk()

    # --- Webhook Subscriptions ---
    def save_subscription(self, sub: WebhookSubscriptionRecord) -> None:
        with self._SHARED_LOCK:
            self._SHARED_SUBSCRIPTIONS[sub.subscription_id] = sub
        self._flush_to_disk()

    def get_subscription(self, sub_id: str) -> WebhookSubscriptionRecord | None:
        with self._SHARED_LOCK:
            return self._SHARED_SUBSCRIPTIONS.get(sub_id)

    def list_subscriptions(self) -> list[WebhookSubscriptionRecord]:
        with self._SHARED_LOCK:
            return list(self._SHARED_SUBSCRIPTIONS.values())

    def clear(self) -> None:
        """Clears all in-memory data (used in test setups)."""
        with self._SHARED_LOCK:
            self._SHARED_EMAILS.clear()
            self._SHARED_GRAPH_ID_INDEX.clear()
            self._SHARED_SYNC_STATES.clear()
            self._SHARED_SUBSCRIPTIONS.clear()
