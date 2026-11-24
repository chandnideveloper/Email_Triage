"""Attachment service interacting with Microsoft Graph Attachment API endpoints."""
from __future__ import annotations

import base64
from typing import Any

from email_triage.graph_client.client import GraphClient
from email_triage.utils.logger import get_logger

log = get_logger(__name__)


class AttachmentService:
    """Service wrapping Outlook message attachment operations via Graph API."""

    def __init__(self, client: GraphClient) -> None:
        self.client = client

    def list_attachments(self, mailbox: str, message_id: str) -> list[dict[str, Any]]:
        """Lists metadata of all attachments for a message."""
        endpoint = f"/users/{mailbox}/messages/{message_id}/attachments"
        params = {
            "$select": "id,name,contentType,size,isInline,lastModifiedDateTime"
        }
        resp = self.client.request("GET", endpoint, params=params)
        return resp.get("value", [])

    def get_attachment(self, mailbox: str, message_id: str, attachment_id: str) -> dict[str, Any]:
        """Fetches full attachment item including base64 contentBytes."""
        endpoint = f"/users/{mailbox}/messages/{message_id}/attachments/{attachment_id}"
        return self.client.request("GET", endpoint)

    def download_attachment_bytes(self, mailbox: str, message_id: str, attachment_id: str) -> tuple[str, bytes]:
        """Downloads attachment raw binary content, returning (filename, bytes)."""
        att = self.get_attachment(mailbox, message_id, attachment_id)
        filename = att.get("name", "attachment.bin")
        content_b64 = att.get("contentBytes", "")

        if not content_b64:
            log.warning("Attachment id=%s has no contentBytes (may be itemAttachment)", attachment_id)
            return filename, b""

        try:
            content = base64.b64decode(content_b64)
            return filename, content
        except Exception as exc:
            log.error("Failed to decode base64 for attachment id=%s: %s", attachment_id, type(exc).__name__)
            return filename, b""
