"""SEO growth intelligence using REAL data only.

GSC rows are synced by the existing authorised endpoint
(`POST /api/integrations/google/search-console/sync`) into `analytics_daily`
with source='gsc'. Sample rows are never used as Google data. Where an
integration is not connected the result says so explicitly; no search volume,
ranking or traffic is invented.
"""
from __future__ import annotations
from collections import defaultdict
from datetime import date, datetime, timedelta
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models
from ..config import settings

J = lambda v, d=None: __import__("json").loads(v) if isinstance(v, str) and v.strip() else (d if d is not None else v)
DUMP = lambda v: __import__("json").dumps(v, ensure_ascii=False, default=str)

# Verified commercial themes from the business. These are CANDIDATES, not
# claimed rankings or volumes. Intent + country decide where they belong.
CANDIDATE_KEYWORDS = [
    ("copper bottles wholesale", "global", "commercial", "copper-bottles"),
    ("copper bottle manufacturer india", "global", "commercial", "copper-bottles"),
    ("copperware manufacturer in india", "global", "commercial", "/"),
    ("copper kitchenware wholesale", "global", "commercial", "copper-kitchenware"),
    ("copper bottles exporter india", "global", "commercial", "copper-bottles"),
    ("moradabad brass handicrafts manufacturer", "global", "commercial", "/"),
    ("brass handicrafts wholesale", "global", "commercial", "brass-kitchenware"),
    ("brass home decor manufacturer", "global", "commercial", "/"),
    ("indian metal handicrafts exporter", "global", "commercial", "/"),
    ("brass lantern wholesale", "global", "commercial", "/"),
    ("metal home decor supplier india", "global", "commercial", "/"),
    ("copper and brass products manufacturer", "global", "commercial", "/"),
]

TARGET_MARKETS = ["US", "GB", "AE", "AU", "CA", "DE", "FR", "NL", "SA"]


def gsc_configured(db: Session) -> bool:
    row = db.query(models.Integration).filter(models.Integration.provider == "google_search_console").first()
    return bool(row and row.status == "connected" and row.access_token)


def ga4_configured() -> bool:
    return bool(settings.GA4_PROPERTY_ID and settings.GA4_SERVICE_ACCOUNT_JSON)


def ga4_sync(db: Session, days: int = 28) -> dict:
    """Optional GA4 Data API sync. Never fabricates metrics when unavailable."""
    if not ga4_configured():
        return {"ok": False, "configured": False, "note": "GA4 Data API not configured; metrics unavailable."}
    try:
        from google.analytics.data_v1beta import BetaAnalyticsDataClient
        from google.analytics.data_v1beta.types import RunReportRequest, DateRange, Dimension, Metric
        from google.oauth2 import service_account
        raw = settings.GA4_SERVICE_ACCOUNT_JSON
        if raw.strip().startswith("{"):
            info = J(raw, {})
            creds = service_account.Credentials.from_service_account_info(info)
        else:
            creds = service_account.Credentials.from_service_account_file(raw)
        client = BetaAnalyticsDataClient(credentials=creds)
        req = RunReportRequest(
            property=f"properties/{settings.GA4_PROPERTY_ID}",
            date_ranges=[DateRange(start_date=f"{days}daysAgo", end_date="yesterday")],
            dimensions=[Dimension(name="country")],
            metrics=[Metric(name="sessions"), Metric(name="activeUsers")],
        )
        resp = client.run_report(req)
        rows = [{"country": r.dimension_values[0].value,
                 "sessions": int(r.metric_values[0].value),
                 "active_users": int(r.metric_values[1].value)} for r in resp.rows]
        for r in rows:
            snap = (db.query(models.SeoSnapshot)
                    .filter(models.SeoSnapshot.period == date.today().isoformat(),
                            models.SeoSnapshot.source == "ga4").first())
            if snap is None:
                snap = models.SeoSnapshot(period=date.today().isoformat(), source="ga4", note=DUMP(rows)[:4000])
                db.add(snap)
            else:
                snap.note = DUMP(rows)[:4000]
        db.commit()
        return {"ok": True, "configured": True, "rows": rows}
    except Exception as e:
        return {"ok": False, "configured": True, "note": f"GA4 sync failed: {str(e)[:250]}"}


def _real_rows(db: Session, start: date, end: date):
    return (db.query(models.AnalyticsDaily)
            .filter(models.AnalyticsDaily.date >= start, models.AnalyticsDaily.date <= end,
                    models.AnalyticsDaily.source == "gsc",
                    func.lower(models.AnalyticsDaily.source) != "sample").all())


