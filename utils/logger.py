"""Secure logging utility for Email Triage.

Following IBEX non-negotiable rules:
- No sensitive email bodies, credentials, tokens, or personal identifiers in log outputs.
- Logs events, error codes, counts, durations, and non-sensitive identifiers (message IDs, hash prefixes).
"""
from __future__ import annotations

import logging
import re
import sys
from typing import Any

# Patterns to strip from any log stream
SENSITIVE_PATTERNS = [
    re.compile(r"(?i)(bearer\s+)[a-zA-Z0-9_\-\.]{15,}", re.IGNORECASE),
    re.compile(r"(?i)(client_secret=)[^\s&]+", re.IGNORECASE),
    re.compile(r"(?i)(password=)[^\s&]+", re.IGNORECASE),
    re.compile(r"\b\d{3}\s?\d{3}\s?\d{3}\b"),  # TFN / 9-digit
    re.compile(r"\b\d{2}\s?\d{3}\s?\d{3}\s?\d{3}\b"),  # ABN / 11-digit
]


class SanitizingFilter(logging.Filter):
    """Filter that removes sensitive credentials, access tokens, and tax IDs from log records."""

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            sanitized = record.msg
            for pattern in SENSITIVE_PATTERNS:
                sanitized = pattern.sub(r"\1[REDACTED]" if r"\1" in pattern.pattern else "[REDACTED_PII]", sanitized)
            record.msg = sanitized
        return True


def get_logger(name: str = "email_triage") -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(
            logging.Formatter(
                fmt="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
                datefmt="%Y-%m-%dT%H:%M:%SZ",
            )
        )
        handler.addFilter(SanitizingFilter())
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger
