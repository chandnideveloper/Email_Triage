"""Priority determination engine for emails."""
from __future__ import annotations

import re
from datetime import UTC, datetime

from email_triage.models.schemas import EmailCategory, EmailRecord, Priority

CRITICAL_PATTERNS = re.compile(
    r"\b(urgent|immediately|emergency|critical|asap|within \d+ hours?|penalty|lawsuit|ato notice|court)\b",
    re.I,
)

HIGH_PATTERNS = re.compile(
    r"\b(action required|important|deadline|overdue|by tomorrow|by eod|sign today|high priority|approval needed)\b",
    re.I,
)

LOW_PATTERNS = re.compile(
    r"\b(newsletter|digest|webinar|promotional|no action required|fyi only|automated notification|noreply)\b",
    re.I,
)


class PriorityEngine:
    """Evaluates and assigns an actionable Priority (Critical, High, Medium, Low)."""

    def determine_priority(self, email: EmailRecord, category: EmailCategory | None = None) -> Priority:
        text = f"{email.subject} {email.body_plain}"
        assigned_cat = category or email.triage.category

        # Urgent category directly elevates to Critical or High
        if assigned_cat == EmailCategory.URGENT or CRITICAL_PATTERNS.search(text):
            return Priority.CRITICAL

        # High indicators: Action Required, High priority patterns, or Technical Issues
        if (
            assigned_cat in (EmailCategory.ACTION_REQUIRED, EmailCategory.TECHNICAL_ISSUE)
            or HIGH_PATTERNS.search(text)
            or (email.has_attachments and assigned_cat == EmailCategory.INVOICE_FINANCE)
        ):
            return Priority.HIGH

        # Low indicators: Spam, FYI, promotional or automated senders
        sender = (email.sender_email or "").lower()
        if (
            assigned_cat in (EmailCategory.SPAM_UNWANTED, EmailCategory.INFORMATION_FYI)
            or "noreply" in sender
            or "newsletter" in sender
            or LOW_PATTERNS.search(text)
        ):
            return Priority.LOW

        # Default standard business correspondence
        return Priority.MEDIUM
