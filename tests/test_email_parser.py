"""Unit tests for Email Parser."""
from __future__ import annotations

from email_triage.ingestion.email_parser import EmailParser, clean_html_to_plain_text
from email_triage.models.schemas import ProcessingStatus


def test_clean_html_to_plain_text():
    html_raw = """
    <html>
      <head><style>.title { color: red; }</style></head>
      <body>
        <p>Dear <b>John</b>,</p>
        <div>Please review the attached BAS statement.<br>Thanks &amp; Regards.</div>
      </body>
    </html>
    """
    cleaned = clean_html_to_plain_text(html_raw)
    assert "Dear John," in cleaned
    assert "Please review the attached BAS statement." in cleaned
    assert "Thanks & Regards." in cleaned
    assert "<style>" not in cleaned
    assert "<p>" not in cleaned


def test_parse_graph_message_success():
    raw_graph_msg = {
        "id": "AAMkAGI2AAAt1234=",
        "internetMessageId": "<abc-123@client.com.au>",
        "conversationId": "AAQkAGI2AAA=",
        "subject": "Urgent: 2026 BAS Review Required",
        "receivedDateTime": "2026-11-20T10:15:30Z",
        "from": {
            "emailAddress": {"name": "Alice Smith", "address": "alice@acme.com.au"}
        },
        "toRecipients": [
            {"emailAddress": {"name": "Triage Inbox", "address": "triage@practice.com.au"}}
        ],
        "ccRecipients": [
            {"emailAddress": {"name": "Bob Partner", "address": "bob@practice.com.au"}}
        ],
        "body": {
            "contentType": "html",
            "content": "<p>Please sign and return the invoice for $4,500.00 by 25 November.</p>",
        },
        "isRead": False,
        "hasAttachments": True,
        "attachments": [
            {
                "id": "att-999",
                "name": "BAS_Q1_2026.pdf",
                "contentType": "application/pdf",
                "size": 125000,
                "isInline": False,
            }
        ],
    }

    record = EmailParser.parse_graph_message(raw_graph_msg)
    assert record.graph_message_id == "AAMkAGI2AAAt1234="
    assert record.internet_message_id == "<abc-123@client.com.au>"
    assert record.sender_name == "Alice Smith"
    assert record.sender_email == "alice@acme.com.au"
    assert len(record.recipients) == 1
    assert record.recipients[0]["email"] == "triage@practice.com.au"
    assert len(record.cc) == 1
    assert record.subject == "Urgent: 2026 BAS Review Required"
    assert "Please sign and return the invoice" in record.body_plain
    assert record.has_attachments is True
    assert len(record.attachments) == 1
    assert record.attachments[0].filename == "BAS_Q1_2026.pdf"
    assert record.processing_status == ProcessingStatus.INGESTED


def test_parse_graph_message_missing_optional_fields():
    minimal_msg = {
        "id": "msg-min-001",
        "subject": None,
        "body": {"contentType": "text", "content": "Quick question regarding tax."},
    }
    record = EmailParser.parse_graph_message(minimal_msg)
    assert record.graph_message_id == "msg-min-001"
    assert record.subject == "No Subject"
    assert record.sender_email == ""
    assert record.body_plain == "Quick question regarding tax."
    assert record.has_attachments is False
