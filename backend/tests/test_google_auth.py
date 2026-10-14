"""Google Sign-In tests. Google HTTP calls are mocked — no credentials needed."""
import re
from urllib.parse import urlparse, parse_qs

from fastapi.testclient import TestClient

import app.google_auth as ga
from app.config import settings
from app.main import app
from app.database import Base, engine, SessionLocal
from app import models
from app.auth import hash_pw

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
db = SessionLocal()
db.add(models.User(email="admin@test.example", password_hash=hash_pw("Secret123!"), role="admin"))
db.commit()
db.close()

c = TestClient(app, follow_redirects=False)
tok = c.post("/api/auth/login", json={"email": "admin@test.example", "password": "Secret123!"}).json()["access_token"]
H = {"Authorization": f"Bearer {tok}"}

OLD = (settings.GOOGLE_LOGIN_ENABLED, settings.GOOGLE_CLIENT_ID,
       settings.GOOGLE_CLIENT_SECRET, settings.GOOGLE_ALLOWED_EMAILS,
       settings.ADMIN_EMAIL)


def _enable(admin_email="owner@example.com", allowed="teammate@example.com"):
    settings.GOOGLE_LOGIN_ENABLED = True
    settings.GOOGLE_CLIENT_ID = "test-client-id"
    settings.GOOGLE_CLIENT_SECRET = "test-secret"
    settings.GOOGLE_ALLOWED_EMAILS = allowed
    settings.ADMIN_EMAIL = admin_email


def _disable():
    (settings.GOOGLE_LOGIN_ENABLED, settings.GOOGLE_CLIENT_ID,
     settings.GOOGLE_CLIENT_SECRET, settings.GOOGLE_ALLOWED_EMAILS,
     settings.ADMIN_EMAIL) = OLD


def _mock_google(monkeypatch, email="teammate@example.com", verified=True):
    monkeypatch.setattr(ga, "exchange_code", lambda code: {"access_token": "mock-at"})
    monkeypatch.setattr(ga, "fetch_userinfo",
                        lambda at: {"email": email, "email_verified": verified,
                                    "name": "Teammate User"})


def _callback(monkeypatch, **kw):
    from app.main import app as _app  # noqa
    state = ga.make_state()
    return c.get("/api/auth/google/callback",
                 params={"code": "mock-code", "state": state, **kw})


def test_disabled_by_default():
    _disable()
    r = c.get("/api/auth/google/status")
    assert r.status_code == 200
    assert r.json()["enabled"] is False
    assert c.get("/api/auth/google/url").status_code == 400
    from app.main import app as _app  # noqa
    assert c.get("/api/auth/google/callback",
                 params={"code": "x", "state": ga.make_state()}).status_code == 400


def test_login_url_contains_required_params():
    _enable()
    try:
        r = c.get("/api/auth/google/url")
        assert r.status_code == 200
        url = r.json()["auth_url"]
        assert url.startswith("https://accounts.google.com/")
        qs = parse_qs(urlparse(url).query)
        assert qs["client_id"] == ["test-client-id"]
        assert qs["response_type"] == ["code"]
        assert "openid" in qs["scope"][0] and "email" in qs["scope"][0]
        assert qs["state"][0]  # CSRF state present
    finally:
        _disable()


def test_state_roundtrip_and_expiry():
    assert ga.verify_state(ga.make_state()) is True
    assert ga.verify_state("garbage") is False
    assert ga.verify_state("") is False


def test_callback_rejects_bad_state():
    _enable()
    try:
        assert c.get("/api/auth/google/callback",
                     params={"code": "x", "state": "tampered"}).status_code == 400
        assert c.get("/api/auth/google/callback",
                     params={"code": "x"}).status_code == 400
    finally:
        _disable()


