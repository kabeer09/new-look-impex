"""Password hashing + JWT auth + RBAC + rate limiting."""
import time
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from .config import settings
from .database import get_db
from .models import User

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
ALGO = "HS256"

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


def make_token(sub: str, role: str) -> str:
    exp = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": sub, "role": role, "exp": exp}, settings.SECRET_KEY, algorithm=ALGO)


def current_user(token: str = Depends(oauth2), db: Session = Depends(get_db)) -> User:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGO])
        email = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    u = db.query(User).filter(User.email == email, User.is_active == True).first()  # noqa: E712
    if not u:
        raise HTTPException(status_code=401, detail="User not found")
    return u


def require_role(*roles: str):
    def _dep(u: User = Depends(current_user)) -> User:
        if u.role not in roles:
            raise HTTPException(status_code=403, detail="Forbidden for role " + u.role)
        return u
    return _dep
