"""Incremental synchronization service for Microsoft Graph mailbox changes."""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from email_triage.config import TriageConfig, get_config
from email_triage.graph_client.email_service import EmailService
from email_triage.ingestion.email_parser import EmailParser
from email_triage.models.schemas import SyncStateRecord
from email_triage.storage.email_repository import EmailRepository
from email_triage.utils.logger import get_logger

log = get_logger(__name__)


class SyncService:
    """Manages incremental mailbox synchronization using Graph Delta tokens or high-water marks."""

    def __init__(
        self,
        email_service: EmailService,
        repository: EmailRepository | None = None,
        config: TriageConfig | None = None,
    ) -> None:
        self.email_service = email_service
        self.repository = repository or EmailRepository()
        self.config = config or get_config()
        self.parser = EmailParser()

    def sync_mailbox(self, mailbox: str | None = None, folder_id: str = "inbox") -> dict[str, Any]:
        """Executes an incremental sync pass, updating deltaLink and collecting new/updated emails."""
        target_mailbox = (mailbox or self.config.target_mailbox).strip()
        state = self.repository.get_sync_state(target_mailbox)
        state.last_status = "SYNCING"
        self.repository.save_sync_state(state)

        log.info("Starting sync for mailbox=%s with delta_link=%s", target_mailbox, "YES" if state.delta_link else "INITIAL")

        synced_count = 0
        updated_count = 0
        error_code = ""

        try:
            delta_resp = self.email_service.get_delta_messages(
                mailbox=target_mailbox,
                delta_link_or_token=state.delta_link if state.delta_link else None,
                folder_id=folder_id,
            )

            new_delta_link = ""
            for page in self.email_service.traverse_pages(delta_resp, max_pages=20):
                for raw_msg in page:
                    graph_id = raw_msg.get("id")
                    if not graph_id:
                        continue

                    # Check if message is a tombstone (deleted in Graph)
                    if "@removed" in raw_msg:
                        log.debug("Message %s was removed in Graph", graph_id)
                        continue

                    existing = self.repository.get_by_graph_id(graph_id)
                    record = self.parser.parse_graph_message(raw_msg)

                    if existing:
                        # Retain internal_id and prior triage result on update
                        record.internal_id = existing.internal_id
                        record.triage = existing.triage
                        record.retry_count = existing.retry_count
                        self.repository.save_email(record)
                        updated_count += 1
                    else:
                        self.repository.save_email(record)
                        synced_count += 1

                # Capture final deltaLink from response if present
                if "@odata.deltaLink" in delta_resp:
                    new_delta_link = delta_resp["@odata.deltaLink"]

            # Update sync state
            state.delta_link = new_delta_link or state.delta_link
            state.last_sync_time = datetime.now(UTC).isoformat()
            state.emails_synced_total += synced_count
            state.last_status = "COMPLETED"
            state.error_code = ""
            self.repository.save_sync_state(state)

            log.info("Sync completed: %s new, %s updated. Total: %s", synced_count, updated_count, state.emails_synced_total)
            return {
                "status": "COMPLETED",
                "synced_count": synced_count,
                "updated_count": updated_count,
                "mailbox": target_mailbox,
                "delta_link_updated": bool(new_delta_link),
            }

        except Exception as exc:
            log.error("Sync failed for mailbox=%s: %s", target_mailbox, type(exc).__name__)
            state.last_status = "FAILED"
            state.error_code = type(exc).__name__
            self.repository.save_sync_state(state)
            return {
                "status": "FAILED",
                "error": type(exc).__name__,
                "synced_count": synced_count,
                "updated_count": updated_count,
                "mailbox": target_mailbox,
            }
