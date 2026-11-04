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


# ---------------- Campaign announcement emails (Pinterest-style HTML) ----------------

_MEDIA_BANNER = ("https://luqgcacxkcrmhsdopjyl.supabase.co/storage/v1/object/public/"
                 "media/banner-featured-collection.jpg")


def campaign_email_html(camp: dict, kind: str = "announcement") -> str:
    """Sale-campaign email, Pinterest-lookbook style: cream canvas, copper & brass
    accents, serif headline, dashed coupon box, pill CTA. Table layout + inline
    styles only (email-client safe)."""
    site = _brand_url()
    announce = kind == "announcement"
    eyebrow = f"{camp['emoji']} Sale Starts Now" if announce else f"{camp['emoji']} Last Chance"
    headline = (f"The {camp['name']} is Here" if announce
                else f"The {camp['name']} Ends {camp['ends_label']}")
    cta = camp["cta"] if announce else f"Don't Miss the {camp['name']}"
    urgency = (f"Valid till <b style='color:#1A1A1A;'>{camp['ends_label']}</b>"
               if camp["ends_label"] != "always on" else "Always on for new buyers")
    banner = (f"<tr><td style='padding:0;'>"
              f"<img src='{_MEDIA_BANNER}' alt='New Look Impex — handcrafted copper and brass'"
              f" width='600' style='display:block;width:100%;height:auto;border:0;' /></td></tr>")
    return f"""<!doctype html><html><body style="margin:0;padding:0;background:#F9F6F0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F9F6F0;" bgcolor="#F9F6F0">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;" bgcolor="#FFFFFF">
<tr><td style="background:#1A1A1A;padding:20px 32px;text-align:center;" bgcolor="#1A1A1A">
  <div style="color:#C5A059;font-size:12px;letter-spacing:4px;font-weight:bold;">NEW LOOK IMPEX</div>
  <div style="color:#F9F6F0;font-size:10px;letter-spacing:2px;margin-top:4px;">BRASS &amp; COPPER — MORADABAD, INDIA</div>
</td></tr>
{banner}
<tr><td style="padding:34px 32px 6px;text-align:center;font-family:Georgia,'Times New Roman',serif;">
  <div style="color:#B87333;font-size:12px;letter-spacing:3px;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">{eyebrow}</div>
  <div style="color:#1A1A1A;font-size:30px;font-weight:bold;line-height:1.25;margin-top:10px;">{headline}</div>
  <div style="color:#B87333;font-size:52px;font-weight:bold;line-height:1.1;margin-top:12px;">{camp['percent']}% OFF</div>
  <div style="color:#666666;font-size:15px;line-height:1.6;margin-top:12px;font-family:Arial,Helvetica,sans-serif;">
    Everything storewide — hand-hammered copper cookware, engraved brass d&eacute;cor,
    planters, drinkware &amp; festive gifting. While stock lasts.</div>
</td></tr>
<tr><td align="center" style="padding:22px 32px 4px;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="border:2px dashed #C5A059;border-radius:12px;background:#FDFBF7;" bgcolor="#FDFBF7">
  <tr><td style="padding:14px 30px;text-align:center;">
    <div style="color:#8A8A8A;font-size:10px;letter-spacing:2px;text-transform:uppercase;">Your Coupon Code</div>
    <div style="color:#1A1A1A;font-size:24px;font-weight:bold;letter-spacing:6px;margin-top:6px;font-family:Arial,Helvetica,sans-serif;">{camp['code']}</div>
  </td></tr></table>
  <div style="color:#8A8A8A;font-size:12px;margin-top:10px;font-family:Arial,Helvetica,sans-serif;">{urgency} — use at checkout or mention it in your quote request</div>
</td></tr>
<tr><td align="center" style="padding:14px 32px 24px;">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
  <td style="background:#B87333;border-radius:999px;" bgcolor="#B87333">
    <a href="{site}/products" style="display:inline-block;padding:14px 38px;color:#FFFFFF;text-decoration:none;font-weight:bold;font-size:15px;font-family:Arial,Helvetica,sans-serif;">{cta} &rarr;</a>
  </td></tr></table>
</td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid #EEEEEE;text-align:center;font-family:Arial,Helvetica,sans-serif;">
  <span style="color:#1A1A1A;font-size:11px;">&#9733; Hand-Hammered by Artisans</span>
  <span style="color:#C5A059;"> &nbsp;&bull;&nbsp; </span>
  <span style="color:#1A1A1A;font-size:11px;">&#9733; Factory-Direct Wholesale</span>
  <span style="color:#C5A059;"> &nbsp;&bull;&nbsp; </span>
  <span style="color:#1A1A1A;font-size:11px;">&#9733; GSTIN-Verified Exporter</span>
</td></tr>
<tr><td style="background:#F9F6F0;padding:16px 32px;text-align:center;" bgcolor="#F9F6F0">
  <span style="color:#8A8A8A;font-size:11px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">
  New Look Impex — Brass &amp; Copper Manufacturer &amp; Exporter, Moradabad, India &middot; GSTIN 09AFKPA4462R1ZW<br/>
  You're receiving this because you subscribed or enquired at our website.
  Reply <b>STOP</b> to opt out of sale emails.</span>
</td></tr>
</table></td></tr></table></body></html>"""


def campaign_email_text(camp: dict, kind: str = "announcement") -> str:
    announce = kind == "announcement"
    headline = (f"The {camp['name']} is Here" if announce
                else f"Last chance — the {camp['name']} ends {camp['ends_label']}")
    return (
        f"{camp['emoji']} {headline}\n\n"
        f"{camp['percent']}% OFF storewide on copper & brass — hand-hammered cookware, "
        f"engraved decor, gifting and more.\n\n"
        f"Your coupon code: {camp['code']} (valid till {camp['ends_label']})\n"
        f"Shop now: {_brand_url()}/products\n\n"
        "New Look Impex — Brass & Copper Manufacturer & Exporter, Moradabad, India\n"
        "GSTIN: 09AFKPA4462R1ZW\n"
        "Reply STOP to opt out of sale emails."
    )


def send_campaign_batch(recipients: list[str], subject: str, html: str, text: str) -> tuple[int, int, str]:
    """Send one campaign email to many recipients over a single SMTP connection.
    Returns (sent_ok, failed, detail) — honest counts, never raises."""
    if not email_configured():
        return 0, len(recipients), "SMTP not configured"
    sent = failed = 0
    try:
        port = settings.SMTP_PORT or 587
        use_tls = str(settings.SMTP_TLS).lower() in ("1", "true", "yes") if settings.SMTP_TLS else port != 465
        with smtplib.SMTP(settings.SMTP_HOST, port, timeout=30) as s:
            if use_tls:
                s.starttls()
            if settings.SMTP_PASS:
                s.login(settings.SMTP_USER, settings.SMTP_PASS)
            for to in recipients:
                try:
                    msg = EmailMessage()
                    msg["From"] = settings.SMTP_USER
                    msg["To"] = to
                    msg["Subject"] = subject
                    msg.set_content(text)
                    msg.add_alternative(html, subtype="html")
                    s.send_message(msg)
                    sent += 1
                except Exception:
                    failed += 1
        return sent, failed, "batch sent"
    except Exception as e:
        return sent, failed, f"batch failed: {type(e).__name__}"
