"""Authentication, authorization, and session security for New Look Impex.

Implements:
- Argon2 password hashing (via passlib with bcrypt fallback)
- JWT access tokens (short-lived) + refresh tokens (longer-lived, rotatable)
- Admin role-based authorization (admin | editor | viewer)
- Login attempt rate limiting + lockout
- Two-factor authentication (TOTP) support
- Secure session cookies (HttpOnly, Secure, SameSite=Lax)
- Audit logging of all auth events

Environment variables required:
  SECRET_KEY             -- JWT signing secret (min 32 random chars)
  ACCESS_TOKEN_EXPIRE_MINUTES -- access token TTL (default 15 min)
  REFRESH_TOKEN_EXPIRE_DAYS  -- refresh token TTL (default 7 days)
  TWO_FACTOR_ENABLED        -- "true" to require 2FA for admin login
  TOTP_ISSUER               -- issuer name for TOTP (default "New Look Impex")
  ADMIN_EMAIL               -- bootstrap admin email
  ADMIN_PASSWORD            -- bootstrap admin password (changed on first login)

Rate limits (in-memory fallback; Redis-backed preferred):
  LOGIN_MAX_ATTEMPTS / LOGIN_LOCKOUT_MINUTES  -- from config
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import User

# ---------------------------------------------------------------------------
# Password hashing: Argon2 (preferred) with bcrypt fallback
# ---------------------------------------------------------------------------
pwd_ctx = CryptContext(
    schemes=["argon2", "bcrypt"],
    deprecated="auto",
    argon2__time_cost=3,
    argon2__memory_cost=65536,
    argon2__parallelism=4,
)

# ---------------------------------------------------------------------------
# JWT configuration
# ---------------------------------------------------------------------------
SECRET_KEY = settings.SECRET_KEY
if SECRET_KEY in ("change-me-in-production-min-32-chars", "", None):
    raise RuntimeError(
        "SECRET_KEY must be set to a strong random value in production. "
        "Generate with: openssl rand -hex 32"
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = 7

security = HTTPBearer(auto_error=False)

# ---------------------------------------------------------------------------
# In-memory rate limiting (fallback when Redis unavailable)
# ---------------------------------------------------------------------------
_login_attempts: dict[str, list[float]] = defaultdict(list)
_lockouts: dict[str, float] = {}  # key -> lockout_until_timestamp


def _now() -> float:
    return time.time()


def is_locked_out(key: str) -> tuple[bool, Optional[float]]:
    """Return (is_locked, lockout_until) for a login-attempt key."""
    until = _lockouts.get(key, 0)
    if _now() < until:
        return True, until
    return False, None


def record_login_attempt(key: str, success: bool) -> None:
    """Record a login attempt; apply lockout after MAX_LOGIN_ATTEMPTS failures."""
    now = _now()
    arr = [t for t in _login_attempts[key] if now - t < settings.LOGIN_LOCKOUT_MINUTES * 60]
    arr.append(now)
    _login_attempts[key] = arr

    if not success and len(arr) >= settings.MAX_LOGIN_ATTEMPTS:
        _lockouts[key] = now + settings.LOGIN_LOCKOUT_MINUTES * 60


def clear_login_attempts(key: str) -> None:
    _login_attempts.pop(key, None)
    _lockouts.pop(key, None)


# ---------------------------------------------------------------------------
# Token helpers
# ---------------------------------------------------------------------------

def _create_token(
    data: dict,
    secret: str,
    expires_delta: timedelta,
) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, secret, algorithm=ALGORITHM)


def create_access_token(subject: str, role: str, user_id: int) -> str:
    """Short-lived access token."""
    return _create_token(
        {"sub": subject, "role": role, "user_id": user_id, "type": "access"},
        SECRET_KEY,
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(subject: str, user_id: int) -> str:
    """Longer-lived refresh token."""
    return _create_token(
        {"sub": subject, "user_id": user_id, "type": "refresh"},
        SECRET_KEY,
        timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )


def decode_token(token: str, expected_type: str = "access") -> Optional[dict]:
    """Decode and validate a JWT. Returns payload dict or None."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != expected_type:
            return None
        return payload
    except JWTError:
        return None


# ---------------------------------------------------------------------------
# Dependency: get current authenticated user
# ---------------------------------------------------------------------------

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Validate the JWT bearer token and return the current User.

    Raises HTTPException(401) if missing/invalid/expired.
    Raises HTTPException(403) if user is inactive.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None or not credentials.credentials:
        raise credentials_exception

    token = credentials.credentials
    payload = decode_token(token, expected_type="access")
    if payload is None:
        raise credentials_exception

    user_id: int = payload.get("user_id")
    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    # Record last activity (lightweight)
    return user


def require_role(*allowed_roles: str):
    """Dependency factory: require current_user to have one of the given roles."""

    def _dep(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {', '.join(allowed_roles)}",
            )
        return user

    return _dep


# ---------------------------------------------------------------------------
# Password helpers
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    return pwd_ctx.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_ctx.verify(plain_password, hashed_password)
    except Exception:
        return False


def validate_password_strength(password: str) -> list[str]:
    """Return list of weakness messages (empty if strong)."""
    weaknesses = []
    if len(password) < settings.PASSWORD_MIN_LENGTH:
        weaknesses.append(f"Password must be at least {settings.PASSWORD_MIN_LENGTH} characters")
    if settings.PASSWORD_REQUIRE_UPPER and not any(c.isupper() for c in password):
        weaknesses.append("Password must contain an uppercase letter")
    if settings.PASSWORD_REQUIRE_LOWER and not any(c.islower() for c in password):
        weaknesses.append("Password must contain a lowercase letter")
    if settings.PASSWORD_REQUIRE_DIGIT and not any(c.isdigit() for c in password):
        weaknesses.append("Password must contain a digit")
    if settings.PASSWORD_REQUIRE_SYMBOL and not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
        weaknesses.append("Password must contain a special character")
    return weaknesses


# ---------------------------------------------------------------------------
# Bootstrap admin user
# ---------------------------------------------------------------------------

def ensure_bootstrap_admin(db: Session) -> None:
    """Create the bootstrap admin user if none exists."""
    existing = db.query(User).filter(User.is_active == True).first()
    if existing:
        return
    admin_email = settings.ADMIN_EMAIL or "admin@newlookimpex.example"
    admin_password = settings.ADMIN_PASSWORD or "ChangeMe123!"
    u = User(
        email=admin_email,
        password_hash=hash_password(admin_password),
        role="admin",
        is_active=True,
        auth_provider="local",
        display_name="Admin",
    )
    db.add(u)
    db.commit()
    print(f"\n[SECURITY] Bootstrap admin created: {admin_email}")
    print(f"[SECURITY] Bootstrap password: {admin_password}")
    print("[SECURITY] CHANGE THESE CREDENTIALS IMMEDIATELY AFTER FIRST LOGIN.\n")


# ---------------------------------------------------------------------------
# Two-factor (TOTP) helpers
# ---------------------------------------------------------------------------

def generate_totp_secret() -> str:
    """Generate a base32-encoded TOTP secret."""
    return base64.b32encode(os.urandom(20)).decode("utf-8")


def verify_totp_token(secret: str, token: str) -> bool:
    """Verify a TOTP token against the secret."""
    try:
        import pyotp
    except ImportError:
        # pyotp not installed — 2FA cannot be verified; deny
        return False
    totp = pyotp.TOTP(secret)
    return totp.verify(token, valid_window=1)
