"""Executive summarizer and action recommender for triaged emails."""
from __future__ import annotations

import re
from typing import Protocol

from email_triage.models.schemas import EmailCategory, EmailRecord, Priority


class SummarizerProtocol(Protocol):
    """Protocol for pluggable summarization engines (extensible to LLM)."""

    def summarize(self, email: EmailRecord, category: EmailCategory, priority: Priority) -> tuple[str, list[str], str]:
        """Returns (short_summary, key_points, suggested_action)."""
        ...


class RuleBasedSummarizer:
    """Generates concise, factual summaries without fabricating unstated claims."""

    def summarize(self, email: EmailRecord, category: EmailCategory, priority: Priority) -> tuple[str, list[str], str]:
        sender = email.sender_name or email.sender_email or "Sender"
        subject = email.subject or "Untitled Message"
        plain_body = email.body_plain.strip()

        # Extract sentences from plain body
        sentences = [
            s.strip()
            for s in re.split(r"(?<=[.!?\n])\s+", plain_body)
            if len(s.strip()) > 3
        ]

        # 1. Short Summary - preserve real text without generic templates
        if plain_body:
            if len(plain_body) <= 150:
                summary = plain_body
            elif sentences:
                summary = sentences[0][:200]
            else:
                summary = plain_body[:200]
        else:
            summary = f"Message from {sender} regarding '{subject}'."

        # 2. Key Points
        key_points: list[str] = []
        if email.has_attachments:
            att_names = ", ".join(a.filename for a in email.attachments[:3]) or "files"
            key_points.append(f"Includes attachment(s): {att_names}")

        for s in sentences[1:4]:
            if len(s) < 150:
                key_points.append(s)

        if not key_points and sentences:
            key_points.append(sentences[0])

        # 3. Suggested Next Action
        if category == EmailCategory.URGENT:
            suggested_action = "Review immediately and respond to sender."
        elif category == EmailCategory.INVOICE_FINANCE:
            suggested_action = "Verify invoice details, check ABN and match with accounting records."
        elif category == EmailCategory.MEETING_SCHEDULING:
            suggested_action = "Check team availability and respond to calendar invitation."
        elif category == EmailCategory.ACTION_REQUIRED:
            suggested_action = "Complete the requested action or delegate to assigned staff."
        elif category == EmailCategory.TECHNICAL_ISSUE:
            suggested_action = "Log support ticket or troubleshoot reported error."
        elif category == EmailCategory.FOLLOW_UP_REQUIRED:
            suggested_action = "Provide requested status update to client."
        elif category == EmailCategory.SPAM_UNWANTED:
            suggested_action = "Mark as spam or ignore."
        else:
            suggested_action = "Read and file for reference."

        return summary, key_points[:4], suggested_action