def keyword_analysis(db: Session, days: int = 28) -> dict:
    """Aggregate real GSC query rows and surface improvement opportunities."""
    end = date.today() - timedelta(days=3)
    start = end - timedelta(days=days)
    rows = _real_rows(db, start, end)
    if not rows:
        return {
            "configured": gsc_configured(db), "has_data": False,
            "note": "No Search Console query data synced. Use /api/integrations/google/search-console/sync. "
                    "No clicks, positions or volumes are estimated.",
            "totals": {"clicks": None, "impressions": None, "queries": 0},
            "top": [], "low_ctr": [], "positions_5_30": [], "declining": [], "country_visibility": [],
        }
    agg = defaultdict(lambda: {"clicks": 0, "impressions": 0, "position_sum": 0.0, "n": 0, "page": ""})
    for r in rows:
        k = (r.query or "").strip().lower()
        if not k:
            continue
        a = agg[k]
        a["clicks"] += int(r.clicks or 0)
        a["impressions"] += int(r.impressions or 0)
        a["position_sum"] += float(r.position or 0)
        a["n"] += 1
        a["page"] = a["page"] or (r.url or "")
    items = []
    for k, a in agg.items():
        ctr = (a["clicks"] / a["impressions"] * 100) if a["impressions"] else 0.0
        pos = a["position_sum"] / a["n"] if a["n"] else 0.0
        items.append({"keyword": k, "clicks": a["clicks"], "impressions": a["impressions"],
                      "ctr": round(ctr, 2), "position": round(pos, 1), "page": a["page"]})
    items.sort(key=lambda x: -x["impressions"])
    # previous window for decline detection
    prev_end = start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=days)
    prev = defaultdict(int)
    for r in _real_rows(db, prev_start, prev_end):
        prev[(r.query or "").strip().lower()] += int(r.clicks or 0)
    declining = []
    for it in items:
        before = prev.get(it["keyword"], 0)
        if before >= 5 and it["clicks"] < before * 0.6:
            declining.append({**it, "previous_clicks": before})
    countries = (db.query(models.Enquiry.country, func.count(models.Enquiry.id))
                 .group_by(models.Enquiry.country).all())
    return {
        "configured": True, "has_data": True,
        "period": {"start": str(start), "end": str(end), "days": days},
        "totals": {"clicks": sum(i["clicks"] for i in items),
                   "impressions": sum(i["impressions"] for i in items), "queries": len(items)},
        "top": items[:15],
        "low_ctr": [i for i in items if i["impressions"] >= 100 and i["ctr"] < 1.0][:15],
        "positions_5_30": [i for i in items if 5 <= i["position"] <= 30][:15],
        "declining": declining[:15],
        "country_visibility": [{"country": c or "Unknown", "enquiries": n} for c, n in countries],
        "note": "Country column shows buyer enquiries, not GSC country traffic (GSC sync has no country dimension).",
    }


def sync_keywords(db: Session, days: int = 28) -> dict:
    """Persist real GSC keywords and verify candidate target URLs."""
    analysis = keyword_analysis(db, days)
    saved = 0
    if analysis.get("has_data"):
        for it in analysis["top"] + analysis["low_ctr"] + analysis["positions_5_30"] + analysis["declining"]:
            row = (db.query(models.SeoKeyword)
                   .filter(models.SeoKeyword.keyword == it["keyword"],
                           models.SeoKeyword.country == "global",
                           models.SeoKeyword.source == "gsc").first())
            if row is None:
                row = models.SeoKeyword(keyword=it["keyword"], country="global", source="gsc", intent="from_gsc")
                db.add(row)
            row.clicks = it["clicks"]; row.impressions = it["impressions"]
            row.ctr = str(it["ctr"]); row.position = str(it["position"])
            row.target_url = it.get("page", "")[:500]
            row.priority = "high" if (it["position"] <= 30 and it["impressions"] >= 100) else "normal"
            row.checked_at = datetime.utcnow()
            saved += 1
    # verified candidates (no invented volume/position)
    for keyword, country, intent, target in CANDIDATE_KEYWORDS:
        exists = None
        if target.startswith("/"):
            exists = db.query(models.WebsitePage).filter(models.WebsitePage.url == target).first()
        else:
            exists = db.query(models.Category).filter(models.Category.slug == target).first()
        url = target if exists else ""
        row = (db.query(models.SeoKeyword)
               .filter(models.SeoKeyword.keyword == keyword, models.SeoKeyword.country == country,
                       models.SeoKeyword.source == "candidate").first())
        if row is None:
            row = models.SeoKeyword(keyword=keyword, country=country, source="candidate", intent=intent)
            db.add(row)
        row.target_url = url
        row.status = "verified_target" if url else "no_matching_page"
        row.checked_at = datetime.utcnow()
    db.commit()
    return {"ok": True, "gsc_keywords_saved": saved, "candidates": len(CANDIDATE_KEYWORDS),
            "has_real_data": bool(analysis.get("has_data"))}


