"""Search Console service layer: tokens, sync, queries, inspections, sitemaps and
evidence-backed recommendations. Every value returned originates from the Google
API or our own database — no fabricated analytics."""
from __future__ import annotations

import json
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import date, datetime, timedelta, timezone
from typing import Any

import httpx

from .. import models
from ..config import settings
from . import oauth

COUNTRY_PATHS = {
    "USA": "/usa", "Canada": "/canada", "United Kingdom": "/uk", "Germany": "/europe/germany",
    "France": "/europe/france", "Italy": "/europe/italy", "Netherlands": "/europe/netherlands",
    "Spain": "/europe/spain", "Belgium": "/europe/belgium", "UAE": "/uae",
    "Saudi Arabia": "/saudi-arabia", "Qatar": "/qatar", "Australia": "/au",
    "New Zealand": "/new-zealand", "Japan": "/japan", "South Korea": "/south-korea",
    "Singapore": "/singapore", "Switzerland": "/europe/switzerland", "Sweden": "/europe/sweden",
    "Denmark": "/europe/denmark", "Norway": "/europe/norway", "South Africa": "/south-africa",
    "Austria": "/europe/austria", "Poland": "/europe/poland", "Portugal": "/europe/portugal",
    "Greece": "/europe/greece", "Turkey": "/turkey", "Malaysia": "/malaysia",
    "Indonesia": "/indonesia", "Brazil": "/brazil",
}


def get_connection(db):
    return db.query(models.GscConnection).first()


def ensure_connection(db):
    row = get_connection(db)
    if row is None:
        row = models.GscConnection(provider="google_search_console", status="disconnected")
        db.add(row); db.commit(); db.refresh(row)
    return row


def connection_status(db) -> dict:
    ok, reason = oauth.configured()
    row = get_connection(db)
    connected = bool(row and row.status == "connected" and row.access_token_enc)
    return {
        "configured": ok,
        "setup_message": "" if ok else reason,
        "connected": connected,
        "status": row.status if row else "disconnected",
        "site_url": row.site_url if row else oauth.site_url(),
        "scope": "write" if settings.GOOGLE_SEARCH_CONSOLE_WRITE_ENABLED else "readonly",
        "required_scopes": oauth.required_scopes(),
        "granted_scopes": (row.scopes if row else "") or "",
        "missing_scopes": oauth.missing_scopes(row.scopes if row else ""),
        "reconnect_needed": bool(row and row.status == "connected" and
                                 oauth.missing_scopes(row.scopes)),
        "callback_url": oauth.redirect_uri(),
        "last_sync_at": row.last_sync_at.isoformat() if row and row.last_sync_at else None,
        "last_error": (row.last_error if row else "") or "",
        "note": ("No analytics are shown until a real Search Console sync succeeds."
                 if not connected else ""),
    }


def store_tokens(db, row, payload: dict, nonce: str | None = None) -> None:
    row.access_token_enc = oauth.encrypt_token(payload.get("access_token", ""))
    refresh = payload.get("refresh_token") or oauth.decrypt_token(row.refresh_token_enc or "")
    if refresh:
        row.refresh_token_enc = oauth.encrypt_token(refresh)
    expires_in = int(payload.get("expires_in") or 3600)
    row.token_expiry = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(seconds=expires_in)
    row.scopes = str(payload.get("scope") or oauth.scopes())
    row.status = "connected"
    row.last_error = ""
    if nonce is not None:
        row.oauth_nonce = ""
    db.commit()


def disconnect(db) -> None:
    row = get_connection(db)
    if row:
        row.access_token_enc = ""; row.refresh_token_enc = ""
        row.status = "disconnected"; row.token_expiry = None
        row.oauth_nonce = ""; row.last_error = ""
        db.commit()


def refresh_now(db, row) -> str:
    token = oauth.refresh_access_token(oauth.decrypt_token(row.refresh_token_enc or ""))
    store_tokens(db, row, token)
    return token.get("access_token", "")


