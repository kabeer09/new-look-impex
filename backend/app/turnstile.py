"""Cloudflare Turnstile verification for form spam protection.

Turnstile is a privacy-preserving CAPTCHA alternative. The frontend renders a
Turnstile widget on each protected form; on submit, the token is sent to the
backend which verifies it with Cloudflare's /siteverify endpoint.

Required env vars:
  TURNSTILE_SECRET_KEY   -- Cloudflare Turnstile secret key (server-side only)
  TURNSTILE_SITE_KEY     -- Cloudflare Turnstile site key (frontend renders widget)

Get keys from: https://dash.cloudflare.com/ -> Turnstile -> Add site
"""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from typing import Optional

import httpx

from .config import settings

TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def verify_turnstile_token(token: str, remote_ip: Optional[str] = None) -> bool:
    """Verify a Turnstile token with Cloudflare.

    Returns True if the token is valid and the action succeeded.
    Returns False for invalid, expired, or missing tokens.
    Never raises — honest failure reporting.
    """
    if not token or not settings.TURNSTILE_SECRET_KEY:
        # No secret configured -> cannot verify; deny to be safe
        return False

    try:
        data = {
            "secret": settings.TURNSTILE_SECRET_KEY,
            "response": token,
        }
        if remote_ip:
            data["remoteip"] = remote_ip

        with httpx.Client(timeout=10) as client:
            resp = client.post(TURNSTILE_VERIFY_URL, data=data)
            resp.raise_for_status()
            result = resp.json()

        return bool(result.get("success"))
    except Exception:
        # Network error, malformed response, etc. — deny safely
        return False


def require_turnstile(token: Optional[str], remote_ip: Optional[str] = None) -> None:
    """Dependency helper: raises HTTPException(400) if Turnstile verification fails.

    Call this at the top of any form-submit endpoint that needs protection.
    """
    from fastapi import HTTPException

    if not verify_turnstile_token(token, remote_ip):
        raise HTTPException(
            status_code=400,
            detail="Invalid or missing verification token. Please complete the security check and try again.",
        )


# ---------------------------------------------------------------------------
# Honeypot field support
# ---------------------------------------------------------------------------

HONEYPOT_FIELD_NAME = "website_url"  # looks innocuous, hidden via CSS
HONEYPOT_FIELD_LABEL = "Website URL"


def honeypot_field_html() -> str:
    """Return HTML for a hidden honeypot field. Bots fill it; humans don't see it."""
    return (
        '<div style="position:absolute; left:-9999px; top:-9999px; width:1px; height:1px; '
        'overflow:hidden;" aria-hidden="true">'
        '<label for="website_url">Website URL</label>'
        '<input type="text" id="website_url" name="website_url" tabindex="-1" autocomplete="off" />'
        "</div>"
    )


def check_honeypot(website_url: Optional[str]) -> None:
    """If the honeypot field contains any text, the submission is from a bot.

    Raises HTTPException(400).
    """
    from fastapi import HTTPException

    if website_url and str(website_url).strip():
        raise HTTPException(
            status_code=400,
            detail="Invalid submission detected.",
        )


# ---------------------------------------------------------------------------
# HMAC-signed anti-replay token for sensitive actions
# ---------------------------------------------------------------------------

def _hmac_sign(data: str, secret: str) -> str:
    return hmac.new(secret.encode(), data.encode(), hashlib.sha256).hexdigest()


def make_anti_replay_token(user_id: str, action: str, secret: str, ttl_seconds: int = 300) -> str:
    """Create a signed, timestamped token for one-time sensitive actions
    (e.g. password reset, admin role change).

    Format: user_id:action:timestamp:signature
    """
    ts = str(int(time.time()))
    payload = f"{user_id}:{action}:{ts}"
    sig = _hmac_sign(payload, secret)
    return f"{payload}:{sig}"


def verify_anti_replay_token(
    token: str,
    user_id: str,
    action: str,
    secret: str,
    ttl_seconds: int = 300,
    used_tokens: Optional[set] = None,
) -> bool:
    """Verify an anti-replay token. Returns True if valid and not replayed.

    Optionally pass a `used_tokens` set (e.g. Redis-backed) to enforce
    single-use. If provided, the token is added after successful verification.
    """
    from fastapi import HTTPException

    if not token:
        return False

    parts = token.split(":")
    if len(parts) != 4:
        return False

    token_user_id, token_action, token_ts, token_sig = parts

    # Constant-time compare of user_id and action
    if not hmac.compare_digest(token_user_id, user_id):
        return False
    if not hmac.compare_digest(token_action, action):
        return False

    # Check expiry
    try:
        ts_val = int(token_ts)
    except ValueError:
        return False

    now = int(time.time())
    if now - ts_val > ttl_seconds:
        return False
    if ts_val > now + 60:  # clock skew tolerance
        return False

    # Verify signature
    payload = f"{token_user_id}:{token_action}:{token_ts}"
    expected_sig = _hmac_sign(payload, secret)
    if not hmac.compare_digest(token_sig, expected_sig):
        return False

    # Single-use check
    if used_tokens is not None:
        if token in used_tokens:
            return False
        used_tokens.add(token)

    return True
