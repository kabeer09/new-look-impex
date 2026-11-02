"""Business settings (key-value store) + public settings view."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from . import models
from .auth import current_user, require_role
from .database import get_db

router = APIRouter()

# Keys exposed to the public site (announcement bar, contact info, etc.)
PUBLIC_KEYS = {
    "business_name": "New Look Impex",
    "location": "Moradabad, Uttar Pradesh, India",
    "business_address": "Moradabad, Uttar Pradesh, India",
    "business_email": "newlookimpex@gmail.com",
    "business_phones": "+91 8218251238, +91 7500441239",
    "whatsapp_number": "918218251238",
    "social_links": "",  # JSON object, e.g. {"instagram":"https://…","linkedin":"https://…"}
    "default_seo_title": "New Look Impex | Copper & Brass Handicrafts from Moradabad, India",
    "default_seo_description": "Wholesale copper kitchenware, brass handicrafts and metal home décor from Moradabad, India. Browse our catalogue and request a quote for bulk and international sourcing.",
    "announcement_text": "",
    "announcement_enabled": "false",
    "default_currency": "USD",
}

ALLOWED_KEYS = set(PUBLIC_KEYS) | {
    "target_countries", "admin_notes",
}


def _get(db: Session, key: str, default: str) -> str:
    row = db.query(models.BusinessSetting).filter(
        models.BusinessSetting.key == key).first()
    if row and row.value != "":
        return row.value
    return default


@router.get("/api/settings")
def get_settings(db: Session = Depends(get_db), u=Depends(current_user)):
    out = {}
    for key in sorted(ALLOWED_KEYS):
        row = db.query(models.BusinessSetting).filter(
            models.BusinessSetting.key == key).first()
        out[key] = row.value if row else PUBLIC_KEYS.get(key, "")
    return out


@router.put("/api/settings")
def update_settings(payload: dict, db: Session = Depends(get_db),
                      u=Depends(require_role("admin"))):
    for key, value in payload.items():
        if key not in ALLOWED_KEYS:
            continue
        row = db.query(models.BusinessSetting).filter(
            models.BusinessSetting.key == key).first()
        if row:
            row.value = str(value)
        else:
            db.add(models.BusinessSetting(key=key, value=str(value)))
    db.commit()
    return {"saved": True}


@router.get("/api/public/settings")
def public_settings(db: Session = Depends(get_db)):
    def get(key):
        return _get(db, key, PUBLIC_KEYS[key])
    phones_raw = get("business_phones")
    phones = [p.strip() for p in phones_raw.split(",") if p.strip()]
    announcement_text = get("announcement_text").strip()
    announcement = None
    if get("announcement_enabled").lower() in ("true", "1", "yes") and announcement_text:
        announcement = {"text": announcement_text, "enabled": True}
    return {
        "business_name": get("business_name"),
        "location": get("location"),
        "business_address": get("business_address"),
        "email": get("business_email"),
        "phones": phones,
        "whatsapp_number": get("whatsapp_number"),
        "social_links": get("social_links"),
        "default_seo_title": get("default_seo_title"),
        "default_seo_description": get("default_seo_description"),
        "announcement": announcement,
        "default_currency": get("default_currency"),
    }
