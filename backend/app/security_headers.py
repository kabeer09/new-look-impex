"""Security headers middleware for the FastAPI backend.

Adds:
- Content-Security-Policy (restrictive but functional)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: restrict sensitive features
- Strict-Transport-Security: handled by proxy (Cloudflare/Render), but added here too
- X-XSS-Protection: 1; mode=block (legacy, for older browsers)

Does not block legitimate images, fonts, analytics, or API calls.
"""

from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# Paths that are served from the frontend (Next.js) and need relaxed CSP
# for images/fonts/scripts from Vercel and Supabase.
PUBLIC_PATHS = (
    "/api/public/products",
    "/api/public/categories",
    "/api/public/collections",
    "/api/public/discount",
    "/api/public/active-campaign",
    "/api/public/settings",
    "/api/media/files",
    "/sitemap.xml",
    "/robots.txt",
    "/api/docs",
    "/api/openapi.json",
    "/api/health",
    "/health",
)

# Supabase media domain (from environment or default)
import os

SUPABASE_MEDIA_HOST = os.environ.get(
    "SUPABASE_MEDIA_HOST",
    "luqgcacxkcrmhsdopjyl.supabase.co",
)

# Build CSP dynamically
CSP_DIRECTIVES = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.googletagmanager.com https://wa.me",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    f"img-src 'self' data: https://{SUPABASE_MEDIA_HOST} https://*.supabase.co https://www.google.com https://www.gstatic.com",
    "connect-src 'self' https://api.newlookimpex.store https://www.google.com https://www.googletagmanager.com https://wa.me",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
]

CSP_HEADER_VALUE = "; ".join(CSP_DIRECTIVES)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Strict transport security (HSTS) - Cloudflare also sets this,
        # but defense in depth is good.
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains; preload"
        )

        # Prevent MIME-type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Clickjacking protection
        response.headers["X-Frame-Options"] = "DENY"

        # XSS protection (legacy browsers)
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Referrer policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions / Feature policy - disable sensitive features
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), "
            "payment=(), usb=(), magnetometer=(), gyroscope=(), "
            "accelerometer=(), ambient-light-sensor=(), "
            "autoplay=(), encrypted-media=(), fullscreen=()"
        )

        # Content Security Policy
        response.headers["Content-Security-Policy"] = CSP_HEADER_VALUE

        # Remove server identification headers if present
        response.headers["Server"] = ""
        response.headers["X-Powered-By"] = ""

        return response
