"""Unit tests for Email Classifier."""
from __future__ import annotations

import pytest

from email_triage.models.schemas import EmailCategory, EmailRecord
from email_triage.triage.classifier import RuleBasedClassifier


@pytest.fixture
def classifier() -> RuleBasedClassifier:
    return RuleBasedClassifier(min_confidence_threshold=0.35)


def test_classify_urgent_email(classifier: RuleBasedClassifier):
    email = EmailRecord(
        subject="URGENT: Immediate response needed for ATO audit",
        body_plain="Please respond ASAP at once. This is critical and time-sensitive.",
    )
    category, conf = classifier.classify(email)
    assert category == EmailCategory.URGENT
    assert conf >= 0.70


def test_classify_invoice_finance_email(classifier: RuleBasedClassifier):
    email = EmailRecord(
        subject="Tax Invoice #1042 - Acme Pty Ltd",
        body_plain="Please find attached our invoice for payment. Total amount due is $1,450.00 EFT remittance.",
    )
    category, conf = classifier.classify(email)
    assert category == EmailCategory.INVOICE_FINANCE
    assert conf >= 0.60


def test_classify_meeting_email(classifier: RuleBasedClassifier):
    email = EmailRecord(
        subject="Invitation: Annual Tax Planning Meeting via Zoom",
        body_plain="Let's schedule a conference call next Tuesday. Here is the agenda for our catch up.",
    )
    category, conf = classifier.classify(email)
    assert category == EmailCategory.MEETING_SCHEDULING
    assert conf >= 0.60


def test_classify_technical_issue_email(classifier: RuleBasedClassifier):
    email = EmailRecord(
        subject="Software Error: Cannot login to client portal",
        body_plain="We are experiencing a system outage and crash. Please reset password or contact IT support.",
    )
    category, conf = classifier.classify(email)
    assert category == EmailCategory.TECHNICAL_ISSUE
    assert conf >= 0.60


def test_classify_action_required_email(classifier: RuleBasedClassifier):
    email = EmailRecord(
        subject="Action Required: Please sign and return the engagement letter",
        body_plain="Please complete the attached documents and authorize submission.",
    )
    category, conf = classifier.classify(email)
    assert category == EmailCategory.ACTION_REQUIRED
    assert conf >= 0.60


def test_classify_spam_email(classifier: RuleBasedClassifier):
    email = EmailRecord(
        subject="Congratulations! Exclusive Casino Lottery Win",
        body_plain="Get rich quick, click here to claim your prize! Unsubscribe here.",
    )
    category, conf = classifier.classify(email)
    assert category == EmailCategory.SPAM_UNWANTED
    assert conf >= 0.70


def test_classify_unknown_when_low_confidence(classifier: RuleBasedClassifier):
    email = EmailRecord(
        subject="Hello",
        body_plain="Just saying hi.",
    )
    category, conf = classifier.classify(email)
    assert category in (EmailCategory.UNKNOWN_NEEDS_REVIEW, EmailCategory.OTHER)
