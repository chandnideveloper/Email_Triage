"""Modular email classifier with rule-based and pluggable AI/LLM interfaces."""
from __future__ import annotations

import re
from typing import Protocol

from email_triage.models.schemas import EmailCategory, EmailRecord


class EmailClassifierProtocol(Protocol):
    """Protocol for pluggable classifiers (rule-based, ML, or LLM-based)."""

    def classify(self, email: EmailRecord) -> tuple[EmailCategory, float]:
        """Returns (predicted_category, confidence_score_between_0_and_1)."""
        ...


# Category keywords with associated positive weights
CATEGORY_RULES: dict[EmailCategory, list[tuple[re.Pattern[str], float]]] = {
    EmailCategory.URGENT: [
        (re.compile(r"\b(urgent|immediate|emergency|asap|critical|time[- ]sensitive|at once)\b", re.I), 1.0),
        (re.compile(r"\b(deadline today|action required immediately|overdue)\b", re.I), 0.9),
    ],
    EmailCategory.INVOICE_FINANCE: [
        (re.compile(r"\b(invoice|receipt|payment|bill|remittance|eft|tax invoice|statement|bank|superannuation)\b", re.I), 0.9),
        (re.compile(r"\b(bas|ias|ato|tax return|payroll|accounts payable|xero|myob)\b", re.I), 0.8),
        (re.compile(r"\$\s?\d+(?:,\d{3})*(?:\.\d{2})?", re.I), 0.6),
    ],
    EmailCategory.MEETING_SCHEDULING: [
        (re.compile(r"\b(meeting|zoom|teams|schedule|calendar|reschedule|appointment|invitation|catch up)\b", re.I), 0.9),
        (re.compile(r"\b(call at|available on|dial[- ]in|conference|agenda)\b", re.I), 0.7),
    ],
    EmailCategory.TECHNICAL_ISSUE: [
        (re.compile(r"\b(error|bug|outage|failed|incident|crash|server down|login issue|exception|ticket #)\b", re.I), 0.9),
        (re.compile(r"\b(not working|software problem|reset password|it support)\b", re.I), 0.7),
    ],
    EmailCategory.ACTION_REQUIRED: [
        (re.compile(r"\b(action required|please review|sign and return|approval needed|please complete|action needed)\b", re.I), 0.9),
        (re.compile(r"\b(confirm|authorize|submit by|provide feedback)\b", re.I), 0.7),
    ],
    EmailCategory.FOLLOW_UP_REQUIRED: [
        (re.compile(r"\b(following up|follow[- ]up|checking in|any update|status update|touching base)\b", re.I), 0.9),
        (re.compile(r"\b(haven't heard|awaiting your reply|as discussed)\b", re.I), 0.7),
    ],
    EmailCategory.CLIENT_COMMUNICATION: [
        (re.compile(r"\b(client|engagement|advice|proposal|scope|retainer|instructions|queries)\b", re.I), 0.8),
        (re.compile(r"\b(financial statements|annual return|audit inquiry)\b", re.I), 0.7),
    ],
    EmailCategory.SPAM_UNWANTED: [
        (re.compile(r"\b(casino|lottery|viagra|cryptocurrency|get rich|nigerian prince|unsubscribe here)\b", re.I), 1.0),
        (re.compile(r"\b(click here to claim|congratulations you won|exclusive deal)\b", re.I), 0.9),
    ],
    EmailCategory.INFORMATION_FYI: [
        (re.compile(r"\b(fyi|for your information|newsletter|announcement|monthly digest|bulletin)\b", re.I), 0.8),
        (re.compile(r"\b(no action needed|for reference only|update on)\b", re.I), 0.7),
    ],
}


class RuleBasedClassifier:
    """Deterministic, rule-based classifier matching keywords, subjects, and text patterns."""

    def __init__(self, min_confidence_threshold: float = 0.35) -> None:
        self.threshold = min_confidence_threshold

    def classify(self, email: EmailRecord) -> tuple[EmailCategory, float]:
        text = f"{email.subject} {email.subject} {email.body_plain}"  # weight subject more heavily
        scores: dict[EmailCategory, float] = {}

        for category, rules in CATEGORY_RULES.items():
            cat_score = 0.0
            for pattern, weight in rules:
                matches = pattern.findall(text)
                if matches:
                    cat_score += weight * min(len(matches), 3)
            if cat_score > 0:
                scores[category] = cat_score

        if not scores:
            return EmailCategory.OTHER, 0.3

        # Rank categories
        ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
        top_cat, top_score = ranked[0]

        # Normalize score into a bounded confidence metric (0.0 to 1.0)
        confidence = min(0.98, top_score / (top_score + 1.2))

        if confidence < self.threshold:
            return EmailCategory.UNKNOWN_NEEDS_REVIEW, round(confidence, 2)

        return top_cat, round(confidence, 2)