def valid_access_token(db, row, force: bool = False) -> str:
    access = oauth.decrypt_token(row.access_token_enc or "")
    expiry = row.token_expiry
    stale = (expiry is None or expiry <= datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(seconds=60))
    if not access or force or stale:
        access = refresh_now(db, row)
    return access


def site_api_base(row) -> str:
    site = (row.site_url or oauth.site_url()).strip()
    return "https://www.googleapis.com/webmasters/v3/sites/" + urllib.parse.quote(site, safe="")


def gsc_request(db, method: str, url: str, body: dict | None = None,
                params: dict | None = None, retry_401: bool = True) -> dict:
    row = get_connection(db)
    if not row or row.status != "connected":
        raise oauth.GscError("Search Console is not connected.")
    token = valid_access_token(db, row)
    try:
        return oauth.api_request(method, url, token, body, params)
    except oauth.GscError as e:
        if e.status == 401 and retry_401:
            token = refresh_now(db, row)
            return oauth.api_request(method, url, token, body, params)
        raise


def list_properties(db) -> list[dict]:
    data = gsc_request(db, "GET", "https://www.googleapis.com/webmasters/v3/sites")
    return data.get("siteEntry", []) or []


def _save_rows(db, run_id: str, site: str, dimension_type: str,
               keys: list, row: dict, date_override: str = "") -> int:
    value = str(keys[0]) if keys else ""
    # Search Analytics only returns a `date` member when `date` is a requested
    # dimension. For every other dimension we request `date` explicitly and read
    # it from keys[1]; totals get the period end so they fall inside the range.
    row_date = date_override or str(row.get("date") or "") or (str(keys[1]) if len(keys) > 1 else "1970-01-01")
    existing = (db.query(models.GscRow)
                .filter(models.GscRow.run_id == run_id,
                        models.GscRow.date == row_date,
                        models.GscRow.dimension_type == dimension_type,
                        models.GscRow.dimension_value == value).first())
    vals = dict(run_id=run_id, site_url=site,
                date=row_date,
                dimension_type=dimension_type, dimension_value=value[:1000],
                clicks=int(row.get("clicks") or 0), impressions=int(row.get("impressions") or 0),
                ctr=float(row.get("ctr") or 0), position=float(row.get("position") or 0))
    if existing:
        for k, v in vals.items():
            setattr(existing, k, v)
    else:
        db.add(models.GscRow(**vals))
    return 1


def sync_analytics(db, start: str, end: str) -> dict:
    """Fetch real Search Analytics data for the exact period and cache it."""
    run = models.GscSyncRun(site_url=oauth.site_url(), period_start=start,
                            period_end=end, status="running")
    db.add(run); db.flush()
    saved = 0
    base = site_api_base(get_connection(db)) + "/searchAnalytics/query"
    try:
        specs = [
            ("totals", []),
            ("date", ["date"]),
            ("query", ["query"]),
            ("page", ["page"]),
            ("country", ["country"]),
            ("device", ["device"]),
            ("appearance", ["searchAppearance"]),
        ]
        for name, dims in specs:
            # Query dimension rows must carry their own date, otherwise every
            # cached row lands on 1970-01-01 and the dashboard reads zero.
            request_dims = dims if name in ("totals", "date") else dims + ["date"]
            body: dict[str, Any] = {
                "startDate": start, "endDate": end, "dimensions": request_dims,
                "rowLimit": 5000, "startRow": 0,
            }
            for _page in range(5):  # up to 25,000 rows per dimension
                data = gsc_request(db, "POST", base, body)
                rows = data.get("rows", []) or []
                for r in rows:
                    keys = r.get("keys", []) or []
                    if name == "totals":
                        date_val = end
                    elif name == "date":
                        date_val = str(keys[0]) if keys else end
                    else:
                        date_val = ""
                    saved += _save_rows(db, run.id, run.site_url, name,
                                        keys, r, date_override=date_val)
                db.flush()
                if len(rows) < 5000:
                    break
                body["startRow"] += 5000
        run.status = "success"; run.rows_saved = saved
        run.message = "Real Search Console API data."
        row = get_connection(db)
        if row:
            row.last_sync_at = datetime.now(timezone.utc).replace(tzinfo=None)
            row.status = "connected"
        db.add(models.WorkflowExecution(workflow="gsc_sync_v2", status="success",
                                        detail=f"rows={saved} {start}..{end}"))
        db.commit()
        return {"status": "success", "rows_saved": saved, "start": start, "end": end,
                "run_id": run.id}
    except Exception as e:
        db.rollback()
        run = db.query(models.GscSyncRun).filter(models.GscSyncRun.id == run.id).first()
        if run:
            run.status = "failed"; run.message = str(e)[:500]
            run.finished_at = datetime.now(timezone.utc).replace(tzinfo=None)
        row = get_connection(db)
        if row:
            row.status = "error"; row.last_error = str(e)[:500]
        db.add(models.WorkflowExecution(workflow="gsc_sync_v2", status="failed",
                                        detail=str(e)[:500]))
        db.commit()
        raise


