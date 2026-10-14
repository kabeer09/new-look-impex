"""Shared fixtures.

Each test module resets the DB at import time (drop_all/create_all + seed), and
pytest imports all modules before running any test — so only the last-imported
module's seed survives. This autouse fixture re-ensures the baseline users
before every module's tests run, independent of import order. JWTs are
stateless, so tokens fetched at import time stay valid once the rows exist.
"""
import pytest

from app.auth import hash_pw
from app.database import SessionLocal
from app import models


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
