"""Parser converting Microsoft Graph JSON email payloads into standardized EmailRecord models."""
from __future__ import annotations

import html
import re
from typing import Any

from email_triage.models.schemas import AttachmentMetadata, EmailRecord, ProcessingStatus


def clean_html_to_plain_text(html_content: str) -> str:
    """Strips HTML tags, converts line breaks, and decodes HTML entities safely."""
    if not html_content:
        return ""

    # Remove script, style, and head blocks
    cleaned = re.sub(r"(?is)<(script|style|head)[^>]*>.*?</\1>", "", html_content)
    # Convert block tags and line breaks to newlines
    cleaned = re.sub(r"(?i)<(br|p|div|tr|li)[^>]*>", "\n", cleaned)
    # Remove inline formatting tags cleanly without adding spaces
    cleaned = re.sub(r"(?i)</?(b|i|u|strong|em|span|font|mark|small)[^>]*>", "", cleaned)
    # Strip remaining HTML tags
    cleaned = re.sub(r"<[^>]+>", " ", cleaned)
    # Unescape HTML entities (e.g. &amp;, &nbsp;)
    cleaned = html.unescape(cleaned)
    # Fix spaces before punctuation (e.g. "John ," -> "John,")
    cleaned = re.sub(r"\s+([,.:;!?])", r"\1", cleaned)
    # Normalize excessive spaces and lines
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in cleaned.split("\n")]
    cleaned = "\n".join(line for line in lines if line)
    return cleaned.strip()


class EmailParser:
    """Parses raw Microsoft Graph message payloads into structured EmailRecord objects."""

    @staticmethod
    def _parse_recipient(recipient_dict: dict[str, Any] | None) -> dict[str, str]:
        if not recipient_dict:
            return {"name": "", "email": ""}
        addr = recipient_dict.get("emailAddress", {})
        return {
            "name": str(addr.get("name", "")).strip(),
            "email": str(addr.get("address", "")).strip().lower(),
        }

    @classmethod
    def _parse_recipient_list(cls, recipients: list[dict[str, Any]] | None) -> list[dict[str, str]]:
        if not recipients or not isinstance(recipients, list):
            return []
        return [cls._parse_recipient(r) for r in recipients if r and r.get("emailAddress")]

    @classmethod
    def parse_graph_message(cls, data: dict[str, Any]) -> EmailRecord:
        """Parses a single Graph API message JSON object into an EmailRecord."""
        graph_id = str(data.get("id", ""))
        internet_id = str(data.get("internetMessageId", ""))
        conversation_id = str(data.get("conversationId", ""))
        subject = str(data.get("subject", "") or "No Subject").strip()
        received_at = str(data.get("receivedDateTime", "")).strip()

        # Sender resolution (prefer 'from' over 'sender')
        from_data = data.get("from") or data.get("sender")
        sender = cls._parse_recipient(from_data)

        # Recipients
        to_recipients = cls._parse_recipient_list(data.get("toRecipients"))
        cc_recipients = cls._parse_recipient_list(data.get("ccRecipients"))
        bcc_recipients = cls._parse_recipient_list(data.get("bccRecipients"))

        # Body parsing
        body_obj = data.get("body", {})
        body_content = str(body_obj.get("content", ""))
        body_type = str(body_obj.get("contentType", "text")).lower()

        if body_type == "html":
            body_html = body_content
            body_plain = clean_html_to_plain_text(body_content)
        else:
            body_plain = body_content
            body_html = ""

        # Fallback to bodyPreview if body was empty
        if not body_plain and data.get("bodyPreview"):
            body_plain = str(data.get("bodyPreview", "")).strip()

        is_read = bool(data.get("isRead", False))
        has_attachments = bool(data.get("hasAttachments", False))

        # Build attachment metadata stubs if attachments were returned in response
        attachments: list[AttachmentMetadata] = []
        raw_attachments = data.get("attachments", [])
        if isinstance(raw_attachments, list):
            for raw_att in raw_attachments:
                attachments.append(
                    AttachmentMetadata(
                        graph_attachment_id=str(raw_att.get("id", "")),
                        filename=str(raw_att.get("name", "attachment.bin")),
                        content_type=str(raw_att.get("contentType", "application/octet-stream")),
                        size_bytes=int(raw_att.get("size", 0)),
                        is_inline=bool(raw_att.get("isInline", False)),
                    )
                )

        return EmailRecord(
            graph_message_id=graph_id,
            internet_message_id=internet_id,
            conversation_id=conversation_id,
            sender_name=sender["name"],
            sender_email=sender["email"],
            recipients=to_recipients,
            cc=cc_recipients,
            bcc=bcc_recipients,
            subject=subject,
            body_plain=body_plain,
            body_html=body_html,
            received_at=received_at,
            is_read=is_read,
            has_attachments=has_attachments,
            attachments=attachments,
            processing_status=ProcessingStatus.INGESTED,
        )
