"""Triage coordinator orchestrating classification, priority, entity extraction, and summarization."""
from __future__ import annotations

import os

from email_triage.models.schemas import EmailRecord, ProcessingStatus, TriageResult
from email_triage.triage.categorizer import Categorizer
from email_triage.triage.classifier import EmailClassifierProtocol, RuleBasedClassifier
from email_triage.triage.ibex_classifier import IbexAIClassifier
from email_triage.triage.priority_engine import PriorityEngine
from email_triage.triage.summarizer import RuleBasedSummarizer, SummarizerProtocol
from email_triage.utils.logger import get_logger

log = get_logger(__name__)


class TriageEngine:
    """Coordinates end-to-end email analysis, populating TriageResult."""

    def __init__(
        self,
        classifier: EmailClassifierProtocol | None = None,
        summarizer: SummarizerProtocol | None = None,
        priority_engine: PriorityEngine | None = None,
    ) -> None:
        if classifier is not None:
            self.classifier = classifier
        elif os.getenv("USE_IBEX_AI", "True").lower() in ("1", "true", "yes", "on"):
            self.classifier = IbexAIClassifier()
        else:
            self.classifier = RuleBasedClassifier()

        self.summarizer = summarizer or RuleBasedSummarizer()
        self.priority_engine = priority_engine or PriorityEngine()
        self.categorizer = Categorizer()

    def triage_email(self, email: EmailRecord) -> EmailRecord:
        """Runs classification, priority determination, entity extraction, and summarization."""
        category, confidence = self.classifier.classify(email)
        priority = self.priority_engine.determine_priority(email, category)
        entities = self.categorizer.analyze_entities(email)

        # Merge with existing entities if classifier already populated them (e.g. IbexAIClassifier)
        if email.triage.entities:
            merged = dict(email.triage.entities)
            merged.update(entities)
            entities = merged

        action_req, response_req, followup_req = self.categorizer.detect_action_flags(
            email, category=category, priority=priority
        )
        due_date = entities.get("due_date")

        summary, key_points, suggested_action = self.summarizer.summarize(email, category, priority)

        # Highlight extracted invoice and supplier details in key points
        if entities.get("invoice_number") or entities.get("total_amount"):
            inv_str = entities.get("invoice_number") or "Invoice"
            tot_str = entities.get("total_amount") or ""
            supp_str = entities.get("supplier_name") or (entities.get("companies", [""])[0] if entities.get("companies") else "")
            summary_bullet = f"Invoice #{inv_str}"
            if tot_str:
                summary_bullet += f" totaling {tot_str}"
            if supp_str:
                summary_bullet += f" from {supp_str}"
            if entities.get("due_date"):
                summary_bullet += f" (Due: {entities['due_date']})"
            if summary_bullet not in key_points:
                key_points.insert(0, summary_bullet)

        # If Ibex AI classification enriched this email, refine suggested action
        ai_meta = entities.get("ai_classification")
        if ai_meta and isinstance(ai_meta, dict):
            client_info = ai_meta.get("client") or {}
            client_name = client_info.get("client_name")
            status = ai_meta.get("status")
            if status == "ready" and client_name:
                suggested_action = f"Auto-file into Ibex CRM for client '{client_name}'."
            elif status == "needs_human_review":
                reasons = ", ".join(ai_meta.get("review_reasons", [])) or "low confidence"
                suggested_action = f"Route to Senior Reviewer ({reasons})."

        email.triage = TriageResult(
            category=category,
            priority=priority,
            confidence=confidence,
            action_required=action_req,
            response_required=response_req,
            follow_up_required=followup_req,
            suggested_action=suggested_action,
            due_date=due_date,
            summary=summary,
            key_points=key_points,
            entities=entities,
        )
        email.processing_status = ProcessingStatus.TRIAGED
        log.info(
            "Triaged email id=%s category='%s' priority='%s' confidence=%.2f",
            email.internal_id[:8],
            category.value,
            priority.value,
            confidence,
        )
        return email


__all__ = [
    "TriageEngine",
    "RuleBasedClassifier",
    "IbexAIClassifier",
    "PriorityEngine",
    "Categorizer",
    "RuleBasedSummarizer",
    "EmailClassifierProtocol",
]

