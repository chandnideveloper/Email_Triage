"""Categorizer and entity extractor identifying dates, deadlines, amounts, and action signals."""
from __future__ import annotations

import os
import re
from typing import Any

from email_triage.models.schemas import EmailCategory, EmailRecord, Priority
from email_triage.utils.logger import get_logger

log = get_logger(__name__)

DATE_PATTERNS = [
    re.compile(r"\b(?:due|deadline|by|before)\s+(?:on\s+)?(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:\s+\d{2,4})?)", re.I),
    re.compile(r"(?:Due\s+date|Payment\s+due|Due\s+by)[:\s\n]*(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})", re.I),
    re.compile(r"\b(?:due|deadline|by)\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b", re.I),
    re.compile(r"\b(\d{4}-\d{2}-\d{2})\b"),
]

CURRENCY_PATTERN = re.compile(r"(?:\$|AUD\s?)\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)", re.I)
COMPANY_SUFFIX_PATTERN = re.compile(
    r"\b([A-Z][A-Za-z0-9&'\s]{2,35}\s+(?:Pty(?:\s+Ltd)?|Ltd|Holdings|Trust|Partners|Services|Group|Supplies|Strata|Body Corporate|Association))\b"
)

RESPONSE_SIGNALS = re.compile(r"\b(please let (?:us|me) know|can you confirm|could you reply|please respond|awaiting your response|what do you think)\b", re.I)
ACTION_SIGNALS = re.compile(
    r"\b(please review|please sign|please find attached|action required|approval needed|"
    r"submit the|file the|please remit|please pay|remittance|payment required|action needed|at once)\b",
    re.I,
)
FOLLOWUP_SIGNALS = re.compile(r"\b(follow[- ]up|checking in|status update|have you had a chance|touching base)\b", re.I)