def snapshot(db: Session, days: int = 28) -> dict:
    """Persist real periodic SEO metrics with honest nulls."""
    analysis = keyword_analysis(db, days)
    period = date.today().isoformat()
    row = (db.query(models.SeoSnapshot)
           .filter(models.SeoSnapshot.period == period, models.SeoSnapshot.source == "gsc").first())
    if analysis.get("has_data"):
        vals = dict(clicks=analysis["totals"]["clicks"], impressions=analysis["totals"]["impressions"],
                    ctr=str(round(analysis["totals"]["clicks"] / max(1, analysis["totals"]["impressions"]) * 100, 2)),
                    note="Real Search Console data via authorised sync")
    else:
        vals = dict(clicks=None, impressions=None, ctr="", note=analysis["note"])
    if row is None:
        row = models.SeoSnapshot(period=period, source="gsc"); db.add(row)
    for k, v in vals.items():
        setattr(row, k, v)
    db.commit()
    return {"ok": True, "period": period, **vals}


def detect_issues(db: Session) -> dict:
    """Detect real, verifiable website/SEO issues from the database."""
    found = []

    def add(kind, severity, subject, evidence, agent):
        found.append({"kind": kind, "severity": severity, "subject": str(subject)[:255],
                      "evidence": str(evidence)[:1000], "suggested_agent": agent})

    missing_meta = (db.query(models.Product).filter(
        models.Product.status == "published",
        (models.Product.seo_title == "") | (models.Product.seo_description == "")).limit(50).all())
    for p in missing_meta:
        add("missing_product_metadata", "high", p.name,
            "published product has empty seo_title or seo_description", "product")

    no_image = (db.query(models.Product).filter(models.Product.status == "published").all())
    for p in no_image:
        n = db.query(func.count(models.ProductImage.id)).filter(models.ProductImage.product_id == p.id).scalar() or 0
        if n == 0:
            add("missing_product_image", "high", p.name, "published product has no image", "creative_studio")

    no_alt = (db.query(models.ProductImage).filter(
        (models.ProductImage.alt_text == "") | (models.ProductImage.alt_text.is_(None))).limit(50).all())
    for img in no_alt:
        add("missing_image_alt", "medium", f"image {img.id}",
            "product image has no descriptive alt text", "product")

    dupes = (db.query(models.Product.name, func.count(models.Product.id))
             .group_by(models.Product.name).having(func.count(models.Product.id) > 1).limit(30).all())
    for name, count in dupes:
        add("duplicate_product_title", "medium", name, f"{count} products share this exact name", "product")

    pages = db.query(models.WebsitePage).all() if hasattr(models, "WebsitePage") else []
    for pg in pages:
        seo = db.query(models.SeoPage).filter(models.SeoPage.path == pg.url).first()
        if not pg.meta_description and (seo is None or not seo.meta_description):
            add("missing_page_metadata", "medium", pg.url, "website page has no meta description", "website")

    # Dedupe inside this run AND against existing open issues.
    unique = {}
    for it in found:
        unique.setdefault((it["kind"], it["subject"]), it)
    found = list(unique.values())
    created = 0
    for it in found:
        row = (db.query(models.GrowthIssue)
               .filter(models.GrowthIssue.kind == it["kind"], models.GrowthIssue.subject == it["subject"],
                       models.GrowthIssue.status == "open").first())
        if row is None:
            db.add(models.GrowthIssue(**it)); created += 1
    db.commit()
    return {"ok": True, "detected": len(found), "new_issues": created, "issues": found[:50]}


def issue_tasks(db: Session, limit: int = 8) -> dict:
    """Turn open issues into real, de-duplicated Help Desk tasks."""
    from ..helpdesk import service as S
    rows = (db.query(models.GrowthIssue).filter(models.GrowthIssue.status == "open")
            .order_by(models.GrowthIssue.detected_at.asc()).limit(limit).all())
    made = []
    for issue in rows:
        if issue.task_id:
            continue
        if issue.kind in ("missing_product_metadata", "missing_image_alt", "duplicate_product_title"):
            agent = "product"
        elif issue.kind == "missing_product_image":
            agent = "creative_studio"
        else:
            agent = issue.suggested_agent or "website"
        task = S.create_task(
            db, title=f"Fix {issue.kind}: {issue.subject}", agent=agent, requesting="growth_monitor",
            description=f"Real detected issue ({issue.kind}): {issue.subject}. Evidence: {issue.evidence}. "
                        "Inspect the current record and propose a verified fix. Never invent product facts. "
                        "Public-facing changes require approval.",
            priority="high" if issue.severity == "high" else "normal",
            approval_required=True)
        issue.task_id = task.get("id")
        made.append({"issue_id": issue.id, "task_id": issue.task_id, "agent": agent, "duplicate": task.get("duplicate")})
    db.commit()
    return {"ok": True, "tasks_created": len(made), "items": made}
