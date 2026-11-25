"""Email fetcher handling query filters, pagination, and deduplication."""
from __future__ import annotations

from typing import Any

from email_triage.config import TriageConfig, get_config
from email_triage.graph_client.email_service import EmailService
from email_triage.ingestion.email_parser import EmailParser
from email_triage.models.schemas import EmailRecord
from email_triage.storage.email_repository import EmailRepository
from email_triage.utils.logger import get_logger

log = get_logger(__name__)


class EmailFetcher:
    """Retrieves and paginates emails from Microsoft Graph according to business criteria."""

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

    def build_filter_query(
        self,
        unread_only: bool = False,
        since_date: str | None = None,
        sender_email: str | None = None,
    ) -> str:
        """Constructs an OData filter expression for Microsoft Graph."""
        conditions: list[str] = []
        if unread_only:
            conditions.append("isRead eq false")
        if since_date:
            conditions.append(f"receivedDateTime ge {since_date}")
        if sender_email:
            conditions.append(f"from/emailAddress/address eq '{sender_email.strip().lower()}'")
        return " and ".join(conditions)

    def fetch_emails(
        self,
        mailbox: str | None = None,
        max_emails: int = 50,
        unread_only: bool = False,
        since_date: str | None = None,
        sender_email: str | None = None,
        folder_id: str = "inbox",
    ) -> list[EmailRecord]:
        """Fetches and parses emails with pagination support, skipping existing records."""
        target_mailbox = (mailbox or self.config.target_mailbox).strip()
        filter_query = self.build_filter_query(unread_only, since_date, sender_email)

        log.info("Fetching emails for mailbox=%s, max=%s, filter=%s", target_mailbox, max_emails, filter_query or "none")

        folders = [folder_id] if folder_id not in ("inbox", None) else ["inbox", "junkemail"]
        fetched_records: list[EmailRecord] = []

        for f_id in folders:
            remaining = max_emails - len(fetched_records)
            if remaining <= 0:
                break

            initial_resp = self.email_service.list_messages(
                mailbox=target_mailbox,
                top=min(remaining, 50),
                filter_query=filter_query if filter_query else None,
                folder_id=f_id,
            )

            for page in self.email_service.traverse_pages(initial_resp, max_pages=10):
                for raw_msg in page:
                    graph_id = raw_msg.get("id")
                    # Deduplication check
                    if graph_id and self.repository.get_by_graph_id(graph_id):
                        log.debug("Skipping already ingested message graph_id=%s", graph_id)
                        continue

                    record = self.parser.parse_graph_message(raw_msg)
                    self.repository.save_email(record)
                    fetched_records.append(record)

                    if len(fetched_records) >= max_emails:
                        log.info("Finished fetching. Collected %s new emails.", len(fetched_records))
                        return fetched_records

        log.info("Finished fetching. Collected %s new emails.", len(fetched_records))
        return fetched_records
