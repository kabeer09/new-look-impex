"""Main FastAPI app with all routers."""
from __future__ import annotations
import csv, io, json
from datetime import date, datetime, timedelta, timezone
from fastapi import Depends, FastAPI, Form, HTTPException, Query, Request, UploadFile, File
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse, RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from .config import settings
from .database import Base, engine, ensure_schema, get_db
from . import models
from .auth import current_user, hash_pw, rate_limit, require_role
from .schemas import (AuditRunIn, ContentGenIn, EnquiryPublicIn, EnquiryStatusIn, KeywordIn,
                      SearchToPageIn)
from .scoring import score_keyword, classify_intent, business_relevance, commercial_score
from .audit_engine import audit_url, fetch_and_audit
from .recommender import add_recommendation, generate_from_keyword
from .llm import llm_configured, keyword_ideas, generate
from .seed import seed, SEED_KEYWORDS
from .catalog import router as catalog_router
from .rfq import router as rfq_router
from .buyers import router as buyers_router
from .settings_api import router as settings_router
from .events_api import router as events_router
from .ai_import import router as ai_import_router
from .ai_seo import router as ai_seo_router
from .banners import router as banners_router
from .seo_pages import router as seo_pages_router
from .catalogue_api import router as catalogue_router
from . import product_scanner
from .catalogue_pdf import build_catalogue_pdf, get_business_info
from .media_store import file_path
from .email import send_email, email_configured

Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from .database import SessionLocal
    ensure_schema()  # additive migration for pre-existing databases
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
    from .watcher import start_watcher
    start_watcher()  # no-op unless INCOMING_ENABLED=true
    product_scanner.start_scanner()  # no-op unless PRODUCT_SCAN_ENABLED=true
    yield


app = FastAPI(title="New Look Impex — SEO & Enquiry Engine", version="1.0.0",
              docs_url="/api/docs", openapi_url="/api/openapi.json", lifespan=lifespan)
app.add_middleware(CORSMiddleware,
                   allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()] + ["*"],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# Commerce / CRM routers (ai_import first: its fixed paths like
# /api/products/imports must win over catalog's /api/products/{pid})
app.include_router(ai_import_router)
app.include_router(ai_seo_router)
app.include_router(banners_router)
app.include_router(seo_pages_router)
app.include_router(catalog_router)
app.include_router(rfq_router)
app.include_router(buyers_router)
app.include_router(settings_router)
app.include_router(events_router)
app.include_router(catalogue_router)


def audit(actor: str, action: str, entity: str = "", entity_id: str = "", detail: str = "", db: Session | None = None):
    try:
        if db is not None:
            db.add(models.AuditLog(actor=actor, action=action, entity=entity, entity_id=entity_id, detail=detail[:2000]))
            db.commit()
    except Exception:
        pass


@app.exception_handler(Exception)
async def _err(req: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        return JSONResponse({"error": exc.detail}, status_code=exc.status_code)
    return JSONResponse({"error": "Internal error"}, status_code=500)


# ---------- health / dashboard ----------
@app.get("/api/health")
def health():
    return {"status": "ok", "llm_configured": llm_configured(), "time": datetime.now(timezone.utc).replace(tzinfo=None).isoformat()}


@app.get("/health")
def health_alias():
    return health()


@app.get("/api/dashboard/summary")


@app.get("/api/dashboard/summary")
def dashboard(db: Session = Depends(get_db), u=Depends(current_user)):
    clicks = db.query(func.sum(models.AnalyticsDaily.clicks)).scalar() or 0
    impr = db.query(func.sum(models.AnalyticsDaily.impressions)).scalar() or 0
    ctr = round(clicks / impr, 4) if impr else 0.0
    pos = db.query(func.avg(models.AnalyticsDaily.position)).scalar()
    by_day = db.query(models.AnalyticsDaily.date, func.sum(models.AnalyticsDaily.clicks), func.sum(models.AnalyticsDaily.impressions))\
        .group_by(models.AnalyticsDaily.date).order_by(models.AnalyticsDaily.date).limit(90).all()
    top_pages = db.query(models.AnalyticsDaily.url, func.sum(models.AnalyticsDaily.clicks).label("c"))\
        .group_by(models.AnalyticsDaily.url).order_by(func.sum(models.AnalyticsDaily.clicks).desc()).limit(10).all()
    enq_total = db.query(func.count(models.Enquiry.id)).scalar() or 0
    enq_qual = db.query(func.count(models.Enquiry.id)).filter(models.Enquiry.status.in_(["qualified", "quoted", "won"])).scalar() or 0
    by_country = db.query(models.Enquiry.country, func.count(models.Enquiry.id)).group_by(models.Enquiry.country).all()
    enq_days = db.query(func.date(models.Enquiry.created_at), func.count(models.Enquiry.id)).group_by(func.date(models.Enquiry.created_at)).order_by(func.date(models.Enquiry.created_at)).limit(90).all()
    src = db.query(models.AnalyticsDaily).order_by(models.AnalyticsDaily.date.desc()).first()
    data_source = (src.source if src else "none")
    # Real commerce / CRM metrics
    prod_published = db.query(func.count(models.Product.id)).filter(
        models.Product.status == "published").scalar() or 0
    prod_draft = db.query(func.count(models.Product.id)).filter(
        models.Product.status == "draft").scalar() or 0
    prod_total = db.query(func.count(models.Product.id)).scalar() or 0
    rfq_total = db.query(func.count(models.RFQ.id)).scalar() or 0
    rfq_new = db.query(func.count(models.RFQ.id)).filter(
        models.RFQ.status == "new").scalar() or 0
    buyers_total = db.query(func.count(models.Buyer.id)).scalar() or 0
    buyers_qualified = db.query(func.count(models.Buyer.id)).filter(
        models.Buyer.lead_score >= 0.6).scalar() or 0
    pending_followups = db.query(func.count(models.Enquiry.id)).filter(
        models.Enquiry.follow_up_at != None,  # noqa: E711
        models.Enquiry.follow_up_at <= datetime.now(timezone.utc).replace(tzinfo=None),
        models.Enquiry.status.notin_(["won", "lost"])).scalar() or 0
    # Most requested products (by RFQ item frequency)
    most_requested = db.query(models.RFQItem.product_name,
                                  func.count(models.RFQItem.id).label("c")) \
        .filter(models.RFQItem.product_name != "") \
        .group_by(models.RFQItem.product_name) \
        .order_by(func.count(models.RFQItem.id).desc()).limit(5).all()
    catalogue_downloads = db.query(func.count(models.AnalyticsEvent.id)).filter(
        models.AnalyticsEvent.event_type == "catalogue_download").scalar() or 0
    rfq_adds = db.query(func.count(models.AnalyticsEvent.id)).filter(
        models.AnalyticsEvent.event_type == "rfq_add").scalar() or 0
    product_views = db.query(func.count(models.AnalyticsEvent.id)).filter(
        models.AnalyticsEvent.event_type == "product_view").scalar() or 0
    return {
        "clicks": clicks, "impressions": impr, "ctr": ctr, "avg_position": round(pos, 1) if pos else None,
        "keywords_tracked": db.query(func.count(models.TrackedKeyword.id)).scalar() or 0,
        "recommendations_pending": db.query(func.count(models.SeoRecommendation.id)).filter(models.SeoRecommendation.status.in_(["new", "pending"])).scalar() or 0,
        "pages": db.query(func.count(models.WebsitePage.id)).scalar() or 0,
        "published_changes": db.query(func.count(models.PublishingLog.id)).scalar() or 0,
        "enquiries_total": enq_total, "enquiries_qualified": enq_qual,
        "enquiries_by_country": [{"country": c or "Unknown", "count": n} for c, n in by_country],
        "top_pages": [{"url": u_, "clicks": c} for u_, c in top_pages],
        "clicks_by_day": [{"date": str(d), "clicks": c, "impressions": i} for d, c, i in by_day],
        "enquiries_by_day": [{"date": str(d), "count": n} for d, n in enq_days],
        "data_source": data_source,
        "data_note": "Sample development data" if data_source == "sample" else ("Live Google data" if data_source in ("gsc", "ga") else "No data yet — connect Google integrations"),
        "products_published": prod_published, "products_draft": prod_draft,
        "products_total": prod_total,
        "rfqs_total": rfq_total, "rfqs_new": rfq_new,
        "buyers_total": buyers_total, "buyers_qualified": buyers_qualified,
        "pending_followups": pending_followups,
        "most_requested_products": [{"name": n, "count": c} for n, c in most_requested],
        "catalogue_downloads": catalogue_downloads,
        "rfq_adds": rfq_adds, "product_views": product_views,
    }


# ---------- user management (admin) ----------
@app.get("/api/users")
def list_users(db: Session = Depends(get_db), u=Depends(require_role("admin"))):
    rows = db.query(models.User).order_by(models.User.id).all()
    return {"items": [{"id": x.id, "email": x.email, "role": x.role,
                       "is_active": x.is_active,
                       "auth_provider": x.auth_provider or "local",
                       "display_name": x.display_name or "",
                       "created_at": x.created_at.isoformat() if x.created_at else None}
                      for x in rows]}


@app.put("/api/users/{uid}/role")
def set_user_role(uid: int, payload: dict, db: Session = Depends(get_db),
                  u=Depends(require_role("admin"))):
    target = db.query(models.User).filter(models.User.id == uid).first()
    if not target:
        raise HTTPException(404, "User not found")
    role = str(payload.get("role", "")).strip()
    if role not in ("admin", "editor", "viewer"):
        raise HTTPException(400, "Role must be admin, editor or viewer.")
    if target.id == u.id and role != u.role:
        raise HTTPException(400, "Admins cannot change their own role.")
    target.role = role
    if "is_active" in payload:
        if target.id == u.id and not payload["is_active"]:
            raise HTTPException(400, "Admins cannot deactivate themselves.")
        target.is_active = bool(payload["is_active"])
    db.commit()
    audit(u.email, "user.role", "user", str(uid), f"role={role}", db=db)
    return {"id": uid, "role": target.role, "is_active": target.is_active}


# ---------- keywords ----------
def _kw_out(k: models.TrackedKeyword) -> dict:
    return {"id": k.id, "keyword": k.keyword, "country": k.country, "language": k.language,
            "product_category": k.product_category, "intent": k.intent, "source": k.source,
            "status": k.status, "priority": k.priority, "target_url": k.target_url,
            "impressions": k.impressions, "clicks": k.clicks, "ctr": k.ctr, "position": k.position,
            "opportunity_score": k.opportunity_score, "opportunity_factors": json.loads(k.opportunity_factors or "{}"),
            "business_relevance": k.business_relevance, "commercial_intent": k.commercial_intent,
            "cluster": k.cluster, "related_keywords": json.loads(k.related_keywords or "[]")}


@app.get("/api/keywords")
def list_kw(db: Session = Depends(get_db), u=Depends(current_user),
            q: str = "", country: str = "", intent: str = "", product: str = "",
            page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)):
    qry = db.query(models.TrackedKeyword)
    if q: qry = qry.filter(models.TrackedKeyword.keyword.contains(q))
    if country: qry = qry.filter(models.TrackedKeyword.country == country)
    if intent: qry = qry.filter(models.TrackedKeyword.intent == intent)
    if product: qry = qry.filter(models.TrackedKeyword.product_category.contains(product))
    total = qry.count()
    rows = qry.order_by(models.TrackedKeyword.opportunity_score.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "page": page, "page_size": page_size, "items": [_kw_out(k) for k in rows]}


