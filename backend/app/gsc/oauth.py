"""OAuth 2.0 + token security for Google Search Console.

Security properties:
- Credentials are read only from backend environment variables.
- CSRF: HMAC-signed, timestamped, single-purpose `state` plus a one-use nonce
  stored on the connection row (replay protection across restarts/workers).
- `access_type=offline` + `prompt=consent` so a refresh token is returned.
- Refresh tokens and access tokens are Fernet-encrypted at rest. The key is
  derived from the existing SECRET_KEY; no new secret is required.
- No token or client secret is ever logged or returned to the frontend.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from urllib.parse import urlencode

import httpx
from cryptography.fernet import Fernet, InvalidToken

from ..config import settings

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
STATE_TTL_S = 600
READ_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly"
WRITE_SCOPE = "https://www.googleapis.com/auth/webmasters"
ANALYTICS_SCOPE = "https://www.googleapis.com/auth/analytics.readonly"
PURPOSE = "nli-gsc-oauth-v1"


class GscError(Exception):
    """Safe error: message never contains tokens or client secrets."""

    def __init__(self, message: str, status: int | None = None):
        self.status = status
        super().__init__(message[:300])


def configured() -> tuple[bool, str]:
    if not (settings.GOOGLE_SEARCH_CONSOLE_CLIENT_ID and settings.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET):
        return False, ("Google Search Console OAuth is not configured. Set "
                       "GOOGLE_SEARCH_CONSOLE_CLIENT_ID and GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET.")
    return True, "ok"


def redirect_uri() -> str:
    if settings.GOOGLE_SEARCH_CONSOLE_REDIRECT_URI.strip():
        return settings.GOOGLE_SEARCH_CONSOLE_REDIRECT_URI.strip()
    return settings.API_BASE_URL.rstrip("/") + "/api/seo-console/oauth/callback"


def site_url() -> str:
    return (settings.GOOGLE_SEARCH_CONSOLE_SITE_URL or settings.GSC_SITE_URL
            or "https://www.newlookimpex.store/").strip()


def required_scopes() -> list[str]:
    """Minimum scopes this integration needs. GSC readonly is always preserved;
    GA4 readonly is added when a property is configured; webmasters write is
    added only for explicit sitemap submission."""
    custom = settings.GOOGLE_SEARCH_CONSOLE_SCOPES.strip()
    scopes_list = [custom or READ_SCOPE]
    if settings.GOOGLE_SEARCH_CONSOLE_WRITE_ENABLED and WRITE_SCOPE not in scopes_list:
        scopes_list.append(WRITE_SCOPE)
    if settings.GOOGLE_ANALYTICS_PROPERTY_ID and ANALYTICS_SCOPE not in scopes_list:
        scopes_list.append(ANALYTICS_SCOPE)
    return scopes_list


def scopes() -> str:
    return " ".join(required_scopes())


def missing_scopes(granted: str | None) -> list[str]:
    granted_set = set((granted or "").split())
    return [s for s in required_scopes() if s not in granted_set]


def _sign(payload: str) -> str:
    return hmac.new(settings.SECRET_KEY.encode(), f"{PURPOSE}.{payload}".encode(),
                    hashlib.sha256).hexdigest()


def make_state() -> tuple[str, str]:
    """Return (state, nonce). The nonce must be stored on the connection."""
    nonce = secrets.token_urlsafe(24)
    ts = str(int(time.time()))
    token = f"{nonce}.{ts}.{_sign(f'{nonce}.{ts}')}"
    return base64.urlsafe_b64encode(token.encode()).decode(), nonce


def verify_state(state: str) -> str | None:
    """Validate HMAC + expiry and return the nonce, or None."""
    try:
        raw = base64.urlsafe_b64decode(state.encode()).decode()
        nonce, ts, sig = raw.split(".")
        if not hmac.compare_digest(sig, _sign(f"{nonce}.{ts}")):
            return None
        if abs(int(time.time()) - int(ts)) > STATE_TTL_S:
            return None
        return nonce
    except Exception:
        return None


def _fernet() -> Fernet:
    key = hashlib.sha256((settings.SECRET_KEY + "|gsc-token-encryption").encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key))


def encrypt_token(plain: str) -> str:
    if not plain:
        return ""
    return _fernet().encrypt(plain.encode()).decode()


def decrypt_token(cipher: str) -> str:
    if not cipher:
        return ""
    try:
        return _fernet().decrypt(cipher.encode()).decode()
    except (InvalidToken, ValueError, TypeError):
        return ""


def build_auth_url(state: str) -> str:
    params = urlencode({
        "client_id": settings.GOOGLE_SEARCH_CONSOLE_CLIENT_ID,
        "redirect_uri": redirect_uri(),
        "response_type": "code",
        "scope": scopes(),
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
        "state": state,
    })
    return AUTH_URL + "?" + params


def _token_request(data: dict) -> dict:
    try:
        r = httpx.post(TOKEN_URL, data={
            **data,
            "client_id": settings.GOOGLE_SEARCH_CONSOLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET,
        }, timeout=30)
    except httpx.HTTPError as e:
        raise GscError(f"Google token endpoint unreachable: {type(e).__name__}")
    if r.status_code >= 400:
        # Google's error body contains no secret, but keep it short and generic.
        raise GscError(f"Google OAuth rejected the request (HTTP {r.status_code}).", r.status_code)
    payload = r.json()
    if not payload.get("access_token"):
        raise GscError("Google OAuth returned no access token.")
    return payload


def exchange_code(code: str) -> dict:
    return _token_request({
        "code": code,
        "redirect_uri": redirect_uri(),
        "grant_type": "authorization_code",
    })


def refresh_access_token(refresh_token: str) -> dict:
    if not refresh_token:
        raise GscError("No refresh token is stored. Reconnect Google Search Console.")
    return _token_request({"refresh_token": refresh_token, "grant_type": "refresh_token"})


def api_request(method: str, url: str, access_token: str,
                json_body: dict | None = None, params: dict | None = None) -> dict:
    """Google API call with bounded retry on 429/5xx. Never logs the token."""
    last_status = None
    for attempt in range(3):
        try:
            r = httpx.request(method, url,
                              headers={"Authorization": f"Bearer {access_token}"},
                              json=json_body, params=params, timeout=60)
        except httpx.HTTPError as e:
            if attempt == 2:
                raise GscError(f"Google API unreachable: {type(e).__name__}")
            time.sleep(0.5 * (attempt + 1))
            continue
        last_status = r.status_code
        if r.status_code == 429 or r.status_code >= 500:
            if attempt < 2:
                time.sleep(0.5 * (attempt + 1))
                continue
            raise GscError(f"Google API rate limit / server error (HTTP {r.status_code}).", r.status_code)
        if r.status_code >= 400:
            try:
                body = r.json()
                errors = body.get("error", {}).get("errors", []) or []
                reason = errors[0].get("reason", "") if errors else ""
                if reason == "apiNotEnabled":
                    raise GscError("Google Analytics Data API is not enabled in this Cloud project.", r.status_code)
                if reason in ("insufficientPermissions", "forbidden"):
                    raise GscError("Connected Google account lacks permission for this property/API.", r.status_code)
            except ValueError:
                pass
            raise GscError(f"Google API request failed (HTTP {r.status_code}). Check permissions and property URL.", r.status_code)
        try:
            return r.json()
        except ValueError:
            return {}
    raise GscError(f"Google API request failed (HTTP {last_status}).", last_status)