def latest_run_id(db):
    r = (db.query(models.GscSyncRun)
         .filter(models.GscSyncRun.status == "success")
         .order_by(models.GscSyncRun.started_at.desc()).first())
    return r.id if r else ""


def totals(db, start: str, end: str, run_id: str | None = None) -> dict:
    rid = run_id or latest_run_id(db)
    q = db.query(models.GscRow).filter(models.GscRow.dimension_type == "totals",
                                       models.GscRow.date >= start, models.GscRow.date <= end)
    if rid:
        q = q.filter(models.GscRow.run_id == rid)
    rows = q.all()
    clicks = sum(r.clicks for r in rows); impressions = sum(r.impressions for r in rows)
    return {
        "clicks": clicks, "impressions": impressions,
        "ctr": (clicks / impressions) if impressions else 0.0,
        "position": (sum(r.position for r in rows) / len(rows)) if rows else 0.0,
        "period": {"start": start, "end": end},
        "source": "Google Search Console API (cached)",
    }


def grouped(db, dimension_type: str, start: str, end: str, limit: int = 20,
            offset: int = 0) -> dict:
    rid = latest_run_id(db)
    rows = (db.query(models.GscRow)
            .filter(models.GscRow.dimension_type == dimension_type,
                    models.GscRow.date >= start, models.GscRow.date <= end,
                    models.GscRow.run_id == rid)
            .all())
    agg: dict[str, dict] = {}
    for r in rows:
        a = agg.setdefault(r.dimension_value or "(not set)",
                           {"clicks": 0, "impressions": 0, "position_sum": 0.0, "days": 0})
        a["clicks"] += r.clicks; a["impressions"] += r.impressions
        a["position_sum"] += r.position; a["days"] += 1
    items = [{"value": k, "clicks": v["clicks"], "impressions": v["impressions"],
              "ctr": (v["clicks"] / v["impressions"]) if v["impressions"] else 0.0,
              "position": (v["position_sum"] / v["days"]) if v["days"] else 0.0}
             for k, v in agg.items()]
    items.sort(key=lambda x: (-x["impressions"], -x["clicks"]))
    return {"items": items[offset:offset + limit], "total": len(items),
            "limit": limit, "offset": offset, "period": {"start": start, "end": end}}


def daily(db, start: str, end: str) -> list[dict]:
    rid = latest_run_id(db)
    rows = (db.query(models.GscRow)
            .filter(models.GscRow.dimension_type == "date",
                    models.GscRow.date >= start, models.GscRow.date <= end,
                    models.GscRow.run_id == rid).all())
    by_day: dict[str, dict] = {}
    for r in rows:
        a = by_day.setdefault(r.date, {"date": r.date, "clicks": 0, "impressions": 0,
                                       "position_sum": 0.0, "n": 0})
        a["clicks"] += r.clicks; a["impressions"] += r.impressions
        a["position_sum"] += r.position; a["n"] += 1
    return [{"date": k, "clicks": v["clicks"], "impressions": v["impressions"],
             "position": (v["position_sum"] / v["n"]) if v["n"] else 0.0}
            for k, v in sorted(by_day.items())]


