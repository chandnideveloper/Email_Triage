"""AI-powered email classifier integrating with the Ibex AI Classification microservice."""
from __future__ import annotations

import os
from typing import Any

import httpx

from email_triage.models.schemas import EmailCategory, EmailRecord
from email_triage.triage.classifier import RuleBasedClassifier
from email_triage.utils.logger import get_logger

log = get_logger(__name__)

# Map Ibex AI document types & intents to EmailCategory
DOC_TYPE_TO_CATEGORY: dict[str, EmailCategory] = {
    "supplier_invoice": EmailCategory.INVOICE_FINANCE,
    "supplier_statement": EmailCategory.INVOICE_FINANCE,
    "customer_invoice": EmailCategory.INVOICE_FINANCE,
    "receipt": EmailCategory.INVOICE_FINANCE,
    "credit_note": EmailCategory.INVOICE_FINANCE,
    "bank_statement": EmailCategory.INVOICE_FINANCE,
    "credit_card_statement": EmailCategory.INVOICE_FINANCE,
    "loan_statement": EmailCategory.INVOICE_FINANCE,
    "merchant_settlement_eatclub": EmailCategory.INVOICE_FINANCE,
    "merchant_settlement_uber_eats": EmailCategory.INVOICE_FINANCE,
    "merchant_settlement_mryum": EmailCategory.INVOICE_FINANCE,
    "merchant_settlement_doordash": EmailCategory.INVOICE_FINANCE,
    "merchant_settlement_menulog": EmailCategory.INVOICE_FINANCE,
    "platform_statement": EmailCategory.INVOICE_FINANCE,
    "dividend_statement": EmailCategory.INVOICE_FINANCE,
    "rental_statement": EmailCategory.INVOICE_FINANCE,
    "income_statement": EmailCategory.INVOICE_FINANCE,
    "payroll_report": EmailCategory.INVOICE_FINANCE,
    "superannuation_report": EmailCategory.INVOICE_FINANCE,
    "ato_notice": EmailCategory.ACTION_REQUIRED,
    "signed_return": EmailCategory.ACTION_REQUIRED,
    "ato_payment_summary": EmailCategory.INVOICE_FINANCE,
    "financial_report_export": EmailCategory.CLIENT_COMMUNICATION,
    "signed_engagement": EmailCategory.CLIENT_COMMUNICATION,
    "id_document": EmailCategory.CLIENT_COMMUNICATION,
    "other": EmailCategory.OTHER,
    "unknown": EmailCategory.UNKNOWN_NEEDS_REVIEW,
}

INTENT_TO_CATEGORY: dict[str, EmailCategory] = {
    "urgent": EmailCategory.URGENT,
    "ato_correspondence": EmailCategory.ACTION_REQUIRED,
    "change_request": EmailCategory.ACTION_REQUIRED,
    "document_delivery": EmailCategory.INVOICE_FINANCE,
    "query_question": EmailCategory.CLIENT_COMMUNICATION,
    "information_request": EmailCategory.CLIENT_COMMUNICATION,
    "no_action": EmailCategory.INFORMATION_FYI,
}


class IbexAIClassifier:
    """Connects to the Ibex AI Classification microservice on port 8005.

    Provides high-accuracy ML document classification, Australian client matching,
    entity extraction, sensitivity checks, and duplicate detection.
    Falls back gracefully to RuleBasedClassifier if the AI microservice is unreachable.
    """

    def __init__(
        self,
        endpoint_url: str | None = None,
        timeout_seconds: float = 3.0,
        fallback_classifier: RuleBasedClassifier | None = None,
    ) -> None:
        self.endpoint_url = (
            endpoint_url
            or os.getenv("AI_CLASSIFICATION_URL", "http://127.0.0.1:8005/api/v1/classify/from-ingestion")
        ).strip()
        self.timeout_seconds = timeout_seconds
        self.fallback = fallback_classifier or RuleBasedClassifier()

    def classify(self, email: EmailRecord) -> tuple[EmailCategory, float]:
        """Calls the AI classification service and enriches email with AI predictions."""
        try:
            # Prepare payload matching IngestionAdapter expectation
            payload: dict[str, Any] = {
                "email_record": email.to_dict(),
            }
            # If plain text body exists or attachment has extracted text, send it
            if email.body_plain:
                payload["document_text"] = email.body_plain

            with httpx.Client(timeout=self.timeout_seconds) as client:
                resp = client.post(self.endpoint_url, json=payload)

            if resp.status_code == 200:
                ai_data = resp.json()
                classification = ai_data.get("classification", {})
                doc_type = classification.get("document_type", "unknown")
                confidence = float(classification.get("confidence", 0.5))

                intent_info = ai_data.get("intent", {})
                intent_type = intent_info.get("type", "")

                # Priority: urgent intent or urgency keywords elevate category to URGENT
                text = f"{email.subject} {email.body_plain}".lower()
                is_urgent = intent_type == "urgent" or any(w in text for w in ("urgent", "immediately", "emergency", "asap"))

                if is_urgent:
                    category = EmailCategory.URGENT
                elif doc_type in DOC_TYPE_TO_CATEGORY and DOC_TYPE_TO_CATEGORY[doc_type] not in (EmailCategory.OTHER, EmailCategory.UNKNOWN_NEEDS_REVIEW):
                    category = DOC_TYPE_TO_CATEGORY[doc_type]
                elif intent_type in INTENT_TO_CATEGORY:
                    category = INTENT_TO_CATEGORY[intent_type]
                elif doc_type in DOC_TYPE_TO_CATEGORY:
                    category = DOC_TYPE_TO_CATEGORY[doc_type]
                else:
                    category = EmailCategory.OTHER

                # Enrich email entities with deep AI metadata
                entities = email.triage.entities or {}
                entities["ai_classification"] = {
                    "document_type": doc_type,
                    "platform_subtype": classification.get("subtype"),
                    "confidence": confidence,
                    "status": ai_data.get("status"),
                    "client": ai_data.get("client"),
                    "extracted_fields": ai_data.get("extracted_fields"),
                    "sensitivity": ai_data.get("sensitivity"),
                    "suggested_job_ref": ai_data.get("suggested_job_ref"),
                    "review_reasons": ai_data.get("review_reasons", []),
                }
                email.triage.entities = entities

                # Enrich attachment payload if present
                if email.attachments:
                    email.attachments[0].ibex_compatible_payload = ai_data

                log.info(
                    "IbexAIClassifier predicted doc_type='%s' (subtype='%s') confidence=%.2f for email %s",
                    doc_type,
                    classification.get("subtype"),
                    confidence,
                    email.internal_id[:8],
                )
                return category, confidence

            log.warning("IbexAIClassifier HTTP %d, using fallback", resp.status_code)
        except Exception as exc:
            log.warning("IbexAIClassifier unavailable (%s), falling back to rules", type(exc).__name__)

        # Fallback to deterministic rules if AI service is offline
        return self.fallback.classify(email)
