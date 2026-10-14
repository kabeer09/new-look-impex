"""Email sender. HONEST by design: returns (sent: bool, detail: str).
When SMTP is not configured, sent=False and callers must not claim delivery."""
from __future__ import annotations
import smtplib
from email.message import EmailMessage
from .config import settings


def email_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_USER)


def send_email(to: str, subject: str, body: str) -> tuple[bool, str]:
    """Send via configured SMTP. Never raises — returns success flag + safe detail."""
    if not email_configured():
        return False, "SMTP not configured"
    try:
        msg = EmailMessage()
        msg["From"] = settings.SMTP_USER
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content(body)
        port = settings.SMTP_PORT or 587
        use_tls = str(settings.SMTP_TLS).lower() in ("1", "true", "yes") if settings.SMTP_TLS else port != 465
        with smtplib.SMTP(settings.SMTP_HOST, port, timeout=30) as s:
            if use_tls:
                s.starttls()
            if settings.SMTP_PASS:
                s.login(settings.SMTP_USER, settings.SMTP_PASS)
            s.send_message(msg)
        return True, "sent"
    except Exception as e:
        return False, f"send failed: {type(e).__name__}"
