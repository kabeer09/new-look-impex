"""Europe Markets admin dashboard — first-party data only.

For each of the ten Europe-market pages this reports the enquiries received
(real rows in `enquiries`), product-view events tagged with that country and,
when a Search Console integration has actually synced data, GSC clicks and
impressions for that country's page. Nothing is fabricated: where a data source
is unavailable the value is 0 / null and a limitation note is returned.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from . import models
from .auth import current_user
from .database import get_db

router = APIRouter()

# (slug, display name, canonical path, common enquiry-country spellings)
COUNTRIES = [
    ("germany", "Germany", "/europe/germany", ("germany", "deutschland")),
    ("france", "France", "/europe/france", ("france",)),
    ("italy", "Italy", "/europe/italy", ("italy", "italia")),
    ("netherlands", "Netherlands", "/europe/netherlands", ("netherlands", "holland")),
    ("spain", "Spain", "/europe/spain", ("spain", "españa")),
    ("belgium", "Belgium", "/europe/belgium", ("belgium", "belgie")),
    ("poland", "Poland", "/europe/poland", ("poland", "polska")),
    ("sweden", "Sweden", "/europe/sweden", ("sweden", "sverige")),
    ("denmark", "Denmark", "/europe/denmark", ("denmark", "danmark")),
    ("austria", "Austria", "/europe/austria", ("austria", "osterreich")),
]


@router.get("/api/admin/europe-dashboard")
def europe_dashboard(
    days: int = Query(90, ge=7, le=365),
    db: Session = Depends(get_db),
    u=Depends(current_user),
):
    since = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days)

    # Pre-aggregate enquiries by lowercased country for the window.
    enq_rows = (
        db.query(func.lower(models.Enquiry.country), func.count(models.Enquiry.id))
        .filter(models.Enquiry.created_at >= since, models.Enquiry.country.isnot(None))
        .group_by(func.lower(models.Enquiry.country))
        .all()
    )
    enq_by_country = {c: n for c, n in enq_rows if c}

    # GSC clicks/impressions keyed by page URL (only if the integration synced).
    gsc_rows = (
        db.query(models.AnalyticsDaily.url,
                 func.sum(models.AnalyticsDaily.clicks),
                 func.sum(models.AnalyticsDaily.impressions))
        .filter(models.AnalyticsDaily.source == "gsc",
                models.AnalyticsDaily.date >= since.date())
        .group_by(models.AnalyticsDaily.url)
        .all()
    )
    gsc = {str(url).rstrip("/"): (int(c or 0), int(i or 0)) for url, c, i in gsc_rows}

    # Product-view events tagged with the country name (from the landing page).
    ev_rows = (
        db.query(func.lower(models.AnalyticsEvent.country), func.count(models.AnalyticsEvent.id))
        .filter(models.AnalyticsEvent.event_type == "product_view",
                models.AnalyticsEvent.created_at >= since)
        .group_by(func.lower(models.AnalyticsEvent.country))
        .all()
    )
    ev_by_country = {c: n for c, n in ev_rows if c}

    rows = []
    for slug, name, path, aliases in COUNTRIES:
        enquiries = sum(enq_by_country.get(a, 0) for a in aliases)
        page_views = sum(ev_by_country.get(a, 0) for a in aliases)
        clicks, impressions = gsc.get("https://www.newlookimpex.store" + path, (0, 0))
        rows.append({
            "slug": slug,
            "name": name,
            "path": path,
            "enquiries": enquiries,
            "page_events": page_views,
            "gsc_clicks": clicks,
            "gsc_impressions": impressions,
            "gsc_configured": bool(gsc_rows),
        })

    top = sorted(rows, key=lambda r: (-r["enquiries"], -r["gsc_clicks"]))
    return {
        "days": days,
        "rows": rows,
        "top_by_enquiries": [{"name": r["name"], "enquiries": r["enquiries"]} for r in top[:5]],
        "limitations": (
            "Enquiries and page events are first-party counts from this database. "
            "GSC clicks/impressions appear only after an authorised Search Console "
            "integration is connected and synced; they are 0 until then. Page views "
            "here are event counts, not unique visitors, and no conversion rate is "
            "claimed without a defined denominator."
        ),
    }