def test_allowlisted_user_created_as_editor_and_gets_jwt(monkeypatch):
    _enable()
    _mock_google(monkeypatch, email="teammate@example.com", verified=True)
    try:
        r = _callback(monkeypatch)
        assert r.status_code == 302, r.text
        loc = r.headers["location"]
        assert "token=" in loc and "error=" not in loc
        m = re.search(r"token=([^&]+)", loc)
        jwt = m.group(1)
        me = c.get("/api/auth/me", headers={"Authorization": f"Bearer {jwt}"})
        assert me.status_code == 200
        assert me.json() == {"email": "teammate@example.com", "role": "editor"}
    finally:
        _disable()


def test_admin_email_gets_admin_role(monkeypatch):
    _enable(admin_email="owner@example.com", allowed="")
    _mock_google(monkeypatch, email="owner@example.com", verified=True)
    try:
        r = _callback(monkeypatch)
        assert r.status_code == 302
        jwt = re.search(r"token=([^&]+)", r.headers["location"]).group(1)
        me = c.get("/api/auth/me", headers={"Authorization": f"Bearer {jwt}"})
        assert me.json()["role"] == "admin"
    finally:
        _disable()


def test_non_allowlisted_email_rejected(monkeypatch):
    _enable()
    _mock_google(monkeypatch, email="stranger@example.com", verified=True)
    try:
        r = _callback(monkeypatch)
        assert r.status_code == 302
        assert "error=not_allowed" in r.headers["location"]
        assert "token=" not in r.headers["location"]
        # no user row created for strangers
        db = SessionLocal()
        assert db.query(models.User).filter(
            models.User.email == "stranger@example.com").first() is None
        db.close()
    finally:
        _disable()


def test_unverified_email_rejected(monkeypatch):
    _enable()
    _mock_google(monkeypatch, email="teammate@example.com", verified=False)
    try:
        r = _callback(monkeypatch)
        assert r.status_code == 302
        assert "error=email_unverified" in r.headers["location"]
    finally:
        _disable()


def test_existing_local_user_linked(monkeypatch):
    _enable(admin_email="admin@test.example", allowed="")
    _mock_google(monkeypatch, email="admin@test.example", verified=True)
    try:
        r = _callback(monkeypatch)
        assert r.status_code == 302
        assert "token=" in r.headers["location"]
        db = SessionLocal()
        u = db.query(models.User).filter(
            models.User.email == "admin@test.example").first()
        assert u.auth_provider == "google"
        assert u.role == "admin"  # existing role preserved
        db.close()
        # password login still works after linking
        ok = c.post("/api/auth/login", json={"email": "admin@test.example",
                                             "password": "Secret123!"})
        assert ok.status_code == 200
    finally:
        _disable()


def test_google_user_cannot_password_login(monkeypatch):
    _enable()
    _mock_google(monkeypatch, email="teammate@example.com", verified=True)
    try:
        _callback(monkeypatch)
        bad = c.post("/api/auth/login", json={"email": "teammate@example.com",
                                              "password": "anything"})
        assert bad.status_code == 401
    finally:
        _disable()


def test_user_management_endpoints():
    users = c.get("/api/users", headers=H)
    assert users.status_code == 200
    assert any(u["email"] == "admin@test.example" for u in users.json()["items"])
    # editor role management is admin-only
    assert c.get("/api/users").status_code in (401, 403)
    # promote / demote flow
    db = SessionLocal()
    db.add(models.User(email="temp@example.com", password_hash=hash_pw("x"),
                       role="viewer"))
    db.commit()
    tid = db.query(models.User).filter(
        models.User.email == "temp@example.com").first().id
    db.close()
    r = c.put(f"/api/users/{tid}/role", json={"role": "editor"}, headers=H)
    assert r.status_code == 200
    assert r.json()["role"] == "editor"
    assert c.put(f"/api/users/{tid}/role", json={"role": "superuser"},
                headers=H).status_code == 400
    # cannot demote self
    me_id = c.get("/api/users", headers=H).json()["items"][0]["id"]
    admin_id = [u["id"] for u in c.get("/api/users", headers=H).json()["items"]
                if u["email"] == "admin@test.example"][0]
    assert c.put(f"/api/users/{admin_id}/role", json={"role": "viewer"},
                headers=H).status_code == 400
