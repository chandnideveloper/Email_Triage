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

    def sync_mailbox(self, mailbox: str | None = None, folder_id: list[str] | str | None = None) -> dict[str, Any]:
        """Executes an incremental sync pass across folders (defaulting to Inbox and Junk Email),
        updating deltaLinks, downloading attachments, and collecting new/updated emails.
        """
        target_mailbox = (mailbox or self.config.target_mailbox).strip()
        state = self.repository.get_sync_state(target_mailbox)
        state.last_status = "SYNCING"
        self.repository.save_sync_state(state)

        folders = [folder_id] if isinstance(folder_id, str) else (folder_id or ["inbox", "junkemail"])
        log.info("Starting sync for mailbox=%s on folders=%s", target_mailbox, folders)

        synced_count = 0
        updated_count = 0
        error_code = ""

        try:
            for folder_name in folders:
                folder_state_key = f"{target_mailbox}:{folder_name}"
                folder_state = self.repository.get_sync_state(folder_state_key)
                delta_token = folder_state.delta_link if folder_state.delta_link else None

                log.info("Syncing folder %s with delta_link=%s", folder_name, "YES" if delta_token else "INITIAL")
                delta_resp = self.email_service.get_delta_messages(
                    mailbox=target_mailbox,
                    delta_link_or_token=delta_token,
                    folder_id=folder_name,
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
                            record.internal_id = existing.internal_id
                            record.triage = existing.triage
                            record.retry_count = existing.retry_count
                            self.repository.save_email(record)
                            updated_count += 1
                        else:
                            # Download attachments if message contains attachments
                            if record.has_attachments or raw_msg.get("hasAttachments"):
                                try:
                                    from email_triage.graph_client.attachment_service import AttachmentService
                                    from email_triage.storage.attachment_storage import AttachmentStorage, AttachmentValidationError

                                    att_svc = AttachmentService(self.email_service.client)
                                    att_storage = AttachmentStorage(config=self.config)
                                    attachments_meta = att_svc.list_attachments(target_mailbox, graph_id)
                                    downloaded_list = []
                                    for att_info in attachments_meta:
                                        att_id = att_info.get("id")
                                        if not att_id:
                                            continue
                                        fname, content = att_svc.download_attachment_bytes(target_mailbox, graph_id, att_id)
                                        if not content:
                                            continue
                                        try:
                                            meta = att_storage.store_attachment(
                                                email_internal_id=record.internal_id,
                                                graph_attachment_id=att_id,
                                                filename=fname,
                                                content=content,
                                                content_type=att_info.get("contentType", "application/octet-stream"),
                                                is_inline=bool(att_info.get("isInline", False)),
                                            )
                                            downloaded_list.append(meta)
                                        except AttachmentValidationError as ve:
                                            log.warning("Skipped attachment %s: %s", fname, ve)
                                    if downloaded_list:
                                        record.attachments = downloaded_list
                                        record.has_attachments = True
                                except Exception as att_err:
                                    log.warning("Attachment download error for %s: %s", graph_id, att_err)

                            try:
                                from email_triage.triage import TriageEngine
                                triage_engine = TriageEngine()
                                record = triage_engine.triage_email(record)
                            except Exception as e:
                                log.warning("Auto-triage error for %s: %s", graph_id, e)
                            self.repository.save_email(record)
                            synced_count += 1

                    if "@odata.deltaLink" in delta_resp:
                        new_delta_link = delta_resp["@odata.deltaLink"]

                # Update folder-specific delta link
                folder_state.delta_link = new_delta_link or folder_state.delta_link
                folder_state.last_sync_time = datetime.now(UTC).isoformat()
                folder_state.emails_synced_total += synced_count
                folder_state.last_status = "COMPLETED"
                folder_state.error_code = ""
                self.repository.save_sync_state(folder_state)

            # Update overall sync state
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
                "folders": folders,
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
