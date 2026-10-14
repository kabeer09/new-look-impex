"""Google Sign-In (OAuth 2.0 authorization code flow) for admin dashboard users.

Security properties:
- Disabled unless GOOGLE_LOGIN_ENABLED=true (explicit opt-in).
- Only allow-listed emails may sign in (GOOGLE_ALLOWED_EMAILS, else ADMIN_EMAIL).
- Google must report the email as verified.
- CSRF protection via HMAC-signed, timestamped, single-purpose `state`
  (stateless — no server-side session, works behind multi-worker servers).
- ADMIN_EMAIL always receives the admin role; other allow-listed users get
  editor and can be promoted by an admin via PUT /api/users/{id}/role.
- Never trusts client-supplied email/role — identity comes from Google's
  userinfo endpoint over HTTPS using the exchanged access token.
"""
from __future__ import annotations
import base64
import hashlib
import hmac
import secrets
import time
from urllib.parse import urlencode

import httpx

from .config import settings

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
STATE_TTL_S = 600  # 10 minutes


def login_redirect_uri() -> str:
    if settings.GOOGLE_LOGIN_REDIRECT_URI.strip():
        return settings.GOOGLE_LOGIN_REDIRECT_URI.strip()
    return settings.API_BASE_URL.rstrip("/") + "/api/auth/google/callback"


def allowed_emails() -> set[str]:
    raw = [e.strip().lower() for e in settings.GOOGLE_ALLOWED_EMAILS.split(",")]
    allow = {e for e in raw if e}
    allow.add(settings.ADMIN_EMAIL.strip().lower())
    return allow


def google_login_available() -> tuple[bool, str]:
    """Returns (available, reason). Reason is a safe, non-secret message."""
    if not settings.GOOGLE_LOGIN_ENABLED:
        return False, "Google sign-in is disabled (GOOGLE_LOGIN_ENABLED=false)."
    if not (settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET):
        return False, "Google OAuth client is not configured."
    return True, "ok"


def _sign(payload: str) -> str:
    return hmac.new(settings.SECRET_KEY.encode(), payload.encode(),
                    hashlib.sha256).hexdigest()


def make_state() -> str:
    """Create a signed state token: base64url(nonce . timestamp . signature)."""
    nonce = secrets.token_urlsafe(24)
    ts = str(int(time.time()))
    sig = _sign(f"{nonce}.{ts}")
    return base64.urlsafe_b64encode(f"{nonce}.{ts}.{sig}".encode()).decode()


def verify_state(state: str) -> bool:
    try:
        decoded = base64.urlsafe_b64decode(state.encode()).decode()
        nonce, ts, sig = decoded.split(".")
        if not hmac.compare_digest(sig, _sign(f"{nonce}.{ts}")):
            return False
        if abs(int(time.time()) - int(ts)) > STATE_TTL_S:
            return False
        return True
    except Exception:
        return False


def build_login_url() -> str:
    params = urlencode({
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": login_redirect_uri(),
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
        "prompt": "select_account",
        "state": make_state(),
    })
    return GOOGLE_AUTH_URL + "?" + params


def exchange_code(code: str) -> dict:
    """Exchange an authorization code for tokens. Raises on failure."""
    r = httpx.post(GOOGLE_TOKEN_URL, data={
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": login_redirect_uri(),
        "grant_type": "authorization_code",
    }, timeout=30)
    r.raise_for_status()
    return r.json()


def fetch_userinfo(access_token: str) -> dict:
    """Return Google's verified profile. Raises on failure."""
    r = httpx.get(GOOGLE_USERINFO_URL,
                  headers={"Authorization": f"Bearer {access_token}"},
                  timeout=30)
    r.raise_for_status()
    return r.json()
