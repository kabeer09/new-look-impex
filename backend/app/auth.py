"""Authentication and authorization for New Look Impex admin.

Auth flow:
1. User signs in with Google via NextAuth on the frontend
2. NextAuth issues a JWT (access token) signed with NEXTAUTH_SECRET
3. Frontend sends this JWT as Bearer token to backend APIs
4. Backend verifies the JWT using the same SECRET_KEY (= NEXTAUTH_SECRET)
5. Only newlookimpex130@gmail.com is allowed admin access

Environment variables required:
  SECRET_KEY             -- JWT signing secret (must match NEXTAUTH_SECRET)
  ADMIN_EMAIL            -- admin email (default: newlookimpex130@gmail.com)
  ACCESS_TOKEN_EXPIRE_MINUTES -- access token TTL (default 15 min)
"""

from __future__ import annotations

import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import User

# ---------------------------------------------------------------------------
# JWT configuration (shared with NextAuth NEXTAUTH_SECRET)
# ---------------------------------------------------------------------------
SECRET_KEY = settings.SECRET_KEY
if SECRET_KEY in ("change-me-in-production-min-32-chars", "", None):
    raise RuntimeError(
        "SECRET_KEY must be set to a strong random value in production. "
        "Generate with: openssl rand -hex 32. Must match NEXTAUTH_SECRET."
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
ADMIN_EMAIL = settings.ADMIN_EMAIL or "newlookimpex130@gmail.com"

security = HTTPBearer(auto_error=False)

# ---------------------------------------------------------------------------
# Rate limiting (in-memory fallback)
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

def _create_token(data: dict, secret: str, expires_delta: timedelta) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, secret, algorithm=ALGORITHM)


def create_access_token(email: str, role: str, user_id: int) -> str:
    """Short-lived access token."""
    return _create_token(
        {"sub": email, "role": role, "user_id": user_id, "type": "access"},
        SECRET_KEY,
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(email: str, user_id: int) -> str:
    """Longer-lived refresh token."""
    return _create_token(
        {"sub": email, "user_id": user_id, "type": "refresh"},
        SECRET_KEY,
        timedelta(days=7),
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


def verify_nextauth_token(token: str) -> Optional[dict]:
    """Verify a NextAuth JWT issued by the frontend's NextAuth provider.

    NextAuth signs its session JWT with NEXTAUTH_SECRET. If SECRET_KEY equals
    NEXTAUTH_SECRET, we can verify and extract the user email.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


# ---------------------------------------------------------------------------
# Dependency: get current authenticated user (NextAuth JWT)
# ---------------------------------------------------------------------------

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Validate the NextAuth JWT bearer token and return the User.

    Only newlookimpex130@gmail.com is allowed admin access.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None or not credentials.credentials:
        raise credentials_exception

    token = credentials.credentials
    payload = verify_nextauth_token(token)
    if payload is None:
        # Also try as our own access token
        payload = decode_token(token, expected_type="access")
        if payload is None:
            raise credentials_exception

    email = payload.get("email") or payload.get("sub")
    if not email:
        raise credentials_exception

    # Only allow the admin email
    if email.lower() != ADMIN_EMAIL.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Admin access restricted to {ADMIN_EMAIL}",
        )

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        # Auto-create admin user on first Google login
        user = User(
            email=email,
            password_hash="",  # Google handles auth
            role="admin",
            is_active=True,
            auth_provider="google",
            display_name=payload.get("name") or email.split("@")[0],
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

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
# Password hashing (kept for seed.py compatibility)
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    return pwd_ctx.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_ctx.verify(plain_password, hashed_password)
    except Exception:
        return False


# Backward-compatible aliases (seed.py imports hash_pw)
hash_pw = hash_password
verify_pw = verify_password
current_user = get_current_user
rate_limit = rate_limit_check


# ---------------------------------------------------------------------------
# Bootstrap admin user
# ---------------------------------------------------------------------------

def ensure_bootstrap_admin(db: Session) -> None:
    """Create the bootstrap admin user if none exists."""
    existing = db.query(User).filter(User.email == ADMIN_EMAIL).first()
    if existing:
        return
    u = User(
        email=ADMIN_EMAIL,
        password_hash="",  # Google handles auth
        role="admin",
        is_active=True,
        auth_provider="google",
        display_name="Admin",
    )
    db.add(u)
    db.commit()
    print(f"\n[SECURITY] Bootstrap admin created: {ADMIN_EMAIL}")
    print("[SECURITY] Login with Google at /api/auth/signin\n")