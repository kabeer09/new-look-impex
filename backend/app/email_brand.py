"""Branded transactional email wrapper for New Look Impex.

All public forms (wholesale enquiry, contact, newsletter, RFQ) use the same
header with the company logo, a product/photo block, and a footer with the
company's real contact details. Table layout + inline styles for email clients.
"""
from __future__ import annotations
from html import escape

from .config import settings
from .email import send_email


LOGO_URL = "https://www.newlookimpex.store/logo-newlookimpex.jpg"
SOCIAL_LINKS = [
    ("Facebook", "https://www.facebook.com/profile.php?id=100083216147871"),
    ("LinkedIn", "https://www.linkedin.com/in/new-look-impex-b1b473218/"),
    ("Instagram", "https://www.instagram.com/nli_collections_india"),
    ("YouTube", "https://youtube.com/@nlicollections"),
]
FALLBACK_PHOTO = (
    "https://luqgcacxkcrmhsdopjyl.supabase.co/storage/v1/object/public/media/"
    "whatsapp-image-2026-10-15-at-8-57-28-pm-4ebd9d39.jpeg"
)
_SOCIAL_HTML = " &nbsp;&bull;&nbsp; ".join(
    f"<a href='{url}' style='color:#C5A059;text-decoration:none;font-size:11px;"
    f"font-family:Arial,Helvetica,sans-serif;'>{name}</a>" for name, url in SOCIAL_LINKS)
_SOCIAL_TEXT = " | ".join(f"{name}: {url}" for name, url in SOCIAL_LINKS)


def _site() -> str:
    return (settings.PUBLIC_SITE_URL or "https://www.newlookimpex.store").rstrip("/")


def photo_url(url: str | None) -> str:
    """Only absolute http(s) URLs work in email clients. Local relative media
    paths fall back to a hosted company product photo."""
    u = (url or "").strip()
    if u.startswith("https://") or u.startswith("http://"):
        return u
    return FALLBACK_PHOTO


def brand_email_html(title: str, rows: list[tuple[str, str]], intro: str = "",
                     photo: str = "", cta_url: str = "", cta_label: str = "") -> str:
    site = _site()
    head = escape(title or "New Look Impex enquiry")
    intro_html = (f"<tr><td style='padding:18px 32px 0;color:#4A4A4A;font-size:14px;"
                  f"line-height:1.7;font-family:Arial,Helvetica,sans-serif;'>"
                  f"{escape(intro)}</td></tr>" if intro else "")
    photo_html = ""
    if photo:
        photo_html = (
            "<tr><td style='padding:18px 32px 0;'>"
            f"<img src='{escape(photo, quote=True)}' alt='New Look Impex handcrafted product' "
            "width='536' style='display:block;width:100%;max-width:536px;height:auto;border:1px solid #EDE3D2;' />"
            "</td></tr>"
        )
    row_html = "".join(
        f"<tr><td style='padding:6px 0;border-bottom:1px solid #F0EDE6;'>"
        f"<span style='color:#8A8A8A;font-size:11px;letter-spacing:1px;text-transform:uppercase;"
        f"font-family:Arial,Helvetica,sans-serif;'>{escape(str(k))}</span><br/>"
        f"<span style='color:#1A1A1A;font-size:14px;font-family:Arial,Helvetica,sans-serif;'>"
        f"{escape(str(v) if v not in (None, '') else '—')}</span></td></tr>"
        for k, v in rows
    )
    cta_html = ""
    if cta_url:
        cta_html = (
            "<tr><td align='center' style='padding:24px 32px;'>"
            "<table role='presentation' cellpadding='0' cellspacing='0'><tr>"
            "<td style='background:#B87333;border-radius:999px;' bgcolor='#B87333'>"
            f"<a href='{escape(cta_url, quote=True)}' style='display:inline-block;padding:13px 32px;"
            f"color:#FFFFFF;text-decoration:none;font-weight:bold;font-size:14px;"
            f"font-family:Arial,Helvetica,sans-serif;'>{escape(cta_label or 'View details')} &rarr;</a>"
            "</td></tr></table></td></tr>"
        )
    return f"""<!doctype html><html><body style="margin:0;padding:0;background:#F9F6F0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F9F6F0;" bgcolor="#F9F6F0">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;" bgcolor="#FFFFFF">
<tr><td style="background:#FFFFFF;padding:20px 32px;border-bottom:3px solid #C5A059;">
  <img src="{LOGO_URL}" alt="New Look Impex" width="110" style="display:block;width:110px;height:auto;border:0;" />
  <div style="color:#1A1A1A;font-size:16px;letter-spacing:2px;font-weight:bold;margin-top:10px;font-family:Georgia,serif;">NEW LOOK IMPEX</div>
  <div style="color:#B87333;font-size:10px;letter-spacing:2px;margin-top:3px;font-family:Arial,Helvetica,sans-serif;">BRASS &amp; COPPER — MORADABAD, INDIA</div>
</td></tr>
<tr><td style="padding:26px 32px 10px;color:#1A1A1A;font-size:22px;font-weight:bold;font-family:Georgia,serif;">{head}</td></tr>
{intro_html}
{photo_html}
<tr><td style="padding:20px 32px 6px;">{row_html}</td></tr>
{cta_html}
<tr><td style="background:#1A1A1A;padding:20px 32px;text-align:center;" bgcolor="#1A1A1A">
  <div style="color:#C5A059;font-size:12px;letter-spacing:3px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;">NEW LOOK IMPEX</div>
  <div style="color:#F9F6F0;font-size:11px;line-height:1.8;margin-top:8px;font-family:Arial,Helvetica,sans-serif;">
  Brass &amp; Copper Manufacturer &amp; Exporter<br/>
  Ganga Mandir, Thana Nagphani Road, Kisrol, Moradabad – 244001, Uttar Pradesh, India<br/>
  Phone: +91 9808588603 &nbsp;&bull;&nbsp; WhatsApp: +91 96900 53913<br/>
  Email: newlookimpex@gmail.com &nbsp;&bull;&nbsp; Web: {site}<br/>
  GSTIN: 09AFKPA4462R1ZW<br/><br/>
  {_SOCIAL_HTML}</div>
</td></tr>
</table></td></tr></table></body></html>"""


def brand_email_text(title: str, rows: list[tuple[str, str]], intro: str = "",
                     cta_url: str = "") -> str:
    lines = [title, ""]
    if intro:
        lines += [intro, ""]
    for k, v in rows:
        lines.append(f"{k}: {v if v not in (None, '') else '—'}")
    if cta_url:
        lines += ["", f"View online: {cta_url}"]
    lines += [
        "",
        "NEW LOOK IMPEX — Brass & Copper Manufacturer & Exporter",
        "Ganga Mandir, Thana Nagphani Road, Kisrol, Moradabad – 244001, Uttar Pradesh, India",
        "Phone: +91 9808588603 | WhatsApp: +91 96900 53913",
        "Email: newlookimpex@gmail.com",
        f"Web: {_site()} | GSTIN: 09AFKPA4462R1ZW",
        f"Follow us: {_SOCIAL_TEXT}",
    ]
    return "\n".join(lines)


def send_branded_email(to, subject: str, title: str, rows: list[tuple[str, str]],
                       intro: str = "", photo: str = "", cta_url: str = "",
                       cta_label: str = "") -> tuple[bool, str]:
    return send_email(
        to, subject,
        brand_email_text(title, rows, intro, cta_url),
        html=brand_email_html(title, rows, intro, photo_url(photo), cta_url, cta_label),
    )
