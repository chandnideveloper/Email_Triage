"""Unit tests for Priority Engine."""
from __future__ import annotations

import pytest

from email_triage.models.schemas import EmailCategory, EmailRecord, Priority
from email_triage.triage.priority_engine import PriorityEngine


@pytest.fixture
def priority_engine() -> PriorityEngine:
    return PriorityEngine()


def test_priority_critical_on_urgent_subject(priority_engine: PriorityEngine):
    email = EmailRecord(
        subject="URGENT: Legal notice and penalty deadline",
        body_plain="Action must be taken immediately within 24 hours.",
    )
    prio = priority_engine.determine_priority(email, category=EmailCategory.URGENT)
    assert prio == Priority.CRITICAL


def test_priority_high_on_action_required(priority_engine: PriorityEngine):
    email = EmailRecord(
        subject="Action Required: Approve Client Financial Statements",
        body_plain="Important deadline by tomorrow for sign off.",
    )
    prio = priority_engine.determine_priority(email, category=EmailCategory.ACTION_REQUIRED)
    assert prio == Priority.HIGH


def test_priority_high_on_invoice_with_attachment(priority_engine: PriorityEngine):
    email = EmailRecord(
        subject="Tax Invoice #4092",
        body_plain="Please find attached invoice for payment.",
        has_attachments=True,
    )
    prio = priority_engine.determine_priority(email, category=EmailCategory.INVOICE_FINANCE)
    assert prio == Priority.HIGH


def test_priority_low_on_newsletter_or_spam(priority_engine: PriorityEngine):
    email = EmailRecord(
        sender_email="noreply@newsletters.com",
        subject="Monthly Accounting Industry Bulletin",
        body_plain="For your information only, webinar updates and digest.",
    )
    prio = priority_engine.determine_priority(email, category=EmailCategory.INFORMATION_FYI)
    assert prio == Priority.LOW


def test_priority_medium_on_regular_communication(priority_engine: PriorityEngine):
    email = EmailRecord(
        sender_email="client@example.com.au",
        subject="Question about quarterly accounts",
        body_plain="Hi team, could you please let us know about the travel expenses policy?",
    )
    prio = priority_engine.determine_priority(email, category=EmailCategory.CLIENT_COMMUNICATION)
    assert prio == Priority.MEDIUM
