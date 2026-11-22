"""Buyer quotation currencies the public site accepts as a *preference*.

`preferred_currency` is metadata only: it records which currency the buyer
asked to be quoted in. It never converts, never stores or rewrites a product
price, and never invents a figure — live conversion for display is handled by
`rates.py` with the provider's own date attached.
"""
from __future__ import annotations

from typing import Iterable, Tuple

ALLOWED_CURRENCIES: Tuple[str, ...] = ("USD", "GBP", "AED", "AUD", "CAD", "EUR", "INR")


def clean_currency(raw: object) -> str:
    """Normalise a submitted currency to an allowlisted code, else empty."""
    c = str(raw or "").strip().upper()[:8]
    return c if c in ALLOWED_CURRENCIES else ""


def is_allowed(raw: object) -> bool:
    return bool(clean_currency(raw))
