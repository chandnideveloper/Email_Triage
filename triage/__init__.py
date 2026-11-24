"""Triage coordinator orchestrating classification, priority, entity extraction, and summarization."""
from __future__ import annotations

from email_triage.models.schemas import EmailRecord, ProcessingStatus, TriageResult
from email_triage.triage.categorizer import Categorizer
from email_triage.triage.classifier import EmailClassifierProtocol, RuleBasedClassifier
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
        self.classifier = classifier or RuleBasedClassifier()
        self.summarizer = summarizer or RuleBasedSummarizer()
        self.priority_engine = priority_engine or PriorityEngine()
        self.categorizer = Categorizer()

    def triage_email(self, email: EmailRecord) -> EmailRecord:
        """Runs classification, priority determination, entity extraction, and summarization."""
        category, confidence = self.classifier.classify(email)
        priority = self.priority_engine.determine_priority(email, category)
        entities = self.categorizer.analyze_entities(email)
        action_req, response_req, followup_req = self.categorizer.detect_action_flags(
            email, category=category, priority=priority
        )
        due_date = entities.get("due_date")

        summary, key_points, suggested_action = self.summarizer.summarize(email, category, priority)

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
    "PriorityEngine",
    "Categorizer",
    "RuleBasedSummarizer",
    "EmailClassifierProtocol",
]