@app.post("/api/keywords", status_code=201)
def create_kw(body: KeywordIn, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    rate_limit(f"kw:{u.email}", 60, 60)
    kw = body.keyword.strip()
    country = body.country.strip()
    if db.query(models.TrackedKeyword).filter(func.lower(models.TrackedKeyword.keyword) == kw.lower(),
                                              models.TrackedKeyword.country == country).first():
        raise HTTPException(409, "Keyword already tracked for this country (deduplicated).")
    has_page = bool(db.query(models.WebsitePage).filter(models.WebsitePage.url == body.target_url).first()) if body.target_url else False
    s = score_keyword(keyword=kw, intent=body.intent, country=country, impressions=body.impressions,
                      clicks=body.clicks, ctr=body.ctr, position=body.position, has_page=has_page)
    k = models.TrackedKeyword(keyword=kw, country=country, language=body.language,
                              product_category=body.product_category, intent=s["intent"], source=body.source,
                              target_url=body.target_url, impressions=body.impressions, clicks=body.clicks,
                              ctr=body.ctr, position=body.position, business_relevance=s["business_relevance"],
                              commercial_intent=s["commercial_intent"], opportunity_score=s["score"],
                              opportunity_factors=json.dumps({"factors": s["factors"], "explanation": s["explanation"]}),
                              last_analysed_at=datetime.now(timezone.utc).replace(tzinfo=None))
    db.add(k); db.commit(); db.refresh(k)
    generate_from_keyword(db, k)
    audit(u.email, "keyword.create", "keyword", str(k.id), kw, db=db)
    return _kw_out(k)


@app.post("/api/keywords/import", status_code=201)
def import_kw(payload: dict, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    """Accepts {csv: 'keyword,country,...'} — dedupes, scores each."""
    csv_text = payload.get("csv", "")
    if not csv_text.strip():
        raise HTTPException(400, "Provide {csv: ...} content.")
    reader = csv.DictReader(io.StringIO(csv_text))
    created, skipped = 0, 0
    for row in reader:
        kw = (row.get("keyword") or row.get("Keyword") or "").strip()
        if not kw: continue
        country = (row.get("country") or "").strip()
        if db.query(models.TrackedKeyword).filter(func.lower(models.TrackedKeyword.keyword) == kw.lower(),
                                                  models.TrackedKeyword.country == country).first():
            skipped += 1; continue
        s = score_keyword(keyword=kw, country=country)
        db.add(models.TrackedKeyword(keyword=kw, country=country, intent=s["intent"], source="csv",
                                     product_category=(row.get("product_category") or ""),
                                     target_url=(row.get("target_url") or ""),
                                     business_relevance=s["business_relevance"],
                                     commercial_intent=s["commercial_intent"], opportunity_score=s["score"],
                                     opportunity_factors=json.dumps({"factors": s["factors"], "explanation": s["explanation"]}),
                                     last_analysed_at=datetime.now(timezone.utc).replace(tzinfo=None)))
        created += 1
    db.commit()
    audit(u.email, "keyword.import", "keyword", "", f"created={created} skipped={skipped}", db=db)
    return {"created": created, "skipped_duplicates": skipped}


@app.post("/api/keywords/discover")
def discover(payload: dict, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    seed_kw = (payload.get("seed") or "").strip()
    country = (payload.get("country") or "").strip()
    if not seed_kw:
        # seed defaults on first run
        if db.query(models.TrackedKeyword).count() == 0:
            for kw, c, cat in SEED_KEYWORDS:
                s = score_keyword(keyword=kw, country=c)
                db.add(models.TrackedKeyword(keyword=kw, country=c, product_category=cat, intent=s["intent"],
                                             source="seed", business_relevance=s["business_relevance"],
                                             commercial_intent=s["commercial_intent"], opportunity_score=s["score"],
                                             opportunity_factors=json.dumps({"factors": s["factors"], "explanation": s["explanation"]}),
                                             last_analysed_at=datetime.now(timezone.utc).replace(tzinfo=None)))
            db.commit()
            return {"seeded": len(SEED_KEYWORDS), "source": "seed list (not verified search-volume findings)"}
        raise HTTPException(400, "Provide {seed: '...'} or first-run seeding done.")
    ideas = keyword_ideas(seed_kw, country)
    saved = 0
    for idea in ideas["ideas"]:
        if db.query(models.TrackedKeyword).filter(func.lower(models.TrackedKeyword.keyword) == idea.lower(),
                                                  models.TrackedKeyword.country == country).first():
            continue
        s = score_keyword(keyword=idea, country=country)
        db.add(models.TrackedKeyword(keyword=idea, country=country, intent=s["intent"], source="ai" if ideas["source"] == "ai" else "rule-based",
                                     related_keywords=json.dumps([seed_kw]),
                                     business_relevance=s["business_relevance"], commercial_intent=s["commercial_intent"],
                                     opportunity_score=s["score"],
                                     opportunity_factors=json.dumps({"factors": s["factors"], "explanation": s["explanation"]}),
                                     last_analysed_at=datetime.now(timezone.utc).replace(tzinfo=None)))
        saved += 1
    db.commit()
    return {"ideas": ideas["ideas"], "idea_source": ideas["source"], "saved_new": saved}


@app.get("/api/keywords/{kid}")
def get_kw(kid: int, db: Session = Depends(get_db), u=Depends(current_user)):
    k = db.query(models.TrackedKeyword).filter(models.TrackedKeyword.id == kid).first()
    if not k: raise HTTPException(404, "Not found")
    return _kw_out(k)


@app.delete("/api/keywords/{kid}")
def del_kw(kid: int, db: Session = Depends(get_db), u=Depends(require_role("admin",))):
    k = db.query(models.TrackedKeyword).filter(models.TrackedKeyword.id == kid).first()
    if not k: raise HTTPException(404, "Not found")
    db.delete(k); db.commit()
    return {"deleted": kid}


# ---------- SEO audits / recommendations ----------
@app.get("/api/seo/audits")
def list_audits(db: Session = Depends(get_db), u=Depends(current_user), page: int = 1, page_size: int = 20):
    q = db.query(models.SeoAudit).order_by(models.SeoAudit.id.desc())
    total = q.count()
    return {"total": total, "items": [{"id": a.id, "url": a.url, "score": a.score,
                                       "issues": json.loads(a.issues_json or "[]"),
                                       "created_at": a.created_at.isoformat()} for a in q.offset((page-1)*page_size).limit(page_size)]}


@app.post("/api/seo/audits/run", status_code=201)
def run_audit(body: AuditRunIn, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    rate_limit(f"audit:{u.email}", 20, 300)
    res = fetch_and_audit(body.url)
    a = models.SeoAudit(url=body.url, checks_json=json.dumps(res["checks"])[:8000],
                        issues_json=json.dumps(res["issues"])[:8000], score=res["score"])
    db.add(a); db.commit(); db.refresh(a)
    # auto recommendations for high/medium issues (deduped)
    for iss in res["issues"]:
        if iss["severity"] in ("high", "medium"):
            add_recommendation(db, kind=f"audit:{iss['check']}", url=body.url, target_keyword="",
                title=f"Fix {iss['check']} on {body.url}",
                explanation=iss["message"], evidence=f"Audit #{a.id} found: {iss['message']}",
                benefit="Resolving technical issues helps crawling, rendering and user trust.",
                confidence="high" if iss["severity"] == "high" else "medium",
                priority="high" if iss["severity"] == "high" else "medium", effort="low",
                proposed={"action": "fix", "check": iss["check"], "url": body.url},
                risks="Low risk content/metadata fix; requires approval before publishing.",
                result_plan="Re-crawl the URL after publish and confirm the check passes.")
    audit(u.email, "audit.run", "audit", str(a.id), body.url, db=db)
    return {"id": a.id, "url": a.url, "score": a.score, "issues": res["issues"], "checks": res["checks"]}


def _rec_out(r: models.SeoRecommendation) -> dict:
    return {"id": r.id, "title": r.title, "explanation": r.explanation, "evidence": r.evidence,
            "url": r.url, "target_keyword": r.target_keyword, "expected_benefit": r.expected_benefit,
            "confidence": r.confidence, "priority": r.priority, "effort": r.effort,
            "proposed_change": json.loads(r.proposed_change or "{}"), "risks": r.risks,
            "requires_approval": r.requires_approval, "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None}


@app.get("/api/seo/recommendations")
def list_rec(db: Session = Depends(get_db), u=Depends(current_user), status: str = "", page: int = 1, page_size: int = 20):
    q = db.query(models.SeoRecommendation).order_by(models.SeoRecommendation.id.desc())
    if status: q = q.filter(models.SeoRecommendation.status == status)
    total = q.count()
    return {"total": total, "items": [_rec_out(r) for r in q.offset((page-1)*page_size).limit(page_size)]}


def _transition(db, rid, u, to: str, allowed: list[str]):
    r = db.query(models.SeoRecommendation).filter(models.SeoRecommendation.id == rid).first()
    if not r: raise HTTPException(404, "Not found")
    if r.status not in allowed:
        raise HTTPException(409, f"Cannot move from {r.status} to {to}")
    r.status = to; r.decided_at = datetime.now(timezone.utc).replace(tzinfo=None); r.decided_by = u.email
    db.commit(); db.refresh(r)
    audit(u.email, f"rec.{to}", "recommendation", str(rid), r.title, db=db)
    return _rec_out(r)


@app.post("/api/seo/recommendations/{rid}/approve")
def approve(rid: int, db: Session = Depends(get_db), u=Depends(require_role("admin",))):
    return _transition(db, rid, u, "approved", ["new", "pending"])


@app.post("/api/seo/recommendations/{rid}/reject")
def reject(rid: int, db: Session = Depends(get_db), u=Depends(require_role("admin",))):
    return _transition(db, rid, u, "rejected", ["new", "pending", "approved"])


@app.post("/api/seo/recommendations/{rid}/publish")
def publish(rid: int, db: Session = Depends(get_db), u=Depends(require_role("admin",))):
    r = db.query(models.SeoRecommendation).filter(models.SeoRecommendation.id == rid).first()
    if not r: raise HTTPException(404, "Not found")
    if r.status != "approved": raise HTTPException(409, "Only approved recommendations can be published.")
    if r.requires_approval and r.decided_by != u.email:
        pass  # approval already recorded; publisher must still be admin (enforced by role)
    try:
        proposed = json.loads(r.proposed_change or "{}")
    except Exception:
        proposed = {}
    # Controlled publishing: record version + log; apply to WebsitePage where in scope
    action = proposed.get("action", "publish")
    detail = f"Applied {action} for {r.url or r.target_keyword}"
    if r.url:
        page = db.query(models.WebsitePage).filter(models.WebsitePage.url == r.url).first()
        if page and action == "optimise_page":
            db.add(models.ContentVersion(url=page.url, field_name="title", old_value=page.title,
                                         new_value=page.title, recommendation_id=r.id, approved_by=u.email))
        elif not page and action == "draft_page":
            pass  # new pages stay as drafts until Content Studio approval — log only
    r.status = "published"
    db.add(models.PublishingLog(recommendation_id=r.id, url=r.url, action=action, result="success", detail=detail))
    db.commit(); db.refresh(r)
    audit(u.email, "rec.publish", "recommendation", str(rid), detail, db=db)
    return _rec_out(r)


@app.post("/api/seo/recommendations/{rid}/rollback")
def rollback(rid: int, db: Session = Depends(get_db), u=Depends(require_role("admin",))):
    r = db.query(models.SeoRecommendation).filter(models.SeoRecommendation.id == rid).first()
    if not r: raise HTTPException(404, "Not found")
    vers = db.query(models.ContentVersion).filter(models.ContentVersion.recommendation_id == rid).order_by(models.ContentVersion.id.desc()).all()
    restored = 0
    for v in vers:
        page = db.query(models.WebsitePage).filter(models.WebsitePage.url == v.url).first()
        if page and hasattr(page, v.field_name):
            setattr(page, v.field_name, v.old_value); restored += 1
    r.status = "completed"
    db.add(models.PublishingLog(recommendation_id=rid, url=r.url, action="rollback", result="success",
                                detail=f"Restored {restored} field(s) to previous version."))
    db.commit()
    return {"rolled_back": rid, "fields_restored": restored}


# ---------- search-to-page ----------
@app.post("/api/seo/search-to-page")
def search_to_page(body: SearchToPageIn, db: Session = Depends(get_db), u=Depends(current_user)):
    kw = body.keyword.strip()
    pages = db.query(models.WebsitePage).all()
    terms = [t for t in kw.lower().split() if len(t) > 2]
    scored = []
    for p in pages:
        blob = f"{p.title} {p.h1} {p.url}".lower()
        overlap = sum(1 for t in terms if t in blob)
        scored.append((overlap, p))
    scored.sort(key=lambda x: -x[0])
    best = scored[0][1] if scored and scored[0][0] > 0 else None
    s = score_keyword(keyword=kw, country=body.country, has_page=bool(best))
    slug = "-".join([w for w in kw.lower().replace(" décor", " decor").split() if w.isalnum() or True])[:70]
    import re
    slug = re.sub(r"[^a-z0-9]+", "-", kw.lower()).strip("-")[:70]
    intent = s["intent"]
    title = f"{kw.title()} | Wholesale Supplier India — New Look Impex"
    meta = f"Wholesale {kw.lower()} from Moradabad, India. Bulk supply for retailers, importers & corporate gifting. Enquire for export quote."
    outline = ["Buyer-oriented intro (who it's for)", "Product range & specifications",
               "Customisation & bulk ordering", f"Serving {body.country or 'target markets'} — shipping/import notes (only if verified)",
               "FAQs from genuine buyer questions", "Wholesale enquiry CTA"]
    return {
        "keyword": kw, "intent": intent, "opportunity": s,
        "page_exists": bool(best),
        "best_page": {"url": best.url, "title": best.title} if best else None,
        "new_page_justified": (not best) and (s["score"] >= 45),
        "suggested_slug": f"/{slug}" if not best else None,
        "seo_title": title[:65], "meta_description": meta[:160],
        "h1": kw.title(), "h2_sections": outline,
        "products_to_include": ["Brass urlis", "Copper urlis", "Brass diyas", "Brass lanterns", "Decorative bowls"],
        "internal_links": [p.url for _, p in scored[:5]],
        "image_alt_suggestions": [f"Handcrafted {kw.lower()} — bulk wholesale", "Moradabad metal handicraft detail"],
        "structured_data": ["Product", "FAQPage", "Organization", "BreadcrumbList"],
        "cta": "Request wholesale quote — newlookimpex@gmail.com | +91 8218251238",
        "evidence": s["explanation"], "assumptions": "Estimates where metrics unavailable; no ranking guarantee.",
        "next_steps": "Improve best page first" if best else "Draft page in Content Studio, require approval before publishing",
    }


# ---------- content studio ----------
@app.post("/api/content/generate")
def content_gen(body: ContentGenIn, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    prompt = (f"Write a {body.kind} for '{body.product or body.keyword}' targeting wholesale buyers in {body.country or 'target markets'}. "
              "Business: New Look Impex, Moradabad, India — copper & brass handicrafts. No invented certifications, capacities, testimonials, or MOQs. "
              "Return: meta title (<=60ch), meta description (<=155ch), H1, 4 H2s, 150-word draft, 3 FAQs, 2 alt texts.")
    res = generate(prompt)
    if res.get("text"):
        draft_text, src = res["text"][:4000], f"ai:{settings.LLM_MODEL}"
    else:
        draft_text = (f"H1: {body.product or body.keyword}\n\nWholesale {(body.product or body.keyword).lower()} handcrafted in Moradabad, India. "
                      "Suitable for home décor retailers, gift shops, importers and corporate gifting buyers. "
                      "Contact New Look Impex for bulk requirements and export enquiries.\n\n[Rule-based draft — no AI configured. Edit before use. No fabricated claims included.]")
        src = "rule-based (no LLM configured)"
    d = models.ContentDraft(kind=body.kind, target_url=body.target_url, target_keyword=body.keyword,
                            title=(body.product or body.keyword)[:200], body=draft_text,
                            meta_title=f"{(body.product or body.keyword).title()} Wholesale — New Look Impex"[:60],
                            meta_description=f"Wholesale {(body.product or body.keyword).lower()} from Moradabad, India for retailers & importers."[:155],
                            status="draft")
    db.add(d); db.commit(); db.refresh(d)
    return {"id": d.id, "source": src, "draft": draft_text, "meta_title": d.meta_title, "meta_description": d.meta_description}


@app.get("/api/content/drafts")
def drafts(db: Session = Depends(get_db), u=Depends(current_user)):
    return [{"id": d.id, "kind": d.kind, "title": d.title, "status": d.status,
             "target_keyword": d.target_keyword, "created_at": d.created_at.isoformat()} for d in
            db.query(models.ContentDraft).order_by(models.ContentDraft.id.desc()).limit(50)]


@app.get("/api/seo/performance")
def performance(db: Session = Depends(get_db), u=Depends(current_user), days: int = 28):
    since = date.today() - timedelta(days=days)
    rows = db.query(models.AnalyticsDaily).filter(models.AnalyticsDaily.date >= since).order_by(models.AnalyticsDaily.date).all()
    return {"days": days, "rows": [{"date": str(r.date), "source": r.source, "url": r.url, "query": r.query,
                                    "clicks": r.clicks, "impressions": r.impressions, "ctr": r.ctr,
                                    "position": r.position} for r in rows],
            "note": "Rows labelled by source. 'sample' = development placeholder, not real Google data."}


# ---------- integrations (GSC/GA stubs with OAuth URL builder + sync endpoint) ----------
@app.get("/api/integrations/status")
def integ_status(db: Session = Depends(get_db), u=Depends(current_user)):
    rows = db.query(models.Integration).all()
    return {r.provider: {"status": r.status, "property": r.property_id,
                         "configured": bool(settings.GOOGLE_CLIENT_ID)} for r in rows}


@app.post("/api/integrations/google/search-console/connect")
def gsc_connect(db: Session = Depends(get_db), u=Depends(require_role("admin",))):
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(400, "Google OAuth not configured. See docs/google-setup.md.")
    from urllib.parse import urlencode
    params = urlencode({"client_id": settings.GOOGLE_CLIENT_ID, "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                        "response_type": "code", "scope": "https://www.googleapis.com/auth/webmasters.readonly",
                        "access_type": "offline", "prompt": "consent", "state": "gsc"})
    row = db.query(models.Integration).filter(models.Integration.provider == "google_search_console").first()
    if not row:
        db.add(models.Integration(provider="google_search_console", status="disconnected")); db.commit()
    return {"auth_url": "https://accounts.google.com/o/oauth2/v2/auth?" + params,
            "guide": "docs/google-setup.md"}


@app.get("/api/integrations/google/callback")
def gsc_callback(code: str = "", state: str = "", db: Session = Depends(get_db)):
    # Exchange happens server-side when secrets configured; without secrets, record attempt.
    row = db.query(models.Integration).filter(models.Integration.provider == "google_search_console").first()
    if not row:
        row = models.Integration(provider="google_search_console"); db.add(row)
    if not settings.GOOGLE_CLIENT_SECRET or not code:
        row.status = "error"; row.meta_json = json.dumps({"note": "OAuth code/secret missing"})
        db.commit()
        return {"status": "error", "detail": "Missing code or client secret."}
    import httpx as hx
    try:
        r = hx.post("https://oauth2.googleapis.com/token", data={
            "code": code, "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET, "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code"}, timeout=30)
        r.raise_for_status()
        tok = r.json()
        row.access_token = tok.get("access_token", "")[:2000]
        row.refresh_token = tok.get("refresh_token", row.refresh_token)[:2000]
        row.status = "connected"; db.commit()
        return {"status": "connected"}
    except Exception as e:
        row.status = "error"; db.commit()
        return JSONResponse({"status": "error", "detail": str(e)[:300]}, status_code=502)


@app.get("/api/integrations/google/search-console/properties")
def gsc_props(db: Session = Depends(get_db), u=Depends(current_user)):
    row = db.query(models.Integration).filter(models.Integration.provider == "google_search_console").first()
    if not row or row.status != "connected":
        return {"connected": False, "properties": [], "note": "Not connected. Use connect endpoint + guide."}
    import httpx as hx
    try:
        r = hx.get("https://www.googleapis.com/webmasters/v3/sites",
                   headers={"Authorization": f"Bearer {row.access_token}"}, timeout=30)
        r.raise_for_status()
        return {"connected": True, "properties": r.json().get("siteEntry", [])}
    except Exception as e:
        return JSONResponse({"connected": True, "error": str(e)[:300]}, status_code=502)


@app.post("/api/integrations/google/search-console/sync")
def gsc_sync(payload: dict, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    """Sync GSC search analytics into analytics_daily. Gracefully handles missing perms/quotas."""
    row = db.query(models.Integration).filter(models.Integration.provider == "google_search_console").first()
    if not row or row.status != "connected":
        raise HTTPException(400, "Search Console not connected.")
    site = payload.get("site_url") or row.property_id
    days = min(int(payload.get("days", 28)), 90)
    if not site: raise HTTPException(400, "Provide site_url.")
    import httpx as hx
    end, start = date.today() - timedelta(days=3), date.today() - timedelta(days=3 + days)
    try:
        r = hx.post(f"https://www.googleapis.com/webmasters/v3/sites/{site}/searchAnalytics/query",
                    headers={"Authorization": f"Bearer {row.access_token}"}, timeout=60,
                    json={"startDate": str(start), "endDate": str(end), "dimensions": ["query", "page", "date"],
                          "rowLimit": 5000})
        r.raise_for_status()
        saved = 0
        for line in r.json().get("rows", []):
            keys = line.get("keys", ["", "", str(end)])
            d = date.fromisoformat(keys[2]) if len(keys) > 2 else end
            rec = db.query(models.AnalyticsDaily).filter(
                models.AnalyticsDaily.date == d, models.AnalyticsDaily.source == "gsc",
                models.AnalyticsDaily.url == (keys[1] if len(keys) > 1 else ""),
                models.AnalyticsDaily.query == keys[0]).first()
            vals = dict(date=d, source="gsc", url=(keys[1] if len(keys) > 1 else "")[:1000],
                        query=keys[0][:500], clicks=int(line.get("clicks", 0)),
                        impressions=int(line.get("impressions", 0)), ctr=float(line.get("ctr", 0)),
                        position=float(line.get("position", 0)))
            if rec:
                for k_, v_ in vals.items(): setattr(rec, k_, v_)
            else:
                db.add(models.AnalyticsDaily(**vals))
            saved += 1
        row.property_id = site
        db.add(models.WorkflowExecution(workflow="gsc_sync", status="success", detail=f"saved={saved}"))
        db.commit()
        return {"saved_rows": saved, "start": str(start), "end": str(end)}
    except Exception as e:
        db.add(models.WorkflowExecution(workflow="gsc_sync", status="failed", detail=str(e)[:1000])); db.commit()
        raise HTTPException(502, f"GSC sync failed (quota/permission/network?): {str(e)[:250]}")


# ---------- sitemap / robots ----------
@app.get("/sitemap.xml", response_class=PlainTextResponse)
def sitemap(db: Session = Depends(get_db)):
    base = settings.PUBLIC_SITE_URL.rstrip("/")
    urls = [p.url for p in db.query(models.WebsitePage).limit(500)]
    # published products & category/collection pages
    for p in db.query(models.Product).filter(models.Product.status == "published").limit(2000).all():
        urls.append(f"{base}/products/{p.slug}")
    for c in db.query(models.Category).filter(models.Category.status == "published").limit(500).all():
        urls.append(f"{base}/categories/{c.slug}")
    for col in db.query(models.Collection).filter(models.Collection.status == "published").limit(500).all():
        urls.append(f"{base}/collections/{col.slug}")
    # static public pages
    urls += [
        f"{base}/", f"{base}/shop", f"{base}/categories",
        f"{base}/wholesale", f"{base}/customisation", f"{base}/about",
        f"{base}/catalogue", f"{base}/request-quote", f"{base}/contact",
        f"{base}/bulk-orders", f"{base}/export", f"{base}/custom-orders",
        f"{base}/buyer-resources", f"{base}/shipping-export",
        f"{base}/privacy", f"{base}/terms", f"{base}/sitemap",
    ]
    # country buyer pages (curated, unique content each — see wholesale/[country])
    for slug in ("usa", "uk", "uae", "australia", "canada", "europe"):
        urls.append(f"{base}/wholesale/{slug}")
    # top-level regional landing pages (canonical short URLs)
    for slug in ("au", "uae", "uk", "usa", "canada", "europe"):
        urls.append(f"{base}/{slug}")
    items = "".join(f"<url><loc>{u_}</loc></url>" for u_ in urls)
    return f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{items}</urlset>'


@app.get("/robots.txt", response_class=PlainTextResponse)
def robots():
    return f"User-agent: *\nAllow: /\nSitemap: {settings.API_BASE_URL}/sitemap.xml\n"


# ---------- product catalogue PDF ----------
@app.get("/api/public/catalogue.pdf")
def public_catalogue(category: str = "", collection: str = "",
                       product_ids: str = "",
                       db: Session = Depends(get_db)):
    pids = None
    if product_ids:
        try:
            pids = [int(x) for x in product_ids.split(",") if x.strip().isdigit()]
        except ValueError:
            pids = None
    cat_id = None
    if category:
        from .text import slugify as _slugify
        cat = db.query(models.Category).filter(
            models.Category.slug == _slugify(category),
            models.Category.status == "published").first()
        if cat:
            cat_id = cat.id
    col_id = None
    if collection:
        from .text import slugify as _slugify
        col = db.query(models.Collection).filter(
            models.Collection.slug == _slugify(collection),
            models.Collection.status == "published").first()
        if col:
            col_id = col.id
    pdf = build_catalogue_pdf(product_ids=pids, category_id=cat_id,
                                  collection_id=col_id,
                                  business_info=get_business_info(db))
    # record download event (aggregate, privacy-conscious — no personal data)
    db.add(models.AnalyticsEvent(event_type="catalogue_download",
                                     url=category or collection or "all"))
    db.commit()
    from fastapi.responses import Response
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=new-look-impex-catalogue.pdf"})


@app.get("/api/public/catalogue/meta")
def catalogue_meta(db: Session = Depends(get_db)):
    count = db.query(func.count(models.Product.id)).filter(
        models.Product.status == "published").scalar() or 0
    return {"product_count": count, "generated_at":
            datetime.now(timezone.utc).replace(tzinfo=None).isoformat(),
            "includes": ["published products only",
                         "pricing on request when prices are not public"]}


# ---------- media library ----------
@app.get("/api/media")
def media_list(page: int = Query(1, ge=1),
               page_size: int = Query(30, ge=1, le=100),
               db: Session = Depends(get_db), u=Depends(current_user)):
    from .media_store import public_url
    q = db.query(models.MediaFile)
    total = q.count()
    rows = q.order_by(models.MediaFile.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "page": page, "page_size": page_size,
            "items": [{"id": m.id, "filename": m.filename,
                       "original_name": m.original_name,
                       "url": public_url(m.filename),
                       "content_type": m.content_type, "size": m.size,
                       "alt_text": m.alt_text or "", "source": m.source or "",
                       "permission": m.permission or "",
                       "has_thumb": bool(m.has_thumb),
                       "uploaded_at": m.uploaded_at.isoformat() if m.uploaded_at else None}
                      for m in rows]}


@app.post("/api/media", status_code=201)
async def media_upload(files: list[UploadFile] = File(...),
                       rights_source: str = Form(""),
                       permission: str = Form(""),
                       alt_text: str = Form(""),
                       db: Session = Depends(get_db),
                       u=Depends(require_role("admin", "editor"))):
    from .media_store import save_file, public_url, validate_rights
    try:
        rights = validate_rights(rights_source) if rights_source else ""
    except ValueError as e:
        raise HTTPException(400, str(e))
    saved = []
    for f in files:
        content = await f.read()
        try:
            meta = save_file(f.filename or "file", content, f.content_type or "")
        except ValueError as e:
            raise HTTPException(400, str(e))
        m = models.MediaFile(filename=meta["filename"],
                             original_name=meta.get("original_name", "")[:255],
                             content_type=meta.get("content_type", ""),
                             size=meta.get("size", 0),
                             has_thumb=meta.get("has_thumb", False),
                             alt_text=(alt_text or "")[:512],
                             source=rights,
                             permission=(permission or "")[:512])
        db.add(m)
        db.commit(); db.refresh(m)
        saved.append({"id": m.id, "filename": meta["filename"],
                      "url": public_url(meta["filename"]),
                      "size": meta["size"]})
    return {"files": saved}


@app.put("/api/media/{mid}")
def media_update(mid: int, payload: dict, db: Session = Depends(get_db),
                 u=Depends(require_role("admin", "editor"))):
    from .media_store import validate_rights
    m = db.query(models.MediaFile).filter(models.MediaFile.id == mid).first()
    if not m:
        raise HTTPException(404, "File not found")
    if "alt_text" in payload:
        m.alt_text = str(payload["alt_text"] or "")[:512]
    if "permission" in payload:
        m.permission = str(payload["permission"] or "")[:512]
    if "rights_source" in payload and payload["rights_source"]:
        try:
            m.source = validate_rights(str(payload["rights_source"]))
        except ValueError as e:
            raise HTTPException(400, str(e))
    db.commit()
    return {"id": m.id, "alt_text": m.alt_text, "source": m.source,
            "permission": m.permission}


@app.delete("/api/media/{mid}")
def media_delete(mid: int, db: Session = Depends(get_db),
                 u=Depends(require_role("admin", "editor"))):
    m = db.query(models.MediaFile).filter(models.MediaFile.id == mid).first()
    if not m:
        raise HTTPException(404, "File not found")
    # don't delete if still used by a product image
    if db.query(models.ProductImage).filter(
            models.ProductImage.url.contains(m.filename)).first():
        raise HTTPException(409, "File is used by a product image.")
    db.delete(m); db.commit()
    from .media_store import delete_file as _del
    _del(m.filename)
    return {"deleted": mid}


@app.get("/api/media/files/{filename}")
def media_serve(filename: str, variant: str = ""):
    from fastapi.responses import Response
    from .media_store import read_file, using_s3
    from fastapi.responses import RedirectResponse
    if variant not in ("", "thumb", "webp"):
        raise HTTPException(400, "variant must be thumb or webp.")
    if using_s3():
        # S3 files are addressed by key; redirect variants to their keys.
        from .media_store import public_url, _thumb_name, _webp_name
        if settings.S3_PUBLIC_URL.strip():
            if variant == "webp":
                key = _webp_name(filename)
            elif variant == "thumb":
                key = _thumb_name(filename)
            else:
                key = filename
            return RedirectResponse(settings.S3_PUBLIC_URL.rstrip("/") + "/" + key)
    content, ctype = read_file(filename, variant)
    if content is None:
        # Fall back to the original when a derivative is missing (older uploads).
        if variant in ("thumb", "webp"):
            content, ctype = read_file(filename)
        if content is None:
            raise HTTPException(404, "File not found")
    return Response(content=content, media_type=ctype or "application/octet-stream")


@app.put("/api/products/images/{iid}")
def update_product_image(iid: int, payload: dict, db: Session = Depends(get_db),
                         u=Depends(require_role("admin", "editor"))):
    from .media_store import validate_rights
    img = db.query(models.ProductImage).filter(models.ProductImage.id == iid).first()
    if not img:
        raise HTTPException(404, "Image not found")
    if "alt_text" in payload:
        img.alt_text = str(payload["alt_text"] or "")[:512]
    if "permission" in payload:
        img.permission = str(payload["permission"] or "")[:512]
    if "rights_source" in payload and payload["rights_source"]:
        try:
            img.source = validate_rights(str(payload["rights_source"]))
        except ValueError as e:
            raise HTTPException(400, str(e))
    if "is_primary" in payload and payload["is_primary"]:
        db.query(models.ProductImage).filter(
            models.ProductImage.product_id == img.product_id).update(
            {models.ProductImage.is_primary: False})
        img.is_primary = True
    db.commit()
    return {"id": img.id, "alt_text": img.alt_text, "source": img.source,
            "permission": img.permission, "is_primary": img.is_primary,
            "is_concept": img.is_concept}


# ---------- enquiries / CRM ----------
def _score_enquiry(e: EnquiryPublicIn) -> float:
    s = 0.4
    if e.company.strip(): s += 0.2
    if e.quantity.strip(): s += 0.15
    if len(e.message or "") > 80: s += 0.1
    if (e.country or "").strip().lower() in ("australia", "united states", "united kingdom", "united arab emirates", "canada", "india", "usa", "uk", "uae"):
        s += 0.1
    if e.product_interest.strip(): s += 0.05
    return round(min(s, 1.0), 2)


def _next_enquiry_reference(db: Session) -> str:
    """Unique, buyer-facing enquiry reference (NLI-YYYY-####)."""
    year = datetime.now(timezone.utc).year
    prefix = f"NLI-{year}-"
    last = db.query(models.Enquiry).filter(
        models.Enquiry.reference.like(prefix + "%")) \
        .order_by(models.Enquiry.reference.desc()).first()
    seq = 1
    if last and last.reference:
        try:
            seq = int(last.reference.split("-")[-1]) + 1
        except (ValueError, IndexError):
            seq = 1
    return f"{prefix}{seq:04d}"


@app.post("/api/public/enquiries", status_code=201)
def public_enquiry(body: EnquiryPublicIn, request: Request, db: Session = Depends(get_db)):
    rate_limit(f"enq:{request.client.host if request.client else 'x'}", 10, 3600)
    dup = db.query(models.Enquiry).filter(models.Enquiry.email == body.email,
                                          models.Enquiry.product_interest == body.product_interest).order_by(models.Enquiry.id.desc()).first()
    import datetime as dt
    if dup and (datetime.now(timezone.utc).replace(tzinfo=None) - dup.created_at).total_seconds() < 24 * 3600:
        raise HTTPException(409, "Similar enquiry already received in the last 24h (duplicate protection).")
    # Resolve the related product name (never invent — only if it exists).
    product_interest = body.product_interest.strip()
    product_id = body.product_id
    if product_id is not None:
        prod = db.query(models.Product).filter(models.Product.id == product_id).first()
        if prod:
            product_interest = product_interest or prod.name
        else:
            product_id = None
    e = models.Enquiry(reference=_next_enquiry_reference(db),
                       name=body.name.strip(), email=str(body.email),
                       company=body.company.strip(), phone=body.phone.strip(),
                       country=body.country.strip(), product_id=product_id,
                       product_interest=product_interest,
                       quantity=body.quantity.strip(), message=body.message.strip(), consent=body.consent,
                       landing_page=body.landing_page[:1000], referrer=body.referrer[:1000],
                       campaign=body.campaign[:500], score=_score_enquiry(body), status="new")
    db.add(e)
    db.add(models.WorkflowExecution(workflow="enquiry_received", status="success", detail=str(body.email)[:200]))
    db.commit(); db.refresh(e)

    # Optional, non-blocking business notification (§13). The lead is already
    # committed; email failure never rolls it back and never fakes success.
    notified, notify_detail = False, "not attempted"
    if email_configured():
        ok, detail = send_email(
            settings.ENQUIRY_NOTIFY_EMAIL,
            f"New enquiry {e.reference} — {body.company or body.name}",
            f"Reference: {e.reference}\n"
            f"Name: {e.name}\nEmail: {e.email}\nPhone: {e.phone or '—'}\n"
            f"Company: {e.company or '—'}\nCountry: {e.country or '—'}\n"
            f"Product: {product_interest or '—'}\nQuantity: {e.quantity or '—'}\n"
            f"Campaign: {e.campaign or '—'}\nSource page: {e.landing_page or '—'}\n\n"
            f"Message:\n{e.message}\n\n"
            f"Admin record: {settings.PUBLIC_SITE_URL.rstrip('/')}/admin/enquiries")
        notified, notify_detail = ok, detail
    db.add(models.WorkflowExecution(workflow="enquiry_email_notify",
                                    status="success" if notified else "skipped",
                                    detail=notify_detail[:200]))
    db.commit()
    return {"id": e.id, "reference": e.reference,
            "message": "Thank you — New Look Impex will respond for wholesale/export enquiries.",
            "score": e.score, "email_notified": notified, "email_detail": notify_detail}


@app.get("/api/enquiries")
def list_enq(db: Session = Depends(get_db), u=Depends(require_role("admin", "editor")),
             status: str = "", country: str = "", q: str = "",
             page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)):
    qry = db.query(models.Enquiry)
    if status:
        qry = qry.filter(models.Enquiry.status == status)
    if country:
        qry = qry.filter(func.lower(models.Enquiry.country) == country.strip().lower())
    if q:
        like = f"%{q.strip()}%"
        qry = qry.filter(
            func.lower(models.Enquiry.company).like(func.lower(like))
            | func.lower(models.Enquiry.email).like(func.lower(like))
            | func.lower(models.Enquiry.name).like(func.lower(like))
            | func.lower(models.Enquiry.reference).like(func.lower(like)))
    total = qry.count()
    items = qry.order_by(models.Enquiry.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "page": page, "page_size": page_size, "items": [
        {"id": e.id, "reference": e.reference, "name": e.name, "email": e.email,
         "company": e.company, "phone": e.phone or "", "country": e.country,
         "product_id": e.product_id, "product_interest": e.product_interest,
         "quantity": e.quantity, "message": e.message,
         "status": e.status, "score": e.score, "landing_page": e.landing_page,
         "notes": e.notes or "", "created_at": e.created_at.isoformat()} for e in items]}


@app.get("/api/enquiries/export")
def export_enq(db: Session = Depends(get_db), u=Depends(require_role("admin",)),
               status: str = "", country: str = "", q: str = ""):
    import csv as csvm, io as io2
    qry = db.query(models.Enquiry)
    if status:
        qry = qry.filter(models.Enquiry.status == status)
    if country:
        qry = qry.filter(func.lower(models.Enquiry.country) == country.strip().lower())
    if q:
        like = f"%{q.strip()}%"
        qry = qry.filter(func.lower(models.Enquiry.company).like(func.lower(like))
                         | func.lower(models.Enquiry.email).like(func.lower(like)))
    buf = io2.StringIO(); w = csvm.writer(buf)
    w.writerow(["reference", "id", "name", "email", "company", "phone", "country",
                "product", "quantity", "status", "score", "source", "campaign",
                "landing_page", "notes", "created_at"])
    for e in qry.order_by(models.Enquiry.id.desc()).limit(5000):
        w.writerow([e.reference, e.id, e.name, e.email, e.company, e.phone, e.country,
                    e.product_interest, e.quantity, e.status, e.score, e.source,
                    e.campaign, e.landing_page, (e.notes or "").replace("\n", " "),
                    e.created_at])
    return PlainTextResponse(buf.getvalue(), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=enquiries.csv"})


@app.get("/api/enquiries/{eid}")
def get_enq(eid: int, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    e = db.query(models.Enquiry).filter(models.Enquiry.id == eid).first()
    if not e:
        raise HTTPException(404, "Enquiry not found")
    prod = None
    if e.product_id:
        p = db.query(models.Product).filter(models.Product.id == e.product_id).first()
        prod = {"id": p.id, "name": p.name, "slug": p.slug} if p else None
    return {"id": e.id, "reference": e.reference, "name": e.name, "email": e.email,
            "company": e.company, "phone": e.phone or "", "country": e.country,
            "product_id": e.product_id, "product": prod,
            "product_interest": e.product_interest, "quantity": e.quantity,
            "message": e.message, "consent": e.consent, "source": e.source,
            "landing_page": e.landing_page, "referrer": e.referrer,
            "campaign": e.campaign, "status": e.status, "score": e.score,
            "notes": e.notes or "",
            "follow_up_at": e.follow_up_at.isoformat() if e.follow_up_at else None,
            "created_at": e.created_at.isoformat()}


ENQUIRY_STATUSES = ("new", "contacted", "qualified", "quoted", "won", "lost", "spam")


@app.patch("/api/enquiries/{eid}")
def patch_enq(eid: int, body: EnquiryStatusIn, db: Session = Depends(get_db),
              u=Depends(require_role("admin", "editor"))):
    """Update a lead's status, internal notes and follow-up date."""
    e = db.query(models.Enquiry).filter(models.Enquiry.id == eid).first()
    if not e:
        raise HTTPException(404, "Enquiry not found")
    if body.status and body.status not in ENQUIRY_STATUSES:
        raise HTTPException(400, "Invalid status")
    if body.status:
        e.status = body.status
    if body.notes is not None:
        e.notes = body.notes[:2000]
    if body.follow_up_at is not None:
        e.follow_up_at = body.follow_up_at
    db.commit()
    audit(u.email, "enquiry.patch", "enquiry", str(eid), f"status={e.status}", db=db)
    return {"id": eid, "status": e.status, "notes": e.notes}


@app.post("/api/enquiries/{eid}/status")
def set_enq(eid: int, body: EnquiryStatusIn, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    e = db.query(models.Enquiry).filter(models.Enquiry.id == eid).first()
    if not e: raise HTTPException(404, "Not found")
    if body.status not in ENQUIRY_STATUSES:
        raise HTTPException(400, "Invalid status")
    e.status = body.status; e.notes = body.notes[:2000]
    if body.follow_up_at: e.follow_up_at = body.follow_up_at
    db.commit()
    audit(u.email, "enquiry.status", "enquiry", str(eid), body.status, db=db)
    return {"id": eid, "status": e.status}


@app.get("/api/admin/analytics")
def admin_analytics(days: int = 90, db: Session = Depends(get_db),
                    u=Depends(require_role("admin", "editor"))):
    """First-party, privacy-conscious analytics: product/category views, quote +
    WhatsApp clicks, enquiries by country/source, and conversion counts."""
    since = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days)

    def _ev(event_type):
        return db.query(func.count(models.AnalyticsEvent.id)).filter(
            models.AnalyticsEvent.event_type == event_type,
            models.AnalyticsEvent.created_at >= since).scalar() or 0

    # Most viewed products (from product_view events, joined to product names)
    viewed = db.query(models.AnalyticsEvent.product_id,
                      func.count(models.AnalyticsEvent.id).label("views")) \
        .filter(models.AnalyticsEvent.event_type == "product_view",
                models.AnalyticsEvent.product_id != None,  # noqa: E711
                models.AnalyticsEvent.created_at >= since) \
        .group_by(models.AnalyticsEvent.product_id) \
        .order_by(func.count(models.AnalyticsEvent.id).desc()).limit(10).all()
    top_products = []
    for pid, views in viewed:
        p = db.query(models.Product).filter(models.Product.id == pid).first()
        top_products.append({"product_id": pid,
                             "name": p.name if p else f"Product #{pid}",
                             "views": views})

    # Popular categories (category views counted from category_view-like events
    # where url matches /categories/<slug> or /category/<slug>)
    cat_views = db.query(models.AnalyticsEvent.url,
                         func.count(models.AnalyticsEvent.id)) \
        .filter(models.AnalyticsEvent.event_type == "product_view",
                models.AnalyticsEvent.url.like("%categor%"),
                models.AnalyticsEvent.created_at >= since) \
        .group_by(models.AnalyticsEvent.url).all()
    top_categories = [{"url": u_, "views": n} for u_, n in
                      sorted(cat_views, key=lambda x: -x[1])[:10]]

    # Enquiries by country and by source
    by_country = db.query(models.Enquiry.country, func.count(models.Enquiry.id)) \
        .filter(models.Enquiry.created_at >= since) \
        .group_by(models.Enquiry.country).all()
    by_source = db.query(models.Enquiry.source, func.count(models.Enquiry.id)) \
        .filter(models.Enquiry.created_at >= since) \
        .group_by(models.Enquiry.source).all()

    enq_total = db.query(func.count(models.Enquiry.id)).filter(
        models.Enquiry.created_at >= since).scalar() or 0
    enq_converted = db.query(func.count(models.Enquiry.id)).filter(
        models.Enquiry.created_at >= since,
        models.Enquiry.status.in_(["won"])).scalar() or 0
    enq_qualified = db.query(func.count(models.Enquiry.id)).filter(
        models.Enquiry.created_at >= since,
        models.Enquiry.status.in_(["qualified", "quoted", "won"])).scalar() or 0
    rfq_total = db.query(func.count(models.RFQ.id)).filter(
        models.RFQ.created_at >= since).scalar() or 0

    return {
        "days": days,
        "product_views": _ev("product_view"),
        "quote_button_clicks": _ev("rfq_add") + _ev("rfq_submit"),
        "whatsapp_clicks": _ev("whatsapp_click"),
        "contact_clicks": _ev("contact_click"),
        "catalogue_downloads": _ev("catalogue_download"),
        "most_viewed_products": top_products,
        "popular_categories": top_categories,
        "enquiries_by_country": [{"country": c or "Unknown", "count": n} for c, n in by_country],
        "enquiries_by_source": [{"source": s or "website", "count": n} for s, n in by_source],
        "enquiry_count": enq_total,
        "enquiry_qualified": enq_qualified,
        "enquiry_converted_won": enq_converted,
        "rfq_count": rfq_total,
        "conversion_rate": round(enq_converted / enq_total, 4) if enq_total else 0.0,
        "note": "First-party, privacy-conscious events only. No third-party trackers inferred.",
    }


@app.get("/api/reports/monthly")
def monthly(db: Session = Depends(get_db), u=Depends(current_user)):
    end, start = date.today(), date.today() - timedelta(days=30)
    prev_end, prev_start = start - timedelta(days=1), start - timedelta(days=30)
    def sums(a, b):
        r = db.query(func.sum(models.AnalyticsDaily.clicks), func.sum(models.AnalyticsDaily.impressions))\
            .filter(models.AnalyticsDaily.date >= a, models.AnalyticsDaily.date <= b).first()
        return (r[0] or 0, r[1] or 0)
    c1, i1 = sums(start, end); c0, i0 = sums(prev_start, prev_end)
    enq = db.query(func.count(models.Enquiry.id)).filter(func.date(models.Enquiry.created_at) >= start).scalar() or 0
    top = db.query(models.AnalyticsDaily.url, func.sum(models.AnalyticsDaily.clicks).label("c"))\
        .filter(models.AnalyticsDaily.date >= start).group_by(models.AnalyticsDaily.url).order_by(func.sum(models.AnalyticsDaily.clicks).desc()).limit(5).all()
    return {"period": [str(start), str(end)], "clicks": c1, "impressions": i1,
            "prev_clicks": c0, "prev_impressions": i0,
            "enquiries": enq, "top_pages": [{"url": u_, "clicks": c} for u_, c in top],
            "limitations": "Attribution limits: GA cannot map every keyword to a lead; compare periods with seasonality caveats; no ranking guarantees."}


@app.post("/api/n8n/approval-webhook")
def n8n_approval(payload: dict, db: Session = Depends(get_db)):
    """Authenticated approval webhook for n8n Workflow 3."""
    import hmac
    token = payload.get("token", "")
    if not hmac.compare_digest(str(token), settings.N8N_WEBHOOK_TOKEN):
        raise HTTPException(401, "Invalid webhook token")
    rid = int(payload.get("recommendation_id", 0))
    action = payload.get("action", "approve")
    r = db.query(models.SeoRecommendation).filter(models.SeoRecommendation.id == rid).first()
    if not r: raise HTTPException(404, "Recommendation not found")
    if action == "approve" and r.status in ("new", "pending"):
        r.status = "approved"; r.decided_by = "n8n-webhook"
    elif action == "publish" and r.status == "approved":
        r.status = "published"
        db.add(models.PublishingLog(recommendation_id=rid, url=r.url, action="publish", result="success", detail="via n8n webhook"))
    else:
        raise HTTPException(409, f"Cannot {action} from {r.status}")
    db.commit()
    return {"id": rid, "status": r.status}


@app.post("/api/n8n/enquiry-webhook", status_code=201)
def n8n_enquiry(payload: dict, db: Session = Depends(get_db)):
    import hmac
    if not hmac.compare_digest(str(payload.get("token", "")), settings.N8N_WEBHOOK_TOKEN):
        raise HTTPException(401, "Invalid webhook token")
    try:
        body = EnquiryPublicIn(**{k: payload.get(k, "") for k in
                                  ("name", "email", "company", "country", "product_interest", "quantity", "message")})
    except Exception as e:
        raise HTTPException(400, f"Invalid enquiry: {e}")
    e = models.Enquiry(name=body.name, email=str(body.email), company=body.company, country=body.country,
                       product_interest=body.product_interest, quantity=body.quantity, message=body.message,
                       source="n8n", score=_score_enquiry(body))
    db.add(e); db.commit(); db.refresh(e)
    return {"id": e.id}


@app.get("/api/automation/workflows")
def workflows(u=Depends(current_user)):
    import os, json as js
    base = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "n8n-workflows")
    out = []
    if os.path.isdir(base):
        for f in sorted(os.listdir(base)):
            if f.endswith(".json"):
                out.append({"file": f, "path": f"n8n-workflows/{f}"})
    return {"workflows": out, "guide": "docs/n8n-setup.md"}
