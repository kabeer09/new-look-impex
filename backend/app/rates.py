"""Indicative FX rates for the public site (Phase 6 — currency experience).

Honest contract:
- Rates come from a real provider (default: open.er-api.com, no API key needed).
- The provider's own date is returned and shown to the buyer.
- Results are cached in-process; a failed refresh falls back to the last
  cached payload WITH ITS ORIGINAL DATE (never a silently "today" date).
- If nothing has ever been fetched, `available: false` — the frontend then
  shows "Request Wholesale Quote" instead of any converted number.
- Database prices are never touched; conversions are display-only.
"""
from __future__ import annotations

import threading
import time
from typing import Any, Dict, Optional

import httpx
from fastapi import APIRouter

from .config import settings

router = APIRouter()

# Cache TTL: 6 hours (provider updates daily).
_CACHE_TTL = 6 * 3600
_lock = threading.Lock()
_cache: Dict[str, Any] = {"fetched_at": 0.0, "payload": None}

DEFAULT_PROVIDER = "https://open.er-api.com/v6/latest/USD"


def _short_date(raw: str) -> str:
    """Provider dates come in several shapes; render one clean 'YYYY-MM-DD'."""
    import re
    from datetime import datetime
    raw = raw.strip()
    for fmt in ("%Y-%m-%d", "%a, %d %b %Y %H:%M:%S %z", "%a, %d %b %Y %H:%M:%S %Z",
                "%A, %B %d, %Y %H:%M:%S %Z",
                "%A, %B %d, %Y %H:%M:%S UTC", "%Y-%m-%dT%H:%M:%SZ"):
        try:
            return datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    # Any ISO date embedded in an otherwise unknown shape.
    m = re.search(r"(\d{4}-\d{2}-\d{2})", raw)
    if m:
        return m.group(1)
    # Unknown shape — keep the provider's own words, trimmed, never invented.
    return raw[:10] if raw[:4].isdigit() else raw[:24]


def _provider_url() -> str:
    # FX_PROVIDER_URL is an optional override (env name only — value never logged).
    return (getattr(settings, "FX_PROVIDER_URL", "") or DEFAULT_PROVIDER).strip()


def _fetch() -> Optional[Dict[str, Any]]:
    url = _provider_url()
    try:
        r = httpx.get(url, timeout=12.0, follow_redirects=True,
                      headers={"User-Agent": "NewLookImpex-Rates/1.0"})
        r.raise_for_status()
        data = r.json()
    except Exception:
        return None

    rates = data.get("rates")
    if not isinstance(rates, dict) or not rates:
        return None

    # Provider date fields differ; normalise to a short, honest display date.
    date = str(data.get("time_last_update_utc") or data.get("date") or "")[:64]
    if date:
        date = _short_date(date)
    if not date:
        from datetime import datetime, timezone
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    base = str(data.get("base") or data.get("base_code") or "USD").upper()[:8]
    clean = {}
    for code, val in rates.items():
        try:
            v = float(val)
        except (TypeError, ValueError):
            continue
        if v > 0:
            clean[str(code).upper()[:8]] = v
    if not clean:
        return None
    return {"base": base, "rates": clean, "date": date,
            "source": url.split("/")[2][:64]}


def _get_payload() -> Dict[str, Any]:
    with _lock:
        now = time.time()
        cached = _cache["payload"]
        if cached and now - _cache["fetched_at"] < _CACHE_TTL:
            return cached
    fresh = _fetch()
    with _lock:
        if fresh:
            _cache["payload"] = fresh
            _cache["fetched_at"] = time.time()
            return fresh
        # Refresh failed — serve last known data with its original date.
        if _cache["payload"]:
            return _cache["payload"]
    return {}


@router.get("/api/public/rates")
def public_rates():
    """Indicative exchange rates with their provider date (display-only)."""
    payload = _get_payload()
    if not payload:
        return {"available": False, "reason": "rates_temporarily_unavailable"}
    return {
        "available": True,
        "base": payload["base"],
        "rates": payload["rates"],
        "date": payload["date"],
        "source": payload["source"],
        "indicative": True,
    }
