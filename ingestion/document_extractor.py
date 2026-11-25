"""Document text extraction engine supporting native digital PDFs, scanned PDFs, and image OCR."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from email_triage.utils.logger import get_logger

log = get_logger(__name__)

# Lazy imports for PDF and OCR libraries
try:
    import pymupdf as fitz
except ImportError:
    try:
        import fitz
    except ImportError:
        fitz = None

try:
    from PIL import Image
except ImportError:
    Image = None

try:
    import numpy as np
except ImportError:
    np = None

# Optional PaddleOCR support
_PADDLE_OCR_INSTANCE = None
_PADDLE_OCR_TRIED = False


def get_paddle_ocr():
    """Lazily loads PaddleOCR if installed."""
    global _PADDLE_OCR_INSTANCE, _PADDLE_OCR_TRIED
    if _PADDLE_OCR_TRIED:
        return _PADDLE_OCR_INSTANCE
    _PADDLE_OCR_TRIED = True
    try:
        from paddleocr import PaddleOCR
        _PADDLE_OCR_INSTANCE = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
        log.info("PaddleOCR engine initialized successfully.")
    except Exception as exc:
        log.warning("PaddleOCR not available (%s). Running with PyMuPDF digital extractor.", type(exc).__name__)
        _PADDLE_OCR_INSTANCE = None
    return _PADDLE_OCR_INSTANCE


class DocumentExtractor:
    """Extracts text from documents (PDFs, Images, TXT, CSV) using hybrid digital + OCR."""

    def __init__(self, min_digital_text_len: int = 30) -> None:
        self.min_digital_text_len = min_digital_text_len

    def extract_text_from_file(self, file_path: str | Path) -> str:
        """Extracts text from a file on disk."""
        path = Path(file_path)
        if not path.exists():
            log.warning("DocumentExtractor: File not found at %s", path)
            return ""

        ext = path.suffix.lower()

        try:
            if ext == ".pdf":
                return self._extract_from_pdf(path)
            elif ext in (".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp"):
                return self._extract_from_image(path)
            elif ext in (".txt", ".csv"):
                return path.read_text(encoding="utf-8", errors="ignore")
            elif ext in (".docx", ".doc"):
                return self._extract_from_docx(path)
            else:
                log.info("Unsupported extension for extraction: %s", ext)
                return ""
        except Exception as exc:
            log.error("Failed to extract text from %s: %s", path.name, exc)
            return ""

    def _extract_from_docx(self, path: Path) -> str:
        """Extracts text from DOCX (and binary DOC text strings) using standard library zipfile/xml."""
        import zipfile
        import xml.etree.ElementTree as ET

        if zipfile.is_zipfile(path):
            try:
                with zipfile.ZipFile(path) as z:
                    xml_content = z.read("word/document.xml")
                    tree = ET.fromstring(xml_content)
                    paragraphs: list[str] = []
                    for p in tree.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p"):
                        texts = [
                            node.text
                            for node in p.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t")
                            if node.text
                        ]
                        if texts:
                            paragraphs.append("".join(texts))
                    return "\n".join(paragraphs)
            except Exception as e:
                log.warning("DOCX extraction error from %s: %s", path.name, e)

        # Fallback for plain binary or older formats: scan printable ASCII/UTF-8 strings
        try:
            data = path.read_bytes()
            import re
            strings = re.findall(rb"[\x20-\x7E\t\r\n]{4,}", data)
            return "\n".join(s.decode("latin1", errors="ignore") for s in strings)
        except Exception as exc:
            log.warning("Fallback doc extraction failed for %s: %s", path.name, exc)
            return ""

    def _extract_from_pdf(self, path: Path) -> str:
        """Extracts text from PDF, falling back to OCR if page has minimal digital text."""
        if not fitz:
            log.error("PyMuPDF / fitz is not installed.")
            return ""

        extracted_pages: list[str] = []
        ocr = get_paddle_ocr()

        with fitz.open(path) as doc:
            for page_num, page in enumerate(doc, start=1):
                page_text = page.get_text("text").strip()

                # If the page has almost no digital text, it's likely a scanned image
                if len(page_text) < self.min_digital_text_len and ocr and Image and np:
                    log.info("Page %d has only %d chars of digital text; running OCR...", page_num, len(page_text))
                    try:
                        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                        result = ocr.ocr(np.array(img), cls=True)
                        if result and result[0]:
                            ocr_text = "\n".join(item[1][0] for item in result[0] if item and len(item) > 1)
                            if ocr_text:
                                page_text = ocr_text
                    except Exception as ocr_err:
                        log.warning("OCR failed on page %d: %s", page_num, ocr_err)

                if page_text:
                    extracted_pages.append(f"--- Page {page_num} ---\n{page_text}")

        return "\n\n".join(extracted_pages).strip()

    def _extract_from_image(self, path: Path) -> str:
        """Runs OCR on an image file."""
        ocr = get_paddle_ocr()
        if not ocr or not Image or not np:
            log.warning("PaddleOCR or Pillow not available to OCR image %s", path.name)
            return ""

        try:
            image = Image.open(path).convert("RGB")
            result = ocr.ocr(np.array(image), cls=True)
            if result and result[0]:
                lines = [item[1][0] for item in result[0] if item and len(item) > 1]
                return "\n".join(lines).strip()
        except Exception as exc:
            log.error("Failed to OCR image %s: %s", path.name, exc)

        return ""
