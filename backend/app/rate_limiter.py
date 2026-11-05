"""Rate limiting with Redis backend (in-memory fallback).

Provides a decorator/dependency for rate limiting endpoints by IP, user, or
custom key. When Redis is available (REDIS_URL env var), limits are shared
across all backend instances. Otherwise falls back to in-memory (single-instance
only — not safe for multi-instance deploys).

Usage:
    from app.rate_limiter import rate_limit_dependency
    @router.post("/api/public/enquiries")
    def submit(..., _: None = Depends(rate_limit_dependency("enquiry:ip", 5, 600))):
        ...

Or as a decorator:
    @rate_limit_decorator(key_func=lambda r: r.client.host, limit=10, window=60)
"""

from __future__ import annotations

import time
from functools import wraps
from typing import Callable, Optional
from fastapi import HTTPException, Request, status

try:
    import redis as redis_lib
    _REDIS_AVAILABLE = True
except ImportError:
    _REDIS_AVAILABLE = False

from .config import settings

# ---------------------------------------------------------------------------
# Redis client (lazy)
# ---------------------------------------------------------------------------

_redis_client = None


def _get_redis():
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    if not _REDIS_AVAILABLE:
        return None
    redis_url = getattr(settings, "REDIS_URL", None) or os_getenv("REDIS_URL")
    if not redis_url:
        return None
    try:
        import redis as redis_lib
        _redis_client = redis_lib.Redis.from_url(redis_url, decode_responses=True)
        _redis_client.ping()
        return _redis_client
    except Exception:
        _redis_client = None
        return None


def os_getenv(key: str, default: Optional[str] = None) -> Optional[str]:
    import os
    return os.environ.get(key, default)


# ---------------------------------------------------------------------------
# In-memory fallback (single instance only)
# ---------------------------------------------------------------------------
_memory_hits: dict[str, list[float]] = {}


def _now() -> float:
    return time.time()


def _memory_check_and_increment(key: str, limit: int, window_s: int) -> tuple[bool, int]:
    """Returns (allowed, remaining_seconds)."""
    now = _now()
    arr = [t for t in _memory_hits.get(key, []) if now - t < window_s]
    arr.append(now)
    _memory_hits[key] = arr
    if len(arr) > limit:
        # Find when the oldest hit expires
        oldest = arr[0]
        retry_after = int(oldest + window_s - now) + 1
        return False, max(retry_after, 1)
    return True, 0


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def rate_limit_check(
    key: str,
    limit: int,
    window_seconds: int,
) -> tuple[bool, int]:
    """Check if a request is allowed under the rate limit.

    Returns (allowed, retry_after_seconds). If allowed, retry_after is 0.
    """
    r = _get_redis()
    if r is not None:
        try:
            now = int(_now())
            window_start = now - (now % window_seconds)
            redis_key = f"rate:{key}:{window_start}"
            pipe = r.pipeline()
            pipe.incr(redis_key)
            pipe.expire(redis_key, window_seconds)
            results = pipe.execute()
            count = results[0]
            if count > limit:
                ttl = r.ttl(redis_key)
                return False, max(ttl, 1)
            return True, 0
        except Exception:
            # Fall back to memory if Redis fails mid-request
            pass

    allowed, retry = _memory_check_and_increment(key, limit, window_seconds)
    return allowed, retry


def rate_limit_dependency(
    key_prefix: str,
    limit: int,
    window_seconds: int,
    key_func: Optional[Callable[[Request], str]] = None,
):
    """FastAPI dependency for rate limiting.

    Args:
        key_prefix: Namespace for the rate-limit key (e.g. "enquiry:ip").
        limit: Max requests allowed in the window.
        window_seconds: Window size in seconds.
        key_func: Optional function(Request) -> str to generate the key
                  suffix. Defaults to client IP.
    """

    def _dep(request: Request):
        suffix = key_func(request) if key_func else _client_ip(request)
        full_key = f"{key_prefix}:{suffix}"
        allowed, retry_after = rate_limit_check(full_key, limit, window_seconds)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Try again in {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)},
            )
        return None

    return _dep


def _client_ip(request: Request) -> str:
    # Respect X-Forwarded-When behind Cloudflare / proxy
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ---------------------------------------------------------------------------
# Decorator version (for non-FastAPI or sync functions)
# ---------------------------------------------------------------------------

def rate_limit_decorator(
    limit: int,
    window_seconds: int,
    key_func: Optional[Callable[[Request], str]] = None,
):
    """Decorator for FastAPI route functions."""

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Find the Request object in args/kwargs
            request = None
            for v in kwargs.values():
                if isinstance(v, Request):
                    request = v
                    break
            if request is None:
                for v in args:
                    if isinstance(v, Request):
                        request = v
                        break
            if request is None:
                return await func(*args, **kwargs)  # can't limit without request

            suffix = key_func(request) if key_func else _client_ip(request)
            full_key = f"decorator:{suffix}"
            allowed, retry_after = rate_limit_check(full_key, limit, window_seconds)
            if not allowed:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Try again in {retry_after} seconds.",
                    headers={"Retry-After": str(retry_after)},
                )
            return await func(*args, **kwargs)

        return wrapper

    return decorator
