"""Site Control API — admin-managed campaigns and editable public content.

Everything here directly drives the public website. Campaigns use explicit
start/end dates so an admin can schedule a sale once and let it switch itself
on and off. Content blocks are JSON so any homepage section can be edited.
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from . import models
from .auth import current_user, require_role
from .database import get_db

router = APIRouter()


# ---------------- public site content ----------------
def _parse(v):
    if not v:
        return None
    try:
        return json.loads(v)
    except (TypeError, ValueError):
        return v


@router.get("/api/public/site-content")
def public_site_content(db: Session = Depends(get_db)):
    out = {}
    for row in db.query(models.SiteContent).all():
        out[row.key] = _parse(row.value)
    return out


@router.get("/api/site-content")
def admin_site_content(db: Session = Depends(get_db), u=Depends(current_user)):
    return {"items": [{"id": r.id, "key": r.key, "label": r.label,
                       "value": _parse(r.value), "updated_at": r.updated_at.isoformat() if r.updated_at else None}
                      for r in db.query(models.SiteContent).order_by(models.SiteContent.key).all()]}


@router.put("/api/site-content")
def save_site_content(p: dict, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    items = p.get("items")
    if not isinstance(items, list):
        raise HTTPException(400, "Provide an items list.")
    for entry in items:
        key = str(entry.get("key") or "").strip()
        if not key:
            continue
        row = db.query(models.SiteContent).filter(models.SiteContent.key == key).first()
        if entry.get("value") is None:
            # Explicit null = revert this section to the site's built-in default.
            if row:
                db.delete(row)
            continue
        if not row:
            row = models.SiteContent(key=key)
            db.add(row)
        row.label = str(entry.get("label") or key)[:255]
        val = entry.get("value")
        row.value = json.dumps(val, ensure_ascii=False) if not isinstance(val, str) else val
    db.commit()
    return {"saved": True, "count": len(items)}


# ---------------- campaigns ----------------
def _campaign_out(c: models.Campaign) -> dict:
    return {
        "id": c.id, "code": c.code, "name": c.name, "short": c.short, "emoji": c.emoji,
        "percent": int(c.percent or 0), "tagline": c.tagline, "blurb": c.blurb, "cta": c.cta,
        "image_url": c.image_url, "starts_at": c.starts_at.isoformat() if c.starts_at else None,
        "ends_at": c.ends_at.isoformat() if c.ends_at else None, "is_active": bool(c.is_active),
        "sort_order": c.sort_order,
    }


def _summary(c: models.Campaign) -> dict:
    end = c.ends_at
    ends_label = "always on" if not end else end.strftime("%d %B").lstrip("0")
    return {
        "code": c.code, "name": c.name, "short": c.short or c.name, "emoji": c.emoji or "🏷️",
        "percent": int(c.percent or 0), "tagline": c.tagline, "blurb": c.blurb, "cta": c.cta,
        "image_url": c.image_url,
        "starts_at": c.starts_at.isoformat() if c.starts_at else None,
        "ends_at": end.isoformat() if end else None,
        "ends_label": ends_label,
        "source": "admin",
    }


def resolve_campaign(db: Session, now: Optional[datetime] = None):
    """Return (campaign_summary, is_admin_managed) for the given moment.

    Admin campaigns always win over the built-in recurring calendar. An admin
    campaign is active when is_active is true and now falls inside its window
    (missing start/end = unbounded)."""
    now = now or datetime.utcnow()
    rows = db.query(models.Campaign).filter(models.Campaign.is_active.is_(True)).order_by(
        models.Campaign.sort_order, models.Campaign.id).all()
    if not rows:
        return None, False
    active = [c for c in rows
              if (not c.starts_at or c.starts_at <= now) and (not c.ends_at or c.ends_at >= now)]
    if not active:
        return None, True  # admin campaigns exist but none active -> show no sale
    out = _summary(active[0])
    upcoming = [c for c in rows if c.starts_at and c.starts_at > now]
    upcoming.sort(key=lambda c: c.starts_at)
    if upcoming:
        nxt = _summary(upcoming[0])
        out["next"] = {"code": nxt["code"], "name": nxt["name"], "percent": nxt["percent"],
                       "starts_at": nxt["starts_at"], "ends_at": nxt["ends_at"],
                       "description": f"{nxt['name']} — flat {nxt['percent']}% OFF"}
    return out, True


@router.get("/api/campaigns")
def list_campaigns(db: Session = Depends(get_db), u=Depends(current_user)):
    rows = db.query(models.Campaign).order_by(models.Campaign.sort_order, models.Campaign.id).all()
    return {"items": [_campaign_out(c) for c in rows]}


@router.post("/api/campaigns", status_code=201)
def create_campaign(p: dict, db: Session = Depends(get_db), u=Depends(require_role("admin"))):
    code = str(p.get("code") or "").strip().upper()
    if not code:
        raise HTTPException(400, "Campaign code is required.")
    if db.query(models.Campaign).filter(models.Campaign.code == code).first():
        raise HTTPException(409, "Campaign code already exists.")
    c = models.Campaign(code=code)
    _apply(c, p)
    db.add(c); db.commit(); db.refresh(c)
    return _campaign_out(c)


@router.put("/api/campaigns/{cid}")
def update_campaign(cid: int, p: dict, db: Session = Depends(get_db), u=Depends(require_role("admin"))):
    c = db.query(models.Campaign).filter(models.Campaign.id == cid).first()
    if not c:
        raise HTTPException(404, "Campaign not found")
    _apply(c, p)
    db.commit(); db.refresh(c)
    return _campaign_out(c)


@router.delete("/api/campaigns/{cid}")
def delete_campaign(cid: int, db: Session = Depends(get_db), u=Depends(require_role("admin"))):
    c = db.query(models.Campaign).filter(models.Campaign.id == cid).first()
    if not c:
        raise HTTPException(404, "Campaign not found")
    db.delete(c); db.commit()
    return {"deleted": cid}


def _apply(c: models.Campaign, p: dict):
    for k in ("name", "short", "emoji", "tagline", "blurb", "cta", "image_url"):
        if k in p:
            setattr(c, k, str(p[k] or "")[:8000])
    if "code" in p and str(p["code"] or "").strip():
        c.code = str(p["code"]).strip().upper()[:64]
    if "percent" in p:
        try: c.percent = int(float(p["percent"]))
        except (TypeError, ValueError): c.percent = 0
    if "is_active" in p:
        c.is_active = bool(p["is_active"])
    if "sort_order" in p:
        try: c.sort_order = int(p["sort_order"])
        except (TypeError, ValueError): pass
    for k in ("starts_at", "ends_at"):
        if k in p:
            v = p[k]
            if not v:
                setattr(c, k, None)
            else:
                try:
                    setattr(c, k, datetime.fromisoformat(str(v).replace("Z", "+00:00")).replace(tzinfo=None))
                except ValueError:
                    setattr(c, k, None)


# ---------------- automation controls ----------------
AUTO_FLAGS = {
    "rfq_followup": "automation_rfq_followup_enabled",
    "campaign_mailer": "automation_campaign_mailer_enabled",
}


def automation_enabled(db: Session, kind: str, default: bool = True) -> bool:
    key = AUTO_FLAGS.get(kind)
    if not key:
        return default
    row = db.query(models.BusinessSetting).filter(models.BusinessSetting.key == key).first()
    if not row or not row.value:
        return default
    return str(row.value).strip().lower() in ("1", "true", "yes", "on")


@router.get("/api/automation/settings")
def automation_settings(db: Session = Depends(get_db), u=Depends(current_user)):
    return {k: automation_enabled(db, k) for k in AUTO_FLAGS}


@router.put("/api/automation/settings")
def save_automation_settings(p: dict, db: Session = Depends(get_db), u=Depends(require_role("admin"))):
    for kind, key in AUTO_FLAGS.items():
        if kind in p:
            row = db.query(models.BusinessSetting).filter(models.BusinessSetting.key == key).first()
            if not row:
                row = models.BusinessSetting(key=key)
                db.add(row)
            row.value = "true" if p[kind] else "false"
    db.commit()
    return {"saved": True}


@router.post("/api/automation/run/{kind}")
def run_automation(kind: str, db: Session = Depends(get_db), u=Depends(require_role("admin"))):
    """Run one automation pass now. Returns an honest result (no fabricated sends)."""
    if kind == "rfq_followup":
        from .rfq_followup import check_once
        return check_once()
    if kind == "campaign_mailer":
        from .campaign_mailer import check_once
        return check_once()
    raise HTTPException(400, "Unknown automation kind")
