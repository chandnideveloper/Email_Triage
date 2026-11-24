"""Unit tests for Attachment Storage and IBEX integration bridge."""
from __future__ import annotations

import pytest

from email_triage.config import TriageConfig
from email_triage.storage.attachment_storage import AttachmentStorage, AttachmentValidationError


def test_store_valid_attachment(tmp_path):
    cfg = TriageConfig(
        attachment_storage_dir=tmp_path / "att",
        max_attachment_size_bytes=10000,
        allowed_attachment_extensions=(".pdf", ".docx", ".xlsx"),
    )
    storage = AttachmentStorage(config=cfg)

    content = b"%PDF-1.4 Mock PDF binary data for testing"
    meta = storage.store_attachment(
        email_internal_id="email-123",
        graph_attachment_id="graph-att-001",
        filename="Test_Report.pdf",
        content=content,
        content_type="application/pdf",
    )

    assert meta.filename == "Test_Report.pdf"
    assert meta.size_bytes == len(content)
    assert len(meta.sha256) == 64
    assert meta.email_internal_id == "email-123"
    assert meta.ibex_compatible_payload["sha256"] == meta.sha256
    assert meta.ibex_compatible_payload["needs_ocr"] is False


def test_attachment_deduplication(tmp_path):
    cfg = TriageConfig(attachment_storage_dir=tmp_path / "att")
    storage = AttachmentStorage(config=cfg)

    content = b"Exact identical spreadsheet content"
    meta1 = storage.store_attachment("email-1", "att-1", "Sheet1.xlsx", content)
    meta2 = storage.store_attachment("email-2", "att-2", "Sheet2.xlsx", content)

    # Identical SHA-256 and stored file path
    assert meta1.sha256 == meta2.sha256
    assert meta1.storage_path == meta2.storage_path


def test_reject_disallowed_extension(tmp_path):
    cfg = TriageConfig(
        attachment_storage_dir=tmp_path / "att",
        allowed_attachment_extensions=(".pdf", ".docx"),
    )
    storage = AttachmentStorage(config=cfg)

    with pytest.raises(AttachmentValidationError) as exc:
        storage.store_attachment("email-1", "att-1", "malicious_script.exe", b"binary")
    assert "File extension '.exe' is not permitted" in str(exc.value)


def test_reject_oversized_file(tmp_path):
    cfg = TriageConfig(
        attachment_storage_dir=tmp_path / "att",
        max_attachment_size_bytes=50,
        allowed_attachment_extensions=(".pdf",),
    )
    storage = AttachmentStorage(config=cfg)

    with pytest.raises(AttachmentValidationError) as exc:
        storage.store_attachment("email-1", "att-1", "big.pdf", b"x" * 100)
    assert "exceeds max limit" in str(exc.value)


def test_image_flags_needs_ocr_for_ibex_pipeline(tmp_path):
    cfg = TriageConfig(attachment_storage_dir=tmp_path / "att")
    storage = AttachmentStorage(config=cfg)

    meta = storage.store_attachment(
        email_internal_id="email-1",
        graph_attachment_id="att-img-1",
        filename="scanned_receipt.jpg",
        content=b"JPEG binary data",
    )
    # Verifies bridge to existing IBEX OCR pipeline without reimplementing OCR
    assert meta.ibex_compatible_payload["needs_ocr"] is True