def date_range(preset: str, custom_start: str = "", custom_end: str = "") -> tuple[str, str, str, str]:
    """Return (start, end, prev_start, prev_end) using real calendar dates."""
    today = date.today() - timedelta(days=3)  # GSC data latency
    if preset == "custom" and custom_start and custom_end:
        start = date.fromisoformat(custom_start); end = date.fromisoformat(custom_end)
    else:
        days = {"7d": 7, "28d": 28, "3m": 90, "6m": 180}.get(preset, 28)
        end = today; start = today - timedelta(days=days - 1)
    span = (end - start).days + 1
    return str(start), str(end), str(start - timedelta(days=span)), str(start - timedelta(days=1))


def inspect_url(db, url: str, user: str) -> dict:
    site = get_connection(db).site_url or oauth.site_url()
    base = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect"
    data = gsc_request(db, "POST", base, {"inspectionUrl": url, "siteUrl": site})
    result = (data.get("inspectionResult") or {})
    index = result.get("indexStatusResult") or {}
    raw = {
        "verdict": result.get("verdict", ""),
        "index_status": index.get("verdict", ""),
        "coverage_state": index.get("coverageState", ""),
        "last_crawl_time": index.get("lastCrawlTime", ""),
        "google_canonical": index.get("googleCanonical", ""),
        "user_canonical": index.get("userCanonical", ""),
        "robots_state": index.get("robotsTxtState", ""),
        "mobile_usability": index.get("mobileUsabilityState", ""),
        "rich_results": (result.get("richResultsResult") or {}).get("verdict", ""),
    }
    row = models.GscUrlInspection(url=url[:1024], site_url=site,
                                  detail_json=json.dumps(data, ensure_ascii=False)[:8000],
                                  inspected_by=user, **{k: str(v or "")[:1024]
                                                        for k, v in raw.items()})
    db.add(row); db.commit()
    return {**raw, "id": row.id, "inspected_at": row.inspected_at.isoformat(),
            "note": "Google's known indexing state — not a live page test; no indexing guarantee."}


def local_sitemap_urls() -> list[str]:
    base = settings.PUBLIC_SITE_URL.rstrip("/")
    try:
        r = httpx.get(base + "/sitemap.xml", timeout=20)
        r.raise_for_status()
        root = ET.fromstring(r.content)
        ns = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
        return [e.text.strip() for e in root.iter(ns + "loc") if e.text]
    except Exception:
        return []


def sitemaps(db) -> dict:
    local = local_sitemap_urls()
    seen, dupes = set(), []
    for u in local:
        if u in seen:
            dupes.append(u)
        seen.add(u)
    for u in local:
        row = (db.query(models.GscSitemapRecord)
               .filter(models.GscSitemapRecord.sitemap_url == u).first())
        if row is None:
            db.add(models.GscSitemapRecord(sitemap_url=u[:1024], source="local"))
    db.commit()
    remote = []
    try:
        remote = (gsc_request(db, "GET", site_api_base(get_connection(db)) + "/sitemaps")
                  .get("sitemap", []) or [])
    except oauth.GscError:
        remote = []
    for item in remote:
        url = item.get("path", "")
        row = (db.query(models.GscSitemapRecord)
               .filter(models.GscSitemapRecord.sitemap_url == url).first())
        if row is None:
            row = models.GscSitemapRecord(sitemap_url=url[:1024], source="gsc")
            db.add(row)
        row.status = item.get("status", "")
        row.last_submitted = str(item.get("submitted", ""))
        row.last_downloaded = str(item.get("lastDownloaded", ""))
        row.errors = int(item.get("errors") or 0)
        row.warnings = int(item.get("warnings") or 0)
        row.detail_json = json.dumps(item, ensure_ascii=False)[:4000]
    db.commit()
    rows = db.query(models.GscSitemapRecord).all()
    return {
        "items": [{"url": r.sitemap_url, "source": r.source, "status": r.status,
                   "last_submitted": r.last_submitted, "last_downloaded": r.last_downloaded,
                   "errors": r.errors, "warnings": r.warnings} for r in rows],
        "local_url_count": len(local), "duplicate_urls": dupes,
        "note": "Local discovery reads our live sitemap.xml; GSC entries require a connection.",
    }


