"""Tests for Ibex AI microservice integration within Email_Triage."""
from __future__ import annotations

import httpx
import pytest

from email_triage.models.schemas import AttachmentMetadata, EmailCategory, EmailRecord
from email_triage.triage import TriageEngine
from email_triage.triage.ibex_classifier import IbexAIClassifier


def test_ibex_ai_classifier_fallback_on_unreachable():
    """Verifies that IbexAIClassifier cleanly falls back to rule-based when service is offline."""
    classifier = IbexAIClassifier(endpoint_url="http://127.0.0.1:9999/does-not-exist", timeout_seconds=0.2)
    email = EmailRecord(
        subject="Tax Invoice INV-1002",
        body_plain="Please find attached our tax invoice for services rendered.",
    )
    cat, conf = classifier.classify(email)
    assert cat == EmailCategory.INVOICE_FINANCE
    assert conf > 0.0


def test_ibex_ai_classifier_live_classification():
    """Verifies live classification with port 8005 if service is reachable."""
    # Check if port 8005 is up
    try:
        r = httpx.get("http://127.0.0.1:8005/api/v1/healthz", timeout=1.0)
        is_live = (r.status_code == 200)
    except Exception:
        is_live = False

    if not is_live:
        pytest.skip("Ibex AI service not running on port 8005; skipping live test.")

    classifier = IbexAIClassifier(endpoint_url="http://127.0.0.1:8005/api/v1/classify/from-ingestion")
    email = EmailRecord(
        internal_id="INT-EATCLUB-01",
        sender_name="EatClub Australian Settlements",
        sender_email="reports@eatclub.com.au",
        subject="EatClub Settlement Statement for Harbourview Plumbing",
        body_plain="EatClub Merchant Remittance Statement. Gross Sales: $3,850.00. EatClub Commission: $385.00. Net Payout: $3,465.00. Merchant ABN: 51 824 753 556.",
        has_attachments=True,
        attachments=[
            AttachmentMetadata(
                filename="EatClub_Settlement.pdf",
                content_type="application/pdf",
                size_bytes=10240,
            )
        ],
    )

    triage_engine = TriageEngine(classifier=classifier)
    triaged_email = triage_engine.triage_email(email)

    # Assertions
    assert triaged_email.triage.category == EmailCategory.INVOICE_FINANCE
    assert triaged_email.triage.confidence >= 0.80

    # Verify AI enriched entities
    ai_classification = triaged_email.triage.entities.get("ai_classification")
    assert ai_classification is not None
    assert ai_classification["document_type"] == "platform_statement"
    assert ai_classification["platform_subtype"] == "EatClub"
    assert ai_classification["client"]["client_name"] == "Harbourview Plumbing Pty Ltd"

    # Verify suggested action is tailored with matched client name
    assert "Harbourview Plumbing" in triaged_email.triage.suggested_action

    # Verify attachment payload enriched
    assert len(triaged_email.attachments[0].ibex_compatible_payload) > 0
