"""Shared fixtures.

Each test module resets the DB at import time (drop_all/create_all + seed), and
pytest imports all modules before running any test — so only the last-imported
module's seed survives. This autouse fixture re-ensures the baseline users
before every module's tests run, independent of import order. JWTs are
stateless, so tokens fetched at import time stay valid once the rows exist.
"""
import pytest

from app import auth as _auth
from app.auth import hash_pw, create_access_token
from app.database import SessionLocal
from app import models

# The admin API now enforces JWT auth. Older test modules were written in a
# no-auth era and declare `H: dict = {}` (or pass no headers at all). Set a
# valid admin bearer token as each module-level TestClient's DEFAULT header
# (httpx merges it into every request) and on the H/EH header dicts; explicit
# per-request headers still win. get_current_user only accepts ADMIN_EMAIL and
# auto-creates that user as admin, so one token covers admin + editor callers.
# Read ADMIN_EMAIL at runtime: pytest has no root .env, so it is config's
# default (admin@newlookimpex.example), not the production Gmail address.
ADMIN_EMAIL = _auth.ADMIN_EMAIL


@pytest.fixture(autouse=True)
def _inject_admin_auth(request):
    token = create_access_token(ADMIN_EMAIL, "admin", 1)
    # Authorization only — no Content-Type, so tests that post files=/data=
    # keep their multipart/form-urlencoded content type.
    headers = {"Authorization": f"Bearer {token}"}
    if hasattr(request.module, "H"):
        request.module.H = headers
    if hasattr(request.module, "EH"):
        request.module.EH = headers
    # Default header on the shared client; per-request headers override it.
    client = getattr(request.module, "c", None)
    if client is not None and hasattr(client, "headers"):
        client.headers["Authorization"] = f"Bearer {token}"


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    """Public RFQ/enquiry endpoints are rate-limited per IP; clear the shared
    in-memory buckets before and after each test so execution order and other
    modules never leak a 429 into an unrelated test."""
    from app.rate_limiter import _memory_hits
    _memory_hits.clear()
    yield
    _memory_hits.clear()


@pytest.fixture(scope="module", autouse=True)
def _ensure_baseline_users():
    db = SessionLocal()
    try:
        for email, role in (("admin@test.example", "admin"),
                            ("editor@test.example", "editor")):
            if not db.query(models.User).filter(models.User.email == email).first():
                db.add(models.User(email=email,
                                   password_hash=hash_pw("Secret123!"),
                                   role=role))
        db.commit()
    finally:
        db.close()
    yield
