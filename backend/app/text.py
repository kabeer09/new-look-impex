"""Slug + text helpers."""
import re
import unicodedata


def slugify(text: str, max_len: int = 120) -> str:
    text = unicodedata.normalize("NFKD", text or "")
    text = text.replace("décor", "decor").replace("Désign", "Design")
    text = re.sub(r"[^\w\s-]", "", text.lower()).strip()
    text = re.sub(r"[-\s]+", "-", text)
    return text[:max_len].strip("-") or "item"


def truncate(text: str, n: int) -> str:
    text = text or ""
    return text if len(text) <= n else text[: n - 1].rstrip() + "…"
