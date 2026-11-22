"""Site banners (homepage hero + future placements)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from . import models
from .schemas import _NullCoercing
from .auth import current_user, require_role
from .database import get_db

router = APIRouter()


class BannerIn(_NullCoercing):
    placement: str = "home_hero"
    title: str = ""
    subtitle: str = ""
    image_url: str = ""
    cta_text: str = ""
    cta_link: str = ""
    sort_order: int = 0
    is_active: bool = True
    start_at: str = ""
    end_at: str = ""


def _out(b: models.Banner) -> dict:
    return {"id": b.id, "placement": b.placement, "title": b.title,
            "subtitle": b.subtitle, "image_url": b.image_url,
            "cta_text": b.cta_text, "cta_link": b.cta_link,
            "sort_order": b.sort_order, "is_active": b.is_active,
        "start_at": b.start_at.isoformat() if getattr(b, "start_at", None) else None,
        "end_at": b.end_at.isoformat() if getattr(b, "end_at", None) else None,
            "created_at": b.created_at.isoformat() if b.created_at else None}


def _apply_dates(b, body):
    from datetime import datetime
    for field, value in (("start_at", getattr(body, "start_at", "")), ("end_at", getattr(body, "end_at", ""))):
        if not value:
            setattr(b, field, None)
        else:
            try:
                setattr(b, field, datetime.fromisoformat(str(value).replace("Z", "+00:00")).replace(tzinfo=None))
            except ValueError:
                setattr(b, field, None)


@router.get("/api/public/banners")
def public_banners(placement: str = "home_hero", db: Session = Depends(get_db)):
    from datetime import datetime
    now = datetime.utcnow()
    rows = db.query(models.Banner).filter(
        models.Banner.placement == placement,
        models.Banner.is_active == True).order_by(  # noqa: E712
        models.Banner.sort_order, models.Banner.id).all()
    rows = [b for b in rows
            if (not getattr(b, "start_at", None) or b.start_at <= now)
            and (not getattr(b, "end_at", None) or b.end_at >= now)]
    return {"items": [_out(b) for b in rows]}


@router.get("/api/banners")
def list_banners(db: Session = Depends(get_db), u=Depends(current_user)):
    rows = db.query(models.Banner).order_by(models.Banner.sort_order,
                                            models.Banner.id).all()
    return {"total": len(rows), "items": [_out(b) for b in rows]}


@router.post("/api/banners", status_code=201)
def create_banner(body: BannerIn, db: Session = Depends(get_db),
                  u=Depends(require_role("admin", "editor"))):
    if not body.image_url.strip():
        raise HTTPException(400, "image_url is required.")
    b = models.Banner(placement=body.placement.strip() or "home_hero",
                      title=body.title.strip()[:255],
                      subtitle=body.subtitle.strip()[:512],
                      image_url=body.image_url.strip()[:1024],
                      cta_text=body.cta_text.strip()[:128],
                      cta_link=body.cta_link.strip()[:512],
                      sort_order=body.sort_order, is_active=body.is_active)
    _apply_dates(b, body)
    db.add(b); db.commit(); db.refresh(b)
    return _out(b)


@router.put("/api/banners/{bid}")
def update_banner(bid: int, body: BannerIn, db: Session = Depends(get_db),
                  u=Depends(require_role("admin", "editor"))):
    b = db.query(models.Banner).filter(models.Banner.id == bid).first()
    if not b:
        raise HTTPException(404, "Banner not found")
    b.placement = body.placement.strip() or b.placement
    b.title = body.title.strip()[:255]
    b.subtitle = body.subtitle.strip()[:512]
    if body.image_url.strip():
        b.image_url = body.image_url.strip()[:1024]
    b.cta_text = body.cta_text.strip()[:128]
    b.cta_link = body.cta_link.strip()[:512]
    b.sort_order = body.sort_order
    b.is_active = body.is_active
    _apply_dates(b, body)
    db.commit(); db.refresh(b)
    return _out(b)


@router.delete("/api/banners/{bid}")
def delete_banner(bid: int, db: Session = Depends(get_db),
                  u=Depends(require_role("admin", "editor"))):
    b = db.query(models.Banner).filter(models.Banner.id == bid).first()
    if not b:
        raise HTTPException(404, "Banner not found")
    db.delete(b); db.commit()
    return {"deleted": bid}


@router.get("/api/admin/watcher")
def watcher_status(u=Depends(require_role("admin", "editor"))):
    from .watcher import LAST_RUN
    from .config import settings
    return {"enabled": bool(settings.INCOMING_ENABLED),
            "dir": settings.INCOMING_DIR,
            "interval_seconds": settings.INCOMING_INTERVAL,
            "auto_publish": bool(settings.INCOMING_AUTO_PUBLISH),
            "rights": settings.INCOMING_RIGHTS,
            "last_run": LAST_RUN}
