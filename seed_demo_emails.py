"""Seed script to populate Email_Triage repository with realistic emails triaged via Ibex AI."""
from __future__ import annotations

import os
import sys
from datetime import UTC, datetime, timedelta

# Ensure python finds email_triage
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ["PYTHONCASEOK"] = "1"

from email_triage.models.schemas import AttachmentMetadata, EmailRecord, ProcessingStatus
from email_triage.storage.email_repository import EmailRepository
from email_triage.triage import TriageEngine
from email_triage.triage.ibex_classifier import IbexAIClassifier


def seed():
    repo = EmailRepository()
    print("Initializing Ibex AI Classification Engine...")
    classifier = IbexAIClassifier(endpoint_url="http://127.0.0.1:8005/api/v1/classify/from-ingestion")
    engine = TriageEngine(classifier=classifier)

    now = datetime.now(UTC)

    sample_emails = [
        EmailRecord(
            internal_id="EMAIL-EATCLUB-01",
            sender_name="EatClub Australian Settlements",
            sender_email="reports@eatclub.com.au",
            subject="Your Weekly EatClub Merchant Statement - Harbourview",
            body_plain="EatClub Merchant Remittance Statement. Gross Sales: $3,850.00. Commission: $385.00. Net Payout: $3,465.00. Merchant ABN: 51 824 753 556. Direct deposit scheduled for Monday.",
            received_at=(now - timedelta(hours=2)).isoformat(),
            has_attachments=True,
            attachments=[
                AttachmentMetadata(
                    id="ATT-EC-01",
                    filename="EatClub_Settlement_Oct2026.pdf",
                    content_type="application/pdf",
                    size_bytes=154200,
                    sha256="ec3850a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789a",
                )
            ],
            processing_status=ProcessingStatus.INGESTED,
        ),
        EmailRecord(
            internal_id="EMAIL-UBEREATS-02",
            sender_name="Uber Eats Merchant Team",
            sender_email="merchants@ubereats.com.au",
            subject="Weekly Payout Summary & Breakdown",
            body_plain="Uber Eats Restaurant Remittance Statement. Total Gross Sales: $4,210.00. Uber Service Fee: $1,263.00. Net Direct Deposit: $2,947.00. Merchant ABN: 51 824 753 556.",
            received_at=(now - timedelta(hours=5)).isoformat(),
            has_attachments=True,
            attachments=[
                AttachmentMetadata(
                    id="ATT-UBER-02",
                    filename="UberEats_Remittance_W43.pdf",
                    content_type="application/pdf",
                    size_bytes=184000,
                    sha256="ub4210a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789b",
                )
            ],
            processing_status=ProcessingStatus.INGESTED,
        ),
        EmailRecord(
            internal_id="EMAIL-SUPPLIER-03",
            sender_name="ABC Building Supplies Pty Ltd",
            sender_email="accounts@abcbuildingsupplies.com.au",
            subject="Tax Invoice INV-8831 from ABC Supplies Pty Ltd",
            body_plain="Hi team, please find attached Tax Invoice INV-8831 for plumbing and building supplies. Total Amount: $1,450.00. Includes GST: $131.82. Payment due by 15 November 2026. ABN: 51 824 753 556.",
            received_at=(now - timedelta(hours=8)).isoformat(),
            has_attachments=True,
            attachments=[
                AttachmentMetadata(
                    id="ATT-INV-03",
                    filename="Tax_Invoice_INV8831.pdf",
                    content_type="application/pdf",
                    size_bytes=98500,
                    sha256="inv1450a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789c",
                )
            ],
            processing_status=ProcessingStatus.INGESTED,
        ),
        EmailRecord(
            internal_id="EMAIL-ATO-04",
            sender_name="Australian Taxation Office",
            sender_email="notifications@ato.gov.au",
            subject="ATO Notice: Activity Statement (BAS) Q1 Due 28th October",
            body_plain="Australian Taxation Office Notice. Your quarterly Business Activity Statement (BAS) for Harbourview Plumbing Pty Ltd (ABN 51 824 753 556) is due for lodgement and payment by 28 October 2026. Please complete the return.",
            received_at=(now - timedelta(days=1)).isoformat(),
            has_attachments=False,
            processing_status=ProcessingStatus.INGESTED,
        ),
        EmailRecord(
            internal_id="EMAIL-URGENT-05",
            sender_name="David Miller - Sydney Coastal",
            sender_email="david@sydneycoastal.com.au",
            subject="URGENT: Payroll query and emergency super payment",
            body_plain="Hi team, we urgently need your guidance before processing Friday's payroll run. Can you please call me immediately at 0412 345 678 regarding the superannuation discrepancy?",
            received_at=(now - timedelta(minutes=45)).isoformat(),
            has_attachments=False,
            processing_status=ProcessingStatus.INGESTED,
        ),
        EmailRecord(
            internal_id="EMAIL-CBA-06",
            sender_name="Commonwealth Bank of Australia",
            sender_email="estatements@commbank.com.au",
            subject="Commonwealth Bank Business Account Statement",
            body_plain="Commonwealth Bank of Australia. Account Statement for Harbourview Plumbing Pty Ltd. ABN 51 824 753 556. Statement Period: 01/09/2026 to 30/09/2026. Closing balance: $42,500.00.",
            received_at=(now - timedelta(days=2)).isoformat(),
            has_attachments=True,
            attachments=[
                AttachmentMetadata(
                    id="ATT-CBA-06",
                    filename="CBA_Sep2026_Statement.pdf",
                    content_type="application/pdf",
                    size_bytes=245000,
                    sha256="cba4250a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789d",
                )
            ],
            processing_status=ProcessingStatus.INGESTED,
        ),
    ]

    print(f"Triaging {len(sample_emails)} sample emails through Ibex AI Service...")
    for email in sample_emails:
        triaged = engine.triage_email(email)
        repo.save_email(triaged)
        print(f" -> [{triaged.triage.category.value}] '{triaged.subject[:40]}...' (Conf: {triaged.triage.confidence * 100:.0f}%, Action: {triaged.triage.suggested_action[:45]}...)")

    print(f"\nSuccessfully seeded {repo.count_emails()} emails into repository!")


if __name__ == "__main__":
    seed()
