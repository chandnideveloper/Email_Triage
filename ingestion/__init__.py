"""Ingestion package."""
from .email_fetcher import EmailFetcher
from .email_parser import EmailParser, clean_html_to_plain_text
from .sync_service import SyncService

__all__ = ["EmailFetcher", "EmailParser", "SyncService", "clean_html_to_plain_text"]