class Categorizer:
    """Extracts business entities and behavioral triggers from email text and attachments."""

    @staticmethod
    def extract_due_date(text: str) -> str | None:
        """Finds explicitly mentioned deadlines or due dates in the text."""
        for pattern in DATE_PATTERNS:
            match = pattern.search(text)
            if match:
                return match.group(1).strip()
        # Check for period end dates e.g. "Period: 1–30 November 2026"
        m_period = re.search(
            r"(?:Period[:\s]+[0-9]{1,2}\s*[–\-]\s*([0-9]{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}))",
            text,
            re.I,
        )
        if m_period:
            return m_period.group(1).strip()
        return None

    @staticmethod
    def extract_amounts(text: str) -> list[str]:
        """Finds currency figures mentioned in the email or attachment."""
        found: list[str] = []
        p1 = re.findall(r"(?:\$)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2}))\b", text)
        for m in p1:
            clean = m.strip()
            if clean and clean != "01" and f"${clean}" not in found:
                found.append(f"${clean}")

        p2 = re.findall(r"\bAUD\s+(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2}))\b", text, re.I)
        for m in p2:
            clean = m.strip()
            if clean and clean != "01" and f"${clean}" not in found:
                found.append(f"${clean}")

        p3 = re.findall(r"\b(\d{1,3}(?:,\d{3})+\.\d{2})\b", text)
        for m in p3:
            clean = m.strip()
            if clean and f"${clean}" not in found:
                found.append(f"${clean}")

        return found[:8]

    @staticmethod
    def extract_companies(text: str) -> list[str]:
        """Identifies Australian company or business entity names based on typical legal suffixes."""
        found = COMPANY_SUFFIX_PATTERN.findall(text)
        clean_names: list[str] = []
        for name in found:
            parts = [p.strip() for p in name.splitlines() if p.strip()]
            cand = parts[-1] if parts else name.strip()
            # Strip common document header prefix words
            cand = re.sub(r"^(?:Statement|Invoice|Report|Notice|Letter|Document)\s+", "", cand, flags=re.I).strip()
            if cand and cand not in clean_names:
                clean_names.append(cand)
        return clean_names[:4]

    @staticmethod
    def extract_abn(text: str) -> str | None:
        """Finds 11-digit Australian Business Number."""
        m = re.search(r"(?:ABN[:\s]*|abn\s+)(\d{2}[\s\d]{9,12})", text, re.IGNORECASE)
        if m:
            raw = re.sub(r"\D", "", m.group(1))
            if len(raw) == 11:
                return f"{raw[:2]} {raw[2:5]} {raw[5:8]} {raw[8:]}"
        m2 = re.search(r"\b(\d{2}\s?\d{3}\s?\d{3}\s?\d{3})\b", text)
        if m2:
            raw = re.sub(r"\D", "", m2.group(1))
            if len(raw) == 11:
                return f"{raw[:2]} {raw[2:5]} {raw[5:8]} {raw[8:]}"
        return None

    @staticmethod
    def extract_invoice_number(text: str) -> str | None:
        """Extracts Invoice, Receipt, PO, or Reference number."""
        patterns = [
            r"(?:Reference|Ref\.?|Ref\s+No\.?|Reference\s+ID)[:\s\n\-#]*([A-Za-z0-9\-]+)",
            r"(?:Tax\s+Invoice\s+(?:number|no\.?|#|id)|Invoice\s+(?:number|no\.?|#|id))[:\s\n\-#]*([A-Za-z0-9\-]+)",
            r"\b(INV-[A-Za-z0-9\-]+)\b",
            r"\b(REC-[A-Za-z0-9\-]+)\b",
            r"(?:Receipt\s+(?:number|no\.?|#|id))[:\s\n\-#]*([A-Za-z0-9\-]+)",
            r"(?:Statement\s+(?:number|no\.?|#|id))[:\s\n\-#]*([A-Za-z0-9\-]+)",
            r"(?:Account\s+(?:number|no\.?|#|id)|Account\s+Number)[:\s\n\-#]*([A-Za-z0-9\-]+)",
            r"(?:Purchase\s+order|PO\s*(?:#|number)?)[:\s\n\-#]*([A-Za-z0-9\-]+)",
        ]
        blacklist = {"total", "number", "date", "terms", "currency", "due", "details", "from", "attached", "payment", "used", "ses"}
        for pat in patterns:
            for m in re.finditer(pat, text, re.IGNORECASE):
                val = m.group(1).strip()
                if len(val) >= 3 and val.lower() not in blacklist:
                    return val
        return None

    @staticmethod
    def extract_bank_details(text: str) -> dict[str, str]:
        """Extracts Australian bank payment details."""
        bank_info: dict[str, str] = {}
        m_bsb = re.search(r"\bBSB[:\s\n]*(\d{3}[\s\-]?\d{3})\b", text, re.IGNORECASE)
        if m_bsb:
            bank_info["bsb"] = m_bsb.group(1).strip()
        m_acc = re.search(r"(?:Account\s+number|Acc\s+no\.?|Account\s+#)[:\s\n]*(\d{5,12})\b", text, re.IGNORECASE)
        if m_acc:
            bank_info["account_number"] = m_acc.group(1).strip()
        m_acc_name = re.search(r"Account\s+name[:\s\n]*([A-Za-z0-9\s&'\.\-]+?)(?:\s+BSB|\s+Account|\n|$)", text, re.IGNORECASE)
        if m_acc_name:
            bank_info["account_name"] = m_acc_name.group(1).strip()
        m_bank = re.search(r"(?:Bank\s+Name|Bank)[:\s\-]+([A-Za-z0-9\s&'\(\)\.\-]+?)(?:\s+Account|\s+BSB|\s+Payment|\n|$)", text, re.IGNORECASE)
        if m_bank:
            bname = m_bank.group(1).strip()
            if 2 < len(bname) < 40 and not any(w in bname.lower() for w in ("details", "fee", "expense", "account", "charge", "statement", "used")):
                bank_info["bank_name"] = bname
        return bank_info

    @staticmethod
    def extract_financial_breakdown(text: str) -> dict[str, Any]:
        """Extracts total amount, GST, and subtotal."""
        res: dict[str, Any] = {}
        # Total
        m_total = re.search(
            r"(?:TOTAL\s+DUE|Total\s+Amount|Total\s+AUD|Total\s+Payable|Amount\s+Due|Net\s+Payout|Total\s+assets|Total)[\s\n:—\-]*[$]?([0-9,]+\.[0-9]{2})",
            text,
            re.IGNORECASE,
        )
        if not m_total:
            m_total = re.search(r"Total[\s\n—\-]+(?:Debits|Credits)[\s\n:—\-]*[$]?([0-9,]+(?:\.[0-9]{2})?)", text, re.IGNORECASE)
        if m_total:
            try:
                res["total"] = float(m_total.group(1).replace(",", ""))
            except ValueError:
                pass

        # Subtotal
        m_sub = re.search(r"(?:Subtotal|Sub-total|Net\s+Amount)[:\s\n]*[$]?([0-9,]+\.[0-9]{2})", text, re.IGNORECASE)
        if m_sub:
            try:
                res["subtotal"] = float(m_sub.group(1).replace(",", ""))
            except ValueError:
                pass

        # GST
        m_gst = re.search(r"(?:Includes\s+GST|incl\s+GST|GST\s*(?:\([^)]+\))?|GST\s+component)[:\s\n]*[$]?([0-9,]+\.[0-9]{2})", text, re.IGNORECASE)
        if m_gst:
            try:
                res["gst"] = float(m_gst.group(1).replace(",", ""))
            except ValueError:
                pass

        return res

    @classmethod
    def analyze_entities(cls, email: EmailRecord) -> dict[str, Any]:
        """Extracts key business entities from email text and any attached documents."""
        attachment_texts = []
        for att in email.attachments:
            payload = att.ibex_compatible_payload or {}
            txt = payload.get("extracted_text") or ""
            if not txt and att.storage_path and os.path.exists(att.storage_path):
                try:
                    from email_triage.ingestion.document_extractor import DocumentExtractor
                    txt = DocumentExtractor().extract_text_from_file(att.storage_path)
                    if not att.ibex_compatible_payload:
                        att.ibex_compatible_payload = {}
                    att.ibex_compatible_payload["extracted_text"] = txt
                    log.info("Extracted %d chars from attachment %s", len(txt), att.filename)
                except Exception as exc:
                    log.warning("Could not extract text from attachment %s: %s", att.filename, exc)
            if txt:
                attachment_texts.append(txt)

        combined_text = f"{email.subject}\n{email.body_plain}\n\n" + "\n\n".join(attachment_texts)

        due_date = cls.extract_due_date(combined_text)
        amounts = cls.extract_amounts(combined_text)
        companies = cls.extract_companies(combined_text)
        abn = cls.extract_abn(combined_text)
        invoice_number = cls.extract_invoice_number(combined_text)
        bank_details = cls.extract_bank_details(combined_text)
        financials = cls.extract_financial_breakdown(combined_text)

        entities: dict[str, Any] = {}
        if due_date:
            entities["due_date"] = due_date
        if amounts:
            entities["amounts"] = amounts
        if companies:
            entities["companies"] = companies
            entities["supplier_name"] = companies[0]
        if abn:
            entities["abn"] = abn
        if invoice_number:
            entities["invoice_number"] = invoice_number
        if bank_details:
            entities["bank_details"] = bank_details
        if financials:
            entities["financial_breakdown"] = financials
            if "total" in financials:
                entities["total_amount"] = f"${financials['total']:,.2f}"
            if "subtotal" in financials:
                entities["subtotal"] = f"${financials['subtotal']:,.2f}"
            if "gst" in financials:
                entities["gst"] = f"${financials['gst']:,.2f}"
        if email.attachments:
            entities["attachment_source"] = email.attachments[0].filename
        if email.sender_name:
            entities["sender_name"] = email.sender_name

        return entities

    @staticmethod
    def detect_action_flags(
        email: EmailRecord,
        category: EmailCategory | None = None,
        priority: Priority | None = None,
    ) -> tuple[bool, bool, bool]:
        """Returns (action_required, response_required, follow_up_required)."""
        text = f"{email.subject} {email.body_plain}"
        action_req = bool(
            ACTION_SIGNALS.search(text)
            or (category in (EmailCategory.ACTION_REQUIRED, EmailCategory.URGENT))
            or (priority == Priority.CRITICAL)
        )
        response_req = bool(RESPONSE_SIGNALS.search(text) or action_req)
        followup_req = bool(FOLLOWUP_SIGNALS.search(text) or (category == EmailCategory.FOLLOW_UP_REQUIRED))
        return action_req, response_req, followup_req