def submit_sitemap(db, sitemap_url: str) -> dict:
    if not settings.GOOGLE_SEARCH_CONSOLE_WRITE_ENABLED:
        raise oauth.GscError("Sitemap submission is disabled. Set GOOGLE_SEARCH_CONSOLE_WRITE_ENABLED=true and grant write scope.")
    data = gsc_request(db, "PUT", site_api_base(get_connection(db)) + "/sitemaps",
                       params={"sitemapUrl": sitemap_url})
    return {"submitted": sitemap_url, "response": data}


def _add_recommendation(db, url: str, category: str, text: str, priority: str, evidence: dict) -> int:
    existing = (db.query(models.GscRecommendation)
                .filter(models.GscRecommendation.url == url[:1024],
                        models.GscRecommendation.category == category,
                        models.GscRecommendation.status == "Pending").first())
    if existing:
        return 0
    db.add(models.GscRecommendation(url=url[:1024], category=category,
                                    recommendation=text, priority=priority,
                                    evidence_json=json.dumps(evidence, ensure_ascii=False)))
    return 1


def build_recommendations(db, start: str, end: str, prev_start: str, prev_end: str) -> dict:
    """Create recommendations only from cached real Search Console rows."""
    if not latest_run_id(db):
        return {"created": 0, "note": "No successful sync yet — no evidence to recommend from."}
    created = 0
    for r in grouped(db, "query", start, end, limit=100)["items"]:
        if r["impressions"] >= 100 and r["ctr"] < 0.02:
            created += _add_recommendation(db, r["value"], "low_ctr",
                "Review title and meta description for this query; clarify the offer and add a specific enquiry CTA.",
                "High", {"impressions": r["impressions"], "ctr": r["ctr"], "period": [start, end]})
        if 8 <= r["position"] <= 20 and r["impressions"] >= 50:
            created += _add_recommendation(db, r["value"], "position_8_20",
                "Strengthen content depth and internal links for this query; it is close to page one.",
                "Medium", {"position": r["position"], "impressions": r["impressions"]})
    for p in grouped(db, "page", start, end, limit=100)["items"]:
        prev = next((x for x in grouped(db, "page", prev_start, prev_end, limit=500)["items"]
                     if x["value"] == p["value"]), None)
        if prev and prev["clicks"] > 5 and p["clicks"] < prev["clicks"] * 0.6:
            created += _add_recommendation(db, p["value"], "declining_clicks",
                "Investigate recent content/canonical/internal-link changes for this page.",
                "High", {"clicks": p["clicks"], "previous_clicks": prev["clicks"]})
        if p["impressions"] == 0:
            created += _add_recommendation(db, p["value"], "zero_impressions",
                "Check keyword targeting and internal links; this page has no recorded impressions.",
                "Low", {"impressions": 0})
    for name, path in COUNTRY_PATHS.items():
        m = next((x for x in grouped(db, "page", start, end, limit=500)["items"]
                  if x["value"].rstrip("/").endswith(path)), None)
        if m and m["impressions"] > 0:
            created += _add_recommendation(db, f"https://www.newlookimpex.store{path}", "country_page",
                f"Add genuinely market-specific buyer information and internal links for {name}.",
                "Medium", {"impressions": m["impressions"], "clicks": m["clicks"]})
    # Indexing issues are surfaced directly from URL-inspection history in the UI.
    db.commit()
    return {"created": created, "total_pending": db.query(models.GscRecommendation)
            .filter(models.GscRecommendation.status == "Pending").count()}
