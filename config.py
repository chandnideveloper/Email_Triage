"""Configuration management for the Email Triage module."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class TriageConfig:
    # Microsoft Graph / Entra ID
    client_id: str = field(default_factory=lambda: os.getenv("GRAPH_CLIENT_ID", "").strip())
    client_secret: str = field(default_factory=lambda: os.getenv("GRAPH_CLIENT_SECRET", "").strip())
    tenant_id: str = field(default_factory=lambda: os.getenv("GRAPH_TENANT_ID", "").strip())
    authority_host: str = field(default_factory=lambda: os.getenv("GRAPH_AUTHORITY_HOST", "https://login.microsoftonline.com").rstrip("/"))
    target_mailbox: str = field(default_factory=lambda: os.getenv("TARGET_MAILBOX", "triage@example.com").strip())
    graph_api_base: str = field(default_factory=lambda: os.getenv("GRAPH_API_BASE", "https://graph.microsoft.com/v1.0").rstrip("/"))
    graph_scopes: str = field(default_factory=lambda: os.getenv("GRAPH_SCOPES", "https://graph.microsoft.com/.default").strip())

    # Task Queue / Celery
    celery_broker_url: str = field(default_factory=lambda: os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0").strip())
    celery_result_backend: str = field(default_factory=lambda: os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1").strip())
    task_always_eager: bool = field(
        default_factory=lambda: os.getenv("TASK_ALWAYS_EAGER", "True").lower() in ("1", "true", "yes", "on")
    )

    # Webhook Settings
    webhook_notification_url: str = field(default_factory=lambda: os.getenv("WEBHOOK_NOTIFICATION_URL", "").strip())
    webhook_client_state: str = field(default_factory=lambda: os.getenv("WEBHOOK_CLIENT_STATE", "dev-webhook-secret-state").strip())
    webhook_subscription_minutes: int = field(
        default_factory=lambda: int(os.getenv("WEBHOOK_SUBSCRIPTION_MINUTES", "4200"))
    )

    # Ingestion & Storage
    email_batch_size: int = field(default_factory=lambda: int(os.getenv("EMAIL_BATCH_SIZE", "50")))
    max_attachment_size_bytes: int = field(
        default_factory=lambda: int(os.getenv("MAX_ATTACHMENT_SIZE_BYTES", str(25 * 1024 * 1024)))
    )
    allowed_attachment_extensions: tuple[str, ...] = field(
        default_factory=lambda: tuple(
            ext.strip().lower()
            for ext in os.getenv(
                "ALLOWED_ATTACHMENT_EXTENSIONS",
                ".pdf,.docx,.xlsx,.csv,.txt,.png,.jpg,.jpeg",
            ).split(",")
            if ext.strip()
        )
    )
    attachment_storage_dir: Path = field(
        default_factory=lambda: Path(os.getenv("ATTACHMENT_STORAGE_DIR", "./storage_data/attachments"))
    )
    repository_storage_path: Path = field(
        default_factory=lambda: Path(os.getenv("REPOSITORY_STORAGE_PATH", "./storage_data/triage_store.json"))
    )

    # Operational & Security
    log_level: str = field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO").upper())
    sanitize_logs: bool = field(
        default_factory=lambda: os.getenv("SANITIZE_LOGS", "True").lower() in ("1", "true", "yes", "on")
    )
    readiness_env: str = field(default_factory=lambda: os.getenv("READINESS_ENV", "development").lower())

    @property
    def is_configured(self) -> bool:
        """True when minimal Microsoft Graph credentials are set in environment."""
        return bool(self.client_id and self.client_secret and self.tenant_id and self.target_mailbox)


def get_config(reload: bool = False) -> TriageConfig:
    """Returns current active TriageConfig, reading latest environment variables."""
    return TriageConfig()
