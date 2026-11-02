"""Password hashing + rate limiting.

NOTE: Login/RBAC has been REMOVED — admin endpoints are fully open (no token, no
roles). `current_user` / `require_role` remain only as thin dependency shims so
the ~80 endpoints that reference them keep working without edits. They never
reject a request; they return the first active admin identity so audit records
still have an attributable actor.
"""
import time
from collections import defaultdict

from fastapi import Depends, HTTPException
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from .database import get_db
from .models import User

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

# simple in-memory rate limiter (per process)
_hits: dict[str, list[float]] = defaultdict(list)


def rate_limit(key: str, limit: int = 60, window_s: int = 60):
    now = time.time()
    arr = [t for t in _hits[key] if now - t < window_s]
    arr.append(now)
    _hits[key] = arr
    if len(arr) > limit:
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again later.")


def hash_pw(pw: str) -> str:
    return pwd_ctx.hash(pw)


def verify_pw(pw: str, h: str) -> bool:
    try:
        return pwd_ctx.verify(pw, h)
    except Exception:
        # Unknown/foreign hash format (e.g. OAuth sentinel) — never authenticate.
        return False


def current_user(db: Session = Depends(get_db)) -> User:
    """Open access: return the first active admin for audit attribution."""
    u = (db.query(User)
         .filter(User.is_active == True, User.role == "admin")  # noqa: E712
         .order_by(User.id)
         .first())
    if not u:
        u = (db.query(User)
             .filter(User.is_active == True)  # noqa: E712
             .order_by(User.id)
             .first())
    if u:
        return u
    # No user rows yet (fresh DB) — synthetic identity, still not a gate.
    return User(email="admin@local", role="admin", is_active=True)


def require_role(*roles: str):
    """Open-access shim: roles are ignored, always resolves to `current_user`."""

    def _dep(u: User = Depends(current_user)) -> User:
        return u

    return _dep
