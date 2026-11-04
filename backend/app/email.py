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


_BRAND_SIGNOFF = (
    "\n\nWarm regards,\n"
    "Team New Look Impex\n"
    "Brass & Copper Manufacturer & Exporter — Moradabad, India\n"
    "GSTIN: 09AFKPA4462R1ZW\n"
)


def _brand_url() -> str:
    return (settings.PUBLIC_SITE_URL or "https://new-look-impex.vercel.app").rstrip("/")


def send_newsletter_welcome(to: str, name: str = "") -> tuple[bool, str]:
    """'Be the First to Know' welcome email for newsletter subscribers.
    Includes the live seasonal campaign + code so new subscribers can use it."""
    if not email_configured():
        return False, "SMTP not configured"
    from .campaigns import active_campaign
    camp = active_campaign()
    first = (name or "").strip().split()[0] if (name or "").strip() else "there"
    season = (f"{camp['emoji']} {camp['name']} — {camp['percent']}% OFF storewide\n"
              f"Code: {camp['code']} (valid till {camp['ends_label']})\n"
              if camp["ends_label"] != "always on" else
              f"{camp['emoji']} {camp['name']} — {camp['percent']}% OFF your first order\n"
              f"Code: {camp['code']} (always on for new buyers)\n")
    body = (
        f"Hi {first},\n\n"
        "Thank you for subscribing to New Look Impex — you're now on the \"First to Know\" list!\n\n"
        "Here's what you'll receive from us:\n"
        "  - New copper & brass arrivals, fresh from our Moradabad workshops\n"
        "  - Seasonal sale campaigns with exclusive discount codes\n"
        "  - Wholesale, export & gifting offers curated for B2B buyers\n\n"
        "THIS SEASON AT NEW LOOK IMPEX\n"
        f"{season}\n"
        f"Browse the catalogue: {_brand_url()}/products\n\n"
        "Need a bulk quote or samples? Simply reply to this email — a real person reads every reply.\n"
        "(You can unsubscribe anytime by replying with the word STOP.)"
        f"{_BRAND_SIGNOFF}"
    )
    return send_email(to, "Welcome to New Look Impex — you're on the First-to-Know list", body)


def send_customer_ack(to: str, name: str, reference: str, product_interest: str = "") -> tuple[bool, str]:
    """Acknowledgment email for contact-form / general enquiries, with reference number."""
    if not email_configured():
        return False, "SMTP not configured"
    from .campaigns import active_campaign
    camp = active_campaign()
    first = (name or "").strip().split()[0] if (name or "").strip() else "there"
    season = (f"This season: {camp['emoji']} {camp['name']} — {camp['percent']}% OFF storewide "
              f"with code {camp['code']} (valid till {camp['ends_label']}).\n"
              if camp["ends_label"] != "always on" else "")
    topic = (product_interest or "Wholesale / export enquiry").strip()
    body = (
        f"Hi {first},\n\n"
        "Thank you for contacting New Look Impex — we have received your enquiry.\n\n"
        f"Reference: {reference}\n"
        f"Topic: {topic}\n\n"
        "WHAT HAPPENS NEXT\n"
        "  1. Our export team reviews your requirements (within one business day)\n"
        "  2. We reply with pricing, MOQ details, samples and shipping options\n"
        "  3. Need it faster? WhatsApp us: +91 8218251238\n\n"
        f"{season}"
        f"Catalogue: {_brand_url()}/products\n"
        "A real person reads every reply — just write back to this email."
        f"{_BRAND_SIGNOFF}"
    )
    return send_email(to, f"We received your enquiry {reference} — New Look Impex", body)
