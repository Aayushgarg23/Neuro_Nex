"""
Document Parser — extracts plain text from uploaded files.
Supports PDF (via pdfplumber), CSV, JSON, TXT, DOCX.
Falls back to raw bytes decode for unknown formats.
"""
import io
import csv
import json as json_mod
from typing import Tuple


def extract_text(filename: str, file_bytes: bytes) -> Tuple[str, str]:
    """
    Extract text from uploaded file bytes.
    Returns (text_content, detected_type).
    """
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "txt"

    try:
        if ext == "pdf":
            return _parse_pdf(file_bytes), "pdf"
        elif ext == "csv":
            return _parse_csv(file_bytes), "csv"
        elif ext in ("json", "jsonl"):
            return _parse_json(file_bytes), "json"
        elif ext in ("docx",):
            return _parse_docx(file_bytes), "docx"
        else:
            return file_bytes.decode("utf-8", errors="replace")[:50_000], "text"
    except Exception as exc:
        return f"[Parse error: {exc}]", "error"


def _parse_pdf(data: bytes) -> str:
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            pages = [p.extract_text() or "" for p in pdf.pages[:30]]
        return "\n\n".join(p for p in pages if p.strip())[:50_000]
    except ImportError:
        # pdfplumber not installed — try plain decode
        return data.decode("utf-8", errors="replace")[:10_000]


def _parse_csv(data: bytes) -> str:
    text = data.decode("utf-8", errors="replace")
    reader = csv.reader(io.StringIO(text))
    rows = [", ".join(row) for row in reader]
    return "\n".join(rows[:500])  # max 500 rows


def _parse_json(data: bytes) -> str:
    try:
        obj = json_mod.loads(data.decode("utf-8", errors="replace"))
        return json_mod.dumps(obj, indent=2)[:50_000]
    except Exception:
        return data.decode("utf-8", errors="replace")[:50_000]


def _parse_docx(data: bytes) -> str:
    try:
        import docx
        doc = docx.Document(io.BytesIO(data))
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())[:50_000]
    except ImportError:
        return data.decode("utf-8", errors="replace")[:10_000]
