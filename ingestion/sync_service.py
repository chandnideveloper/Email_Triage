"""Incremental synchronization service for Microsoft Graph mailbox changes."""
from __future__ import annotations

import os
import threading
from datetime import UTC, datetime
from typing import Any

from email_triage.config import TriageConfig, get_config
from email_triage.graph_client.email_service import EmailService
from email_triage.ingestion.email_parser import EmailParser
from email_triage.models.schemas import (
    EmailCategory,
    EmailRecord,
    Priority,
    ProcessingStatus,
    SyncStateRecord,
    TriageResult,
)
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

    def _async_process_and_triage(
        self, internal_id: str, graph_id: str, target_mailbox: str, raw_msg: dict[str, Any]
    ) -> None:
        """Background worker that downloads attachments, extracts text, and runs AI classification."""
        try:
            rec = self.repository.get_email(internal_id)
            if not rec:
                return

            has_att = rec.has_attachments or raw_msg.get("hasAttachments")
            if has_att:
                rec.has_attachments = True
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
                                email_internal_id=rec.internal_id,
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
                        from email_triage.ingestion.document_extractor import DocumentExtractor
                        extractor = DocumentExtractor()
                        for m in downloaded_list:
                            if m.storage_path and os.path.exists(m.storage_path):
                                try:
                                    txt = extractor.extract_text_from_file(m.storage_path)
                                    if txt:
                                        if not m.ibex_compatible_payload:
                                            m.ibex_compatible_payload = {}
                                        m.ibex_compatible_payload["extracted_text"] = txt
                                        log.info("Extracted %d chars from attachment %s", len(txt), m.filename)
                                except Exception as ex_err:
                                    log.warning("Could not extract text from %s: %s", m.filename, ex_err)
                        rec.attachments = downloaded_list
                        rec.has_attachments = True
                except Exception as att_err:
                    log.warning("Async attachment download error for %s: %s", graph_id, att_err)

            # Run Triage & AI Classification
            try:
                from email_triage.triage import TriageEngine
                triage_engine = TriageEngine()
                rec = triage_engine.triage_email(rec)
            except Exception as e:
                log.warning("Async triage error for %s: %s", graph_id, e)
                rec.processing_status = ProcessingStatus.FAILED

            self.repository.save_email(rec)
            log.info("Async triage completed for email %s -> status=%s", internal_id[:8], rec.processing_status.value)
        except Exception as exc:
            log.exception("Fatal async triage worker error for %s: %s", internal_id, exc)

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
                        if not existing and raw_msg.get("internetMessageId"):
                            existing = self.repository.get_by_internet_message_id(str(raw_msg.get("internetMessageId")))
                        record = self.parser.parse_graph_message(raw_msg)

                        if existing:
                            record.internal_id = existing.internal_id
                            record.triage = existing.triage
                            record.retry_count = existing.retry_count
                            record.attachments = existing.attachments or []
                            record.is_read = existing.is_read
                            record.processing_status = existing.processing_status

                            # If existing email is missing attachments that it has in Graph, enqueue async processing
                            if (record.has_attachments or raw_msg.get("hasAttachments")) and not record.attachments:
                                record.has_attachments = True
                                threading.Thread(
                                    target=self._async_process_and_triage,
                                    args=(record.internal_id, graph_id, target_mailbox, raw_msg),
                                    daemon=True,
                                    name=f"triage-{record.internal_id[:8]}",
                                ).start()

                            self.repository.save_email(record)
                            updated_count += 1
                        else:
                            # 1. Instantly save new email with PENDING status so it displays on frontend immediately!
                            record.processing_status = ProcessingStatus.PENDING
                            record.has_attachments = bool(raw_msg.get("hasAttachments", False))
                            record.triage = TriageResult(
                                category=EmailCategory.UNKNOWN_NEEDS_REVIEW,
                                priority=Priority.LOW,
                                confidence=0.0,
                                summary="AI Analysis in progress...",
                                key_points=["Email received. AI analysis in progress..."],
                                entities={},
                            )
                            self.repository.save_email(record)
                            synced_count += 1
                            log.info("Instantly ingested email %s from %s", record.internal_id[:8], record.sender_email)

                            # 2. Trigger asynchronous background processing (attachments + triage)
                            threading.Thread(
                                target=self._async_process_and_triage,
                                args=(record.internal_id, graph_id, target_mailbox, raw_msg),
                                daemon=True,
                                name=f"triage-{record.internal_id[:8]}",
                            ).start()

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
