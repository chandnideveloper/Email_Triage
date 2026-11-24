"""Attachment storage service with validation, deduplication, and IBEX bridge."""
from __future__ import annotations

import hashlib
import os
from pathlib import Path

from email_triage.config import TriageConfig, get_config
from email_triage.models.schemas import AttachmentMetadata
from email_triage.utils.logger import get_logger

log = get_logger(__name__)


class AttachmentValidationError(Exception):
    """Raised when an attachment fails validation (type, size, or format)."""


class AttachmentStorage:
    """Manages file storage, hash-based deduplication, and IBEX document readiness."""

    def __init__(self, config: TriageConfig | None = None) -> None:
        self.config = config or get_config()
        self.storage_dir = Path(self.config.attachment_storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def validate(self, filename: str, content: bytes) -> None:
        """Validates extension and file size against configured rules."""
        ext = os.path.splitext(filename)[1].lower()
        if not ext or ext not in self.config.allowed_attachment_extensions:
            raise AttachmentValidationError(f"File extension '{ext}' is not permitted.")

        size = len(content)
        if size == 0:
            raise AttachmentValidationError("Attachment content is empty (0 bytes).")
        if size > self.config.max_attachment_size_bytes:
            raise AttachmentValidationError(
                f"Attachment size {size} exceeds max limit of {self.config.max_attachment_size_bytes} bytes."
            )

    @staticmethod
    def compute_sha256(content: bytes) -> str:
        """Calculates SHA-256 hexadecimal hash for file deduplication."""
        return hashlib.sha256(content).hexdigest()

    def store_attachment(
        self,
        email_internal_id: str,
        graph_attachment_id: str,
        filename: str,
        content: bytes,
        content_type: str = "application/octet-stream",
        is_inline: bool = False,
    ) -> AttachmentMetadata:
        """Validates, deduplicates, and saves attachment to disk, returning metadata."""
        self.validate(filename, content)
        sha256_hash = self.compute_sha256(content)
        ext = os.path.splitext(filename)[1].lower()

        # Sharded storage path based on hash prefix: e.g. <dir>/a1/a1b2c3d4...pdf
        shard_dir = self.storage_dir / sha256_hash[:2]
        shard_dir.mkdir(parents=True, exist_ok=True)
        target_path = shard_dir / f"{sha256_hash}{ext}"

        # Deduplication: only write if not already present on disk
        if not target_path.exists():
            target_path.write_bytes(content)
            log.info("Stored new attachment hash=%s... name=%s size=%s", sha256_hash[:8], filename, len(content))
        else:
            log.info("Attachment hash=%s already exists on disk (deduplicated)", sha256_hash[:8])

        # Prepare IBEX-compatible ingestion payload (bridges into readiness.documents pipeline)
        needs_ocr = ext in (".png", ".jpg", ".jpeg", ".tif", ".tiff")
        ibex_payload = {
            "source": "email_triage",
            "original_filename": filename,
            "sha256": sha256_hash,
            "size_bytes": len(content),
            "storage_path": str(target_path.resolve()),
            "content_type": content_type,
            "needs_ocr": needs_ocr,
            "is_inline": is_inline,
            "display_name": f"Email Attachment: {filename}",
        }

        return AttachmentMetadata(
            graph_attachment_id=graph_attachment_id,
            email_internal_id=email_internal_id,
            filename=filename,
            content_type=content_type,
            size_bytes=len(content),
            sha256=sha256_hash,
            is_inline=is_inline,
            storage_path=str(target_path),
            ibex_compatible_payload=ibex_payload,
        )
