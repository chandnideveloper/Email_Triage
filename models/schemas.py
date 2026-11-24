"""Data models and standardized schemas for Email Triage.

Provides pure Python dataclasses and Pydantic-compatible schemas for emails, attachments,
triage classifications, and synchronization state.
"""
from __future__ import annotations

import enum
import uuid
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from typing import Any


class Priority(str, enum.Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class EmailCategory(str, enum.Enum):
    ACTION_REQUIRED = "Action Required"
    URGENT = "Urgent"
    CLIENT_COMMUNICATION = "Client Communication"
    MEETING_SCHEDULING = "Meeting / Scheduling"
    INVOICE_FINANCE = "Invoice / Finance"
    TECHNICAL_ISSUE = "Technical Issue"
    INFORMATION_FYI = "Information / FYI"
    FOLLOW_UP_REQUIRED = "Follow-up Required"
    SPAM_UNWANTED = "Spam / Unwanted"
    OTHER = "Other"
    UNKNOWN_NEEDS_REVIEW = "Unknown / Needs Review"


class ProcessingStatus(str, enum.Enum):
    PENDING = "PENDING"
    INGESTED = "INGESTED"
    TRIAGED = "TRIAGED"
    ATTACHMENTS_PROCESSED = "ATTACHMENTS_PROCESSED"
    FAILED = "FAILED"
    RETRYING = "RETRYING"


@dataclass
class AttachmentMetadata:
    """Standardized metadata for an email attachment."""

    id: str = field(default_factory=lambda: uuid.uuid4().hex)
    graph_attachment_id: str = ""
    email_internal_id: str = ""
    filename: str = ""
    content_type: str = "application/octet-stream"
    size_bytes: int = 0
    sha256: str = ""
    is_inline: bool = False
    storage_path: str = ""
    downloaded_at: str = ""
    ibex_compatible_payload: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class TriageResult:
    """Results from email classification, priority scoring, and extraction."""

    category: EmailCategory = EmailCategory.UNKNOWN_NEEDS_REVIEW
    priority: Priority = Priority.LOW
    confidence: float = 0.0
    action_required: bool = False
    response_required: bool = False
    follow_up_required: bool = False
    suggested_action: str = ""
    due_date: str | None = None
    summary: str = ""
    key_points: list[str] = field(default_factory=list)
    entities: dict[str, Any] = field(default_factory=dict)
    triaged_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["category"] = self.category.value
        data["priority"] = self.priority.value
        return data


@dataclass
class EmailRecord:
    """Comprehensive email entity tracking metadata, body, and triage state."""

    internal_id: str = field(default_factory=lambda: uuid.uuid4().hex)
    graph_message_id: str = ""
    internet_message_id: str = ""
    conversation_id: str = ""
    sender_name: str = ""
    sender_email: str = ""
    recipients: list[dict[str, str]] = field(default_factory=list)  # [{"name": "...", "email": "..."}]
    cc: list[dict[str, str]] = field(default_factory=list)
    bcc: list[dict[str, str]] = field(default_factory=list)
    subject: str = ""
    body_plain: str = ""
    body_html: str = ""
    received_at: str = ""
    is_read: bool = False
    has_attachments: bool = False
    attachments: list[AttachmentMetadata] = field(default_factory=list)

    # Triage and Processing State
    triage: TriageResult = field(default_factory=TriageResult)
    processing_status: ProcessingStatus = ProcessingStatus.PENDING
    error_message: str = ""
    retry_count: int = 0
    created_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["processing_status"] = self.processing_status.value
        data["triage"] = self.triage.to_dict()
        data["attachments"] = [a.to_dict() for a in self.attachments]
        return data

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> EmailRecord:
        record_data = dict(data)
        if "triage" in record_data and isinstance(record_data["triage"], dict):
            t_data = record_data["triage"]
            record_data["triage"] = TriageResult(
                category=EmailCategory(t_data.get("category", EmailCategory.UNKNOWN_NEEDS_REVIEW.value)),
                priority=Priority(t_data.get("priority", Priority.LOW.value)),
                confidence=float(t_data.get("confidence", 0.0)),
                action_required=bool(t_data.get("action_required", False)),
                response_required=bool(t_data.get("response_required", False)),
                follow_up_required=bool(t_data.get("follow_up_required", False)),
                suggested_action=str(t_data.get("suggested_action", "")),
                due_date=t_data.get("due_date"),
                summary=str(t_data.get("summary", "")),
                key_points=list(t_data.get("key_points", [])),
                entities=dict(t_data.get("entities", {})),
                triaged_at=str(t_data.get("triaged_at", "")),
            )
        if "attachments" in record_data and isinstance(record_data["attachments"], list):
            record_data["attachments"] = [
                AttachmentMetadata(**att) if isinstance(att, dict) else att for att in record_data["attachments"]
            ]
        if "processing_status" in record_data and isinstance(record_data["processing_status"], str):
            record_data["processing_status"] = ProcessingStatus(record_data["processing_status"])
        return cls(**record_data)


@dataclass
class SyncStateRecord:
    """Maintains incremental sync progress and delta tokens for a mailbox."""

    mailbox: str
    delta_link: str = ""
    last_sync_time: str = ""
    emails_synced_total: int = 0
    last_status: str = "IDLE"
    error_code: str = ""
    updated_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class WebhookSubscriptionRecord:
    """Tracks Microsoft Graph webhook subscription lifecycle."""

    subscription_id: str
    resource: str
    notification_url: str
    expiration_datetime: str
    client_state: str
    created_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    status: str = "ACTIVE"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
