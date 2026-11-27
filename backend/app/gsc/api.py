"""Admin-only Google Search Console API routes.

All analytics come from real Google API responses cached in gsc_rows. When the
integration is not configured/connected, endpoints return an explicit setup
message — never sample or invented data.
"""
from __future__ import annotations

import hmac
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from .. import models
from ..auth import require_role
from ..config import settings
from ..database import get_db
from . import ga4, oauth, service

log = logging.getLogger("gsc.api")
router = APIRouter()

SITE_BASE = "https://www.newlookimpex.store"


def _safe_error(e: Exception) -> HTTPException:
    message = str(e)[:300] if isinstance(e, oauth.GscError) else "Search Console request failed."
    status = e.status if isinstance(e, oauth.GscError) else None
    return HTTPException(status_code=status or 502, detail=message)


def _admin_audit(db, actor: str, action: str, detail: str = "") -> None:
    db.add(models.AuditLog(actor=actor, action=action, entity="google_search_console",
                           detail=detail[:500]))
    db.commit()


def _redirect(flag: str) -> RedirectResponse:
    target = settings.PUBLIC_SITE_URL.rstrip("/") + "/admin/seo-manager?gsc=" + flag
    return RedirectResponse(url=target, status_code=303)


@router.get("/api/seo-console/status")
def status(db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    return service.connection_status(db)


@router.post("/api/seo-console/connect")
def connect(db: Session = Depends(get_db), u=Depends(require_role("admin",))):
    ok, reason = oauth.configured()
    if not ok:
        raise HTTPException(400, reason)
    state, nonce = oauth.make_state()
    row = service.ensure_connection(db)
    row.oauth_nonce = nonce
    row.status = "connecting"
    db.commit()
    _admin_audit(db, u.email, "gsc_connect_started")
    return {"auth_url": oauth.build_auth_url(state),
            "callback_url": oauth.redirect_uri(),
            "note": "Register this exact callback URL in Google Cloud Console."}


@router.post("/api/seo-console/reconnect")
def reconnect(db: Session = Depends(get_db), u=Depends(require_role("admin",))):
    # Same as connect: prompt=consent forces a fresh refresh token when needed.
    ok, reason = oauth.configured()
    if not ok:
        raise HTTPException(400, reason)
    state, nonce = oauth.make_state()
    row = service.ensure_connection(db)
    row.oauth_nonce = nonce
    row.status = "connecting"
    row.last_error = ""
    db.commit()
    _admin_audit(db, u.email, "gsc_reconnect_started")
    return {"auth_url": oauth.build_auth_url(state), "callback_url": oauth.redirect_uri()}


@router.get("/api/seo-console/oauth/start")
@router.post("/api/seo-console/oauth/start")
def oauth_start(db: Session = Depends(get_db), u=Depends(require_role("admin",))):
    """Alias for the connect step, matching the operations naming convention."""
    return connect(db, u)


@router.get("/api/seo-console/oauth/callback")
def oauth_callback(request: Request, code: str = "", state: str = "", error: str = "",
                   db: Session = Depends(get_db)):
    """Public browser redirect from Google. State is HMAC + one-use nonce validated."""
    if error or not code or not state:
        return _redirect("error")
    nonce = oauth.verify_state(state)
    if not nonce:
        return _redirect("invalid_state")
    row = service.get_connection(db)
    if not row or not row.oauth_nonce or not hmac.compare_digest(row.oauth_nonce, nonce):
        return _redirect("invalid_state")
    try:
        tokens = oauth.exchange_code(code)
        service.store_tokens(db, row, tokens, nonce=nonce)
        row.site_url = oauth.site_url()
        db.commit()
        db.add(models.AuditLog(actor="google_oauth", action="gsc_connected",
                               entity="google_search_console", detail="tokens encrypted; no secrets logged"))
        db.commit()
        return _redirect("connected")
    except oauth.GscError as e:
        log.warning("GSC OAuth exchange failed: %s", e)
        row.status = "error"; row.last_error = str(e)[:400]; db.commit()
        return _redirect("exchange_failed")
    except Exception:
        log.warning("GSC OAuth exchange failed unexpectedly")
        row.status = "error"; row.last_error = "OAuth exchange failed."; db.commit()
        return _redirect("exchange_failed")


@router.post("/api/seo-console/repair")
def repair_connection(db: Session = Depends(get_db), u=Depends(require_role("admin",))):
    """Re-verify stored tokens with a real Google call and restore a healthy
    status after a transient API error. No consent or secret handling involved."""
    row = service.get_connection(db)
    if not row or not (row.access_token_enc or row.refresh_token_enc):
        raise HTTPException(400, "No stored Google connection to repair.")
    try:
        props = service.list_properties(db)
    except oauth.GscError as e:
        raise _safe_error(e)
    row.status = "connected"; row.last_error = ""
    db.commit()
    _admin_audit(db, u.email, "gsc_repaired", f"properties={len(props)}")
    return {"ok": True, "status": "connected", "properties_count": len(props)}


@router.post("/api/seo-console/disconnect")
def disconnect(db: Session = Depends(get_db), u=Depends(require_role("admin",))):
    service.disconnect(db)
    _admin_audit(db, u.email, "gsc_disconnected")
    return {"ok": True, "status": "disconnected"}


@router.get("/api/seo-console/properties")
def properties(db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    try:
        return {"connected": True, "properties": service.list_properties(db)}
    except oauth.GscError as e:
        raise _safe_error(e)


@router.post("/api/seo-console/sync")
def sync(payload: dict, db: Session = Depends(get_db), u=Depends(require_role("admin",))):
    rng = str(payload.get("range") or "28d")
    start, end, _, _ = service.date_range(rng, str(payload.get("start") or ""),
                                          str(payload.get("end") or ""))
    try:
        result = service.sync_analytics(db, start, end)
        _admin_audit(db, u.email, "gsc_sync", f"{start}..{end} rows={result['rows_saved']}")
        return result
    except oauth.GscError as e:
        raise _safe_error(e)
    except Exception as e:
        log.warning("GSC sync failed: %s", type(e).__name__)
        raise HTTPException(502, "Search Console sync failed. Check connection, permissions and quota.")


@router.get("/api/seo-console/sync-history")
def sync_history(limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db),
                 u=Depends(require_role("admin", "editor"))):
    rows = (db.query(models.GscSyncRun).order_by(models.GscSyncRun.started_at.desc())
            .limit(limit).all())
    return {"items": [{"id": r.id, "site_url": r.site_url, "status": r.status,
                       "start": r.period_start, "end": r.period_end,
                       "rows_saved": r.rows_saved, "message": r.message,
                       "started_at": r.started_at.isoformat() if r.started_at else None,
                       "finished_at": r.finished_at.isoformat() if r.finished_at else None} for r in rows]}


@router.get("/api/seo-console/overview")
def overview(range: str = Query("28d"), start: str = "", end: str = "",
             db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    s, e, ps, pe = service.date_range(range, start, end)
    current = service.totals(db, s, e)
    previous = service.totals(db, ps, pe)
    if not current["impressions"] and not previous["impressions"]:
        current["note"] = ("No Search Console data for this period. Connect the integration "
                           "and run a sync to load real data.")
    return {"current": current, "previous": previous, "daily": service.daily(db, s, e),
            "last_sync": service.connection_status(db)["last_sync_at"],
            "comparison_period": {"start": ps, "end": pe}}


def _dimension(endpoint: str, dimension: str):
    @router.get(f"/api/seo-console/{endpoint}")
    def handler(range: str = Query("28d"), start: str = "", end: str = "",
                limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0),
                db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
        s, e, _, _ = service.date_range(range, start, end)
        return service.grouped(db, dimension, s, e, limit, offset)
    handler.__name__ = f"gsc_{endpoint}"
    return handler


for _endpoint, _dimension_name in (("queries", "query"), ("pages", "page"),
                                   ("countries", "country"), ("devices", "device"),
                                   ("appearances", "appearance")):
    _dimension(_endpoint, _dimension_name)


@router.get("/api/seo-console/daily")
def daily(range: str = Query("28d"), start: str = "", end: str = "",
          db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    s, e, _, _ = service.date_range(range, start, end)
    return {"items": service.daily(db, s, e), "period": {"start": s, "end": e}}


@router.get("/api/seo-console/country-pages")
def country_pages(range: str = Query("28d"), db: Session = Depends(get_db),
                  u=Depends(require_role("admin", "editor"))):
    s, e, _, _ = service.date_range(range)
    pages = service.grouped(db, "page", s, e, limit=500)["items"]
    items = []
    for name, path in service.COUNTRY_PATHS.items():
        hits = [p for p in pages if p["value"].rstrip("/").endswith(path)]
        m = hits[0] if hits else None
        items.append({"country": name, "url": f"{SITE_BASE}{path}",
                      "has_page": True, "clicks": m["clicks"] if m else 0,
                      "impressions": m["impressions"] if m else 0,
                      "ctr": m["ctr"] if m else 0.0,
                      "position": m["position"] if m else 0.0,
                      "top_queries": [q["value"] for q in
                                      service.grouped(db, "query", s, e, limit=500)["items"][:5]],
                      "metadata": "requires_live_check",
                      "canonical": "requires_live_check",
                      "note": ("Metrics are real cached GSC data. Metadata/canonical checks "
                               "are not asserted without a live page fetch.")})
    return {"items": items, "period": {"start": s, "end": e}}


@router.post("/api/seo-console/url-inspection/inspect")
def inspect(payload: dict, db: Session = Depends(get_db), u=Depends(require_role("admin",))):
    url = str(payload.get("url") or "").strip()
    if not url.startswith("https://"):
        raise HTTPException(400, "Provide a full https:// URL.")
    try:
        return service.inspect_url(db, url[:1024], u.email)
    except oauth.GscError as e:
        raise _safe_error(e)
    except Exception:
        raise HTTPException(502, "Google URL Inspection request failed.")


@router.get("/api/seo-console/url-inspection/history")
def inspection_history(limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db),
                       u=Depends(require_role("admin", "editor"))):
    rows = (db.query(models.GscUrlInspection)
            .order_by(models.GscUrlInspection.inspected_at.desc()).limit(limit).all())
    return {"items": [{"id": r.id, "url": r.url, "verdict": r.verdict,
                       "index_status": r.index_status, "coverage_state": r.coverage_state,
                       "last_crawl_time": r.last_crawl_time,
                       "google_canonical": r.google_canonical, "user_canonical": r.user_canonical,
                       "robots_state": r.robots_state, "inspected_at": r.inspected_at.isoformat()
                       if r.inspected_at else None} for r in rows]}


@router.get("/api/seo-console/sitemaps")
def sitemap_list(db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    try:
        return service.sitemaps(db)
    except Exception:
        raise HTTPException(502, "Sitemap inspection failed.")


@router.post("/api/seo-console/sitemaps/submit")
def sitemap_submit(payload: dict, db: Session = Depends(get_db), u=Depends(require_role("admin",))):
    url = str(payload.get("sitemap_url") or "").strip()
    if not url.startswith("https://"):
        raise HTTPException(400, "Provide a full https:// sitemap URL.")
    try:
        result = service.submit_sitemap(db, url)
        _admin_audit(db, u.email, "gsc_sitemap_submit", url[:300])
        return result
    except oauth.GscError as e:
        raise _safe_error(e)


@router.get("/api/seo-console/recommendations")
def recommendations(status: str = Query("Pending"), limit: int = Query(50, ge=1, le=200),
                    db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    q = db.query(models.GscRecommendation)
    if status and status != "all":
        q = q.filter(models.GscRecommendation.status == status)
    rows = q.order_by(models.GscRecommendation.created_at.desc()).limit(limit).all()
    return {"items": [{"id": r.id, "url": r.url, "category": r.category,
                       "recommendation": r.recommendation, "priority": r.priority,
                       "status": r.status,
                       "evidence": __import__("json").loads(r.evidence_json or "{}"),
                       "created_at": r.created_at.isoformat() if r.created_at else None}
                      for r in rows]}


@router.post("/api/seo-console/recommendations/generate")
def generate_recommendations(payload: dict, db: Session = Depends(get_db),
                             u=Depends(require_role("admin",))):
    rng = str(payload.get("range") or "28d")
    s, e, ps, pe = service.date_range(rng, str(payload.get("start") or ""),
                                      str(payload.get("end") or ""))
    return service.build_recommendations(db, s, e, ps, pe)


@router.post("/api/seo-console/recommendations/{rid}/decision")
def decide_recommendation(rid: str, payload: dict, db: Session = Depends(get_db),
                          u=Depends(require_role("admin",))):
    decision = str(payload.get("status") or "")
    if decision not in ("Approved", "Completed", "Pending"):
        raise HTTPException(400, "status must be Pending, Approved or Completed")
    row = (db.query(models.GscRecommendation)
           .filter(models.GscRecommendation.id == rid).first())
    if not row:
        raise HTTPException(404, "Recommendation not found")
    row.status = decision
    row.decided_by = u.email
    row.decided_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    _admin_audit(db, u.email, "gsc_recommendation_decision", f"{rid}:{decision}")
    return {"ok": True, "id": rid, "status": decision}


# ---------------- Google Analytics 4 (real Data API v1) ----------------

@router.get("/api/seo-console/ga4/status")
def ga4_status(db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    ok, reason = ga4.available()
    conn = service.connection_status(db)
    missing = [s for s in (oauth.ANALYTICS_SCOPE,) if s in conn["missing_scopes"]]
    return {
        "configured": ok,
        "setup_message": "" if ok else reason,
        "property_id": ga4.property_id(),
        "connected": conn["connected"],
        "missing_scopes": missing,
        "reconnect_needed": bool(conn["connected"] and missing),
        "note": ("GA4 sessions are not Search Console clicks — they are different metrics."
                 if ok else reason),
    }


@router.get("/api/seo-console/preflight")
def preflight(db: Session = Depends(get_db), u=Depends(require_role("admin",))):
    """Real connectivity diagnostics. No fabricated success: every service
    result comes from an authenticated Google API call or an exact setup error."""
    conn = service.connection_status(db)
    out = {
        "oauth": {"configured": conn["configured"], "connected": conn["connected"],
                  "setup_message": conn["setup_message"],
                  "missing_scopes": conn["missing_scopes"],
                  "callback_url": conn["callback_url"]},
        "gsc": {}, "ga4": {},
    }
    if conn["connected"]:
        try:
            props = service.list_properties(db)
            target = oauth.site_url().rstrip("/")
            out["gsc"] = {"ok": True, "properties_count": len(props),
                          "target_configured": any(str(p.get("siteUrl", "")).rstrip("/") == target
                                                   for p in props)}
        except oauth.GscError as e:
            out["gsc"] = {"ok": False, "error": str(e)}
    else:
        out["gsc"] = {"ok": False, "error": "Search Console is not connected."}
    ok, reason = ga4.available()
    if not ok:
        out["ga4"] = {"ok": False, "error": reason}
    elif not conn["connected"]:
        out["ga4"] = {"ok": False, "error": "Connect Google OAuth first."}
    else:
        try:
            s, e, _, _ = ga4.date_range("7d")
            data = ga4.overview(db, s, e)
            out["ga4"] = {"ok": True, "property_id": ga4.property_id(),
                          "sessions": data["sessions"], "source": data["source"]}
        except oauth.GscError as ex:
            out["ga4"] = {"ok": False, "error": str(ex)}
        except Exception:
            out["ga4"] = {"ok": False, "error": "GA4 runReport failed; check API enablement and permissions."}
    return out


@router.get("/api/seo-console/ga4/overview")
def ga4_overview(range: str = Query("28d"), start: str = "", end: str = "",
                 organic: bool = False, db: Session = Depends(get_db),
                 u=Depends(require_role("admin", "editor"))):
    s, e, ps, pe = ga4.date_range(range, start, end)
    try:
        current = ga4.overview(db, s, e, organic)
        previous = ga4.overview(db, ps, pe, organic)
    except oauth.GscError as ex:
        raise _safe_error(ex)
    except Exception:
        raise HTTPException(502, "GA4 runReport failed. Check API enablement and property permission.")
    return {"current": current, "previous": previous,
            "comparison_period": {"start": ps, "end": pe}}


@router.get("/api/seo-console/ga4/dimension/{name}")
def ga4_dimension(name: str, range: str = Query("28d"), start: str = "", end: str = "",
                  organic: bool = False, limit: int = Query(50, ge=1, le=200),
                  db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    s, e, _, _ = ga4.date_range(range, start, end)
    try:
        return ga4.dimension(db, name, s, e, organic, limit)
    except oauth.GscError as ex:
        raise _safe_error(ex)
    except Exception:
        raise HTTPException(502, "GA4 runReport failed. Check API enablement and property permission.")
