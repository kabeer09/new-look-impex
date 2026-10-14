"""Analytics event beacon + summary (product views, RFQ adds, downloads, clicks)."""
from __future__ import annotations
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from . import models
from .auth import current_user, require_role
from .database import SessionLocal, get_db
from .schemas import EventIn

router = APIRouter()

ALLOWED_EVENTS = {"product_view", "rfq_add", "rfq_submit",
                    "catalogue_download", "contact_click", "whatsapp_click"}


@router.post("/api/public/events", status_code=202)
def record_event(body: EventIn):
    if body.event_type not in ALLOWED_EVENTS:
        return {"recorded": False}
    ev = models.AnalyticsEvent(
        event_type=body.event_type, url=body.url[:1024],
        product_id=body.product_id, country=body.country[:128],
        referrer=body.referrer[:1024], campaign=body.campaign[:512])
    db = SessionLocal()
    try:
        db.add(ev); db.commit()
    finally:
        db.close()
    return {"recorded": True}


@router.get("/api/events/summary")
def events_summary(days: int = 30, db: Session = Depends(get_db),
                     u=Depends(require_role("admin", "editor"))):
    since = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days)
    q = db.query(models.AnalyticsEvent).filter(models.AnalyticsEvent.created_at >= since)
    totals = {}
    for et in ALLOWED_EVENTS:
        totals[et] = db.query(func.count(models.AnalyticsEvent.id)).filter(
            models.AnalyticsEvent.event_type == et,
            models.AnalyticsEvent.created_at >= since).scalar() or 0
    # by day
    by_day = {}
    rows = db.query(func.date(models.AnalyticsEvent.created_at),
                      models.AnalyticsEvent.event_type,
                      func.count(models.AnalyticsEvent.id)) \
        .filter(models.AnalyticsEvent.created_at >= since) \
        .group_by(func.date(models.AnalyticsEvent.created_at),
                      models.AnalyticsEvent.event_type).all()
    for d, et, n in rows:
        by_day.setdefault(str(d), {})[et] = n
    return {"days": days, "totals": totals, "by_day": by_day}
