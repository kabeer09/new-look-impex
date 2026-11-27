"""Tests for the secure Google Search Console integration (no real API calls)."""
import json
import time
from datetime import date

from fastapi.testclient import TestClient

from app import models
from app.config import settings
from app.database import SessionLocal
from app.gsc import oauth
from app.main import app

c = TestClient(app)
H: dict = {}


class FakeResponse:
    def __init__(self, status=200, payload=None):
        self.status_code = status
        self._payload = payload or {}

    def json(self):
        return self._payload

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")


def test_state_is_signed_expiring_and_purpose_bound(monkeypatch):
    state, nonce = oauth.make_state()
    assert oauth.verify_state(state) == nonce
    assert oauth.verify_state(state[:-2] + "XX") is None
    assert oauth.verify_state("not-a-state") is None
    now = int(time.time())
    monkeypatch.setattr(oauth.time, "time", lambda: now + oauth.STATE_TTL_S + 5)
    assert oauth.verify_state(state) is None


def test_tokens_are_encrypted_at_rest():
    plain = "ya29.secret-access-token"
    cipher = oauth.encrypt_token(plain)
    assert plain not in cipher
    assert oauth.decrypt_token(cipher) == plain
    assert oauth.decrypt_token("not-a-fernet-token") == ""


def test_refresh_exchange_uses_backend_credentials_only(monkeypatch):
    captured = {}

    def fake_post(url, data=None, timeout=None):
        captured.update(data or {})
        return FakeResponse(200, {"access_token": "new-access", "expires_in": 3600})

    monkeypatch.setattr(oauth.httpx, "post", fake_post)
    result = oauth.refresh_access_token("stored-refresh-token")
    assert result["access_token"] == "new-access"
    assert captured["grant_type"] == "refresh_token"
    assert captured["refresh_token"] == "stored-refresh-token"
    assert "client_id" in captured and "client_secret" in captured


def test_api_request_retries_rate_limit(monkeypatch):
    calls = []

    def fake_request(method, url, **kw):
        calls.append(kw.get("headers", {}))
        return FakeResponse(429) if len(calls) == 1 else FakeResponse(200, {"rows": []})

    monkeypatch.setattr(oauth.httpx, "request", fake_request)
    monkeypatch.setattr(oauth.time, "sleep", lambda _s: None)
    out = oauth.api_request("POST", "https://example.invalid/query", "token-abc", {"x": 1})
    assert out == {"rows": []}
    assert len(calls) == 2
    assert all(c["Authorization"] == "Bearer token-abc" for c in calls)


def test_status_requires_admin_and_is_honest_without_credentials(monkeypatch):
    unauth = TestClient(app)
    assert unauth.get("/api/seo-console/status").status_code in (401, 403)
    monkeypatch.setattr(settings, "GOOGLE_SEARCH_CONSOLE_CLIENT_ID", "")
    r = c.get("/api/seo-console/status", headers=H)
    assert r.status_code == 200
    body = r.json()
    assert body["configured"] is False
    assert "not configured" in body["setup_message"]
    assert "No analytics" in body["note"]


def test_callback_rejects_tampered_state():
    r = c.get("/api/seo-console/oauth/callback?code=abc&state=tampered", follow_redirects=False)
    assert r.status_code == 303
    assert "invalid_state" in r.headers["location"]


def test_oauth_requests_gsc_and_ga4_readonly_scopes(monkeypatch):
    monkeypatch.setattr(settings, "GOOGLE_ANALYTICS_PROPERTY_ID", "563099446")
    monkeypatch.setattr(settings, "GOOGLE_SEARCH_CONSOLE_WRITE_ENABLED", False)
    required = oauth.required_scopes()
    assert oauth.READ_SCOPE in required
    assert oauth.ANALYTICS_SCOPE in required
    assert oauth.WRITE_SCOPE not in required
    assert oauth.missing_scopes("") == required
    assert oauth.missing_scopes(" ".join(required)) == []


def test_ga4_uses_property_and_no_future_dates(monkeypatch):
    from app.gsc import ga4
    monkeypatch.setattr(settings, "GOOGLE_ANALYTICS_PROPERTY_ID", "563099446")
    assert "properties/563099446:runReport" in ga4.report_url()
    start, end, prev_start, prev_end = ga4.date_range("28d")
    assert end < str(date.today())
    assert prev_end < start and prev_start < prev_end


