"""Categorizer and entity extractor identifying dates, deadlines, amounts, and action signals."""
from __future__ import annotations

import re
from typing import Any

from email_triage.models.schemas import EmailCategory, EmailRecord, Priority

DATE_PATTERNS = [
    re.compile(r"\b(?:due|deadline|by|before)\s+(?:on\s+)?(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:\s+\d{2,4})?)", re.I),
    re.compile(r"\b(?:due|deadline|by)\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b", re.I),
    re.compile(r"\b(\d{4}-\d{2}-\d{2})\b"),
]

CURRENCY_PATTERN = re.compile(r"(?:\$|AUD\s?)\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)", re.I)
COMPANY_SUFFIX_PATTERN = re.compile(r"\b([A-Z][A-Za-z0-9&'\s]{2,30}\s+(?:Pty(?:\s+Ltd)?|Ltd|Holdings|Trust|Partners|Services|Group))\b")

RESPONSE_SIGNALS = re.compile(r"\b(please let (?:us|me) know|can you confirm|could you reply|please respond|awaiting your response|what do you think)\b", re.I)
ACTION_SIGNALS = re.compile(
    r"\b(please review|please sign|please find attached|action required|approval needed|"
    r"submit the|file the|please remit|please pay|remittance|payment required|action needed|at once)\b",
    re.I,
)
FOLLOWUP_SIGNALS = re.compile(r"\b(follow[- ]up|checking in|status update|have you had a chance|touching base)\b", re.I)


class Categorizer:
    """Extracts business entities and behavioral triggers from email text."""

    @staticmethod
    def extract_due_date(text: str) -> str | None:
        """Finds explicitly mentioned deadlines or due dates in the text."""
        for pattern in DATE_PATTERNS:
            match = pattern.search(text)
            if match:
                return match.group(1).strip()
        return None

    @staticmethod
    def extract_amounts(text: str) -> list[str]:
        """Finds currency figures mentioned in the email."""
        return [f"${m}" for m in CURRENCY_PATTERN.findall(text)[:5]]

    @staticmethod
    def extract_companies(text: str) -> list[str]:
        """Identifies Australian company or business entity names based on typical legal suffixes."""
        found = COMPANY_SUFFIX_PATTERN.findall(text)
        return list(dict.fromkeys(name.strip() for name in found))[:3]

    @classmethod
    def analyze_entities(cls, email: EmailRecord) -> dict[str, Any]:
        """Extracts key business entities without hallucinating unmentioned values."""
        text = f"{email.subject}\n{email.body_plain}"
        due_date = cls.extract_due_date(text)
        amounts = cls.extract_amounts(text)
        companies = cls.extract_companies(text)

        entities: dict[str, Any] = {}
        if due_date:
            entities["due_date"] = due_date
        if amounts:
            entities["amounts"] = amounts
        if companies:
            entities["companies"] = companies
        if email.sender_name:
            entities["sender_name"] = email.sender_name

        return entities

    @staticmethod
    def detect_action_flags(
        email: EmailRecord,
        category: EmailCategory | None = None,
        priority: Priority | None = None,
    ) -> tuple[bool, bool, bool]:
        """Returns (action_required, response_required, follow_up_required)."""
        text = f"{email.subject} {email.body_plain}"
        action_req = bool(
            ACTION_SIGNALS.search(text)
            or (category in (EmailCategory.ACTION_REQUIRED, EmailCategory.URGENT))
            or (priority == Priority.CRITICAL)
        )
        response_req = bool(RESPONSE_SIGNALS.search(text) or action_req)
        followup_req = bool(FOLLOWUP_SIGNALS.search(text) or (category == EmailCategory.FOLLOW_UP_REQUIRED))
        return action_req, response_req, followup_req