def test_oauth_start_alias_returns_auth_url(monkeypatch):
    monkeypatch.setattr(settings, "GOOGLE_SEARCH_CONSOLE_CLIENT_ID", "cid-test")
    monkeypatch.setattr(settings, "GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET", "secret-test")
    monkeypatch.setattr(settings, "GOOGLE_ANALYTICS_PROPERTY_ID", "563099446")
    r = c.post("/api/seo-console/oauth/start", headers=H)
    assert r.status_code == 200
    assert "accounts.google.com" in r.json()["auth_url"]
    assert "analytics.readonly" in r.json()["auth_url"]
    assert "webmasters.readonly" in r.json()["auth_url"]


def test_preflight_reports_not_connected_without_credentials():
    r = c.get("/api/seo-console/preflight", headers=H)
    assert r.status_code == 200
    body = r.json()
    assert body["gsc"]["ok"] is False
    assert body["ga4"]["ok"] is False


def test_ga4_status_is_honest_without_property(monkeypatch):
    monkeypatch.setattr(settings, "GOOGLE_ANALYTICS_PROPERTY_ID", "")
    r = c.get("/api/seo-console/ga4/status", headers=H)
    assert r.status_code == 200
    assert r.json()["configured"] is False
    assert "not configured" in r.json()["setup_message"]


def test_gsc_rows_keep_real_dates():
    """Regression: cached analytics rows must not all be dated 1970-01-01."""
    from app.gsc import service
    rid = f"gsc-row-test-{time.time_ns()}"
    db = SessionLocal()
    try:
        db.add(models.GscSyncRun(id=rid, site_url="https://www.newlookimpex.store/",
                                 period_start="2026-11-01", period_end="2026-11-28",
                                 status="success"))
        db.commit()
        service._save_rows(db, rid, "https://www.newlookimpex.store/", "query",
                           ["brass bottles", "2026-11-05"],
                           {"clicks": 3, "impressions": 100, "ctr": 0.03, "position": 8.1})
        db.flush()
        row = (db.query(models.GscRow).filter(models.GscRow.run_id == rid,
                                              models.GscRow.dimension_type == "query").first())
        assert row is not None
        assert row.date == "2026-11-05"
        assert row.dimension_value == "brass bottles"
        service._save_rows(db, rid, "https://www.newlookimpex.store/", "totals", [],
                           {"clicks": 3, "impressions": 100}, date_override="2026-11-28")
        db.flush()
        totals = (db.query(models.GscRow).filter(models.GscRow.run_id == rid,
                                                 models.GscRow.dimension_type == "totals").first())
        assert totals.date == "2026-11-28"
    finally:
        db.query(models.GscRow).filter(models.GscRow.run_id == rid).delete()
        db.query(models.GscSyncRun).filter(models.GscSyncRun.id == rid).delete()
        db.commit()
        db.close()


def test_repair_requires_stored_tokens():
    db = SessionLocal()
    try:
        row = db.query(models.GscConnection).first()
        if row is None:
            row = models.GscConnection(); db.add(row)
        row.access_token_enc = ""; row.refresh_token_enc = ""
        db.commit()
    finally:
        db.close()
    r = c.post("/api/seo-console/repair", headers=H)
    assert r.status_code == 400


def test_disconnect_clears_tokens():
    db = SessionLocal()
    try:
        row = db.query(models.GscConnection).first()
        if row is None:
            row = models.GscConnection(); db.add(row)
        row.access_token_enc = oauth.encrypt_token("secret")
        row.refresh_token_enc = oauth.encrypt_token("refresh")
        row.status = "connected"
        db.commit()
    finally:
        db.close()
    r = c.post("/api/seo-console/disconnect", headers=H)
    assert r.status_code == 200
    db = SessionLocal()
    try:
        row = db.query(models.GscConnection).first()
        assert row.status == "disconnected"
        assert row.access_token_enc == "" and row.refresh_token_enc == ""
    finally:
        db.close()
