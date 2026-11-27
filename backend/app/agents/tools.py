"""Shared, whitelisted tool adapters for the AI agents.

Each function is ordinary Python over the existing DB/services — no arbitrary
SQL, shell access or secret reading. Mutating tools create approvals instead of
writing to live content when approval is required.
"""
from __future__ import annotations
import json
from pathlib import Path
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func

from .. import models
from ..config import settings
from ..llm import generate, keyword_ideas
from ..config import settings as cfg


def _json(v, default=None):
    try:
        return json.loads(v) if isinstance(v, str) and v.strip() else (default if default is not None else v)
    except (TypeError, ValueError):
        return default if default is not None else {}


# ---------------- read-only tools ----------------

def get_website_overview(db: Session, **kw) -> dict:
    q = lambda m: db.query(m).count()
    return {
        "products": q(models.Product),
        "published_products": db.query(models.Product).filter(models.Product.status == "published").count(),
        "categories": q(models.Category),
        "collections": q(models.Collection),
        "banners": q(models.Banner),
        "enquiries": q(models.Enquiry),
        "rfqs": q(models.RFQ),
        "leads": q(models.Buyer),
        "pending_approvals": db.query(models.AiApproval).filter(models.AiApproval.status == "pending").count(),
        "site_url": settings.PUBLIC_SITE_URL,
    }


def search_products(db: Session, query: str = "", limit: int = 10, **kw) -> dict:
    limit = max(1, min(int(limit or 10), 20))
    qry = db.query(models.Product)
    if query:
        like = f"%{query}%"
        qry = qry.filter(models.Product.name.ilike(like) | models.Product.sku.ilike(like) | models.Product.tags.ilike(like))
    rows = qry.limit(limit).all()
    return {"items": [{"id": r.id, "name": r.name, "slug": r.slug, "status": r.status,
                       "material": r.material, "category_id": r.category_id,
                       "images": db.query(func.count(models.ProductImage.id)).filter(models.ProductImage.product_id == r.id).scalar()}
                      for r in rows], "total": len(rows)}


def get_analytics(db: Session, days: int = 28, **kw) -> dict:
    days = max(1, min(int(days or 28), 365))
    since = datetime.utcnow() - timedelta(days=days)
    # sample rows are development placeholders — never present them as real data
    daily = (db.query(models.AnalyticsDaily)
             .filter(models.AnalyticsDaily.date >= since.date(),
                     func.lower(models.AnalyticsDaily.source) != "sample")
             .all())
    by_country = db.query(models.Enquiry.country, func.count(models.Enquiry.id)).group_by(models.Enquiry.country).all()
    return {
        "period_days": days,
        "gsc_rows": len(daily),
        "clicks": sum(int(r.clicks or 0) for r in daily),
        "impressions": sum(int(r.impressions or 0) for r in daily),
        "enquiries_by_country": [{"country": c or "Unknown", "count": n} for c, n in by_country],
        "events": db.query(func.count(models.AnalyticsEvent.id)).filter(models.AnalyticsEvent.created_at >= since).scalar() or 0,
        "note": "Sample analytics rows are excluded. Connect GSC for real search data.",
    }


def list_enquiries(db: Session, status: str = "", limit: int = 20, **kw) -> dict:
    qry = db.query(models.Enquiry)
    if status:
        qry = qry.filter(models.Enquiry.status == status)
    rows = qry.order_by(models.Enquiry.id.desc()).limit(min(int(limit or 20), 100)).all()
    return {"items": [{"id": r.id, "reference": r.reference, "name": r.name, "email": r.email,
                       "country": r.country, "status": r.status, "score": r.score,
                       "product_interest": r.product_interest} for r in rows]}


def list_media(db: Session, limit: int = 20, **kw) -> dict:
    rows = db.query(models.MediaFile).order_by(models.MediaFile.id.desc()).limit(min(int(limit or 20), 100)).all()
    return {"items": [{"id": r.id, "filename": r.filename, "original_name": r.original_name,
                       "content_type": r.content_type, "permission": r.permission} for r in rows]}


def seo_audit(db: Session, **kw) -> dict:
    rows = (db.query(models.Product)
            .filter(models.Product.status == "published",
                    (models.Product.seo_title == "") | (models.Product.seo_description == ""))
            .limit(50).all())
    return {"products_missing_seo": len(rows),
            "items": [{"id": r.id, "name": r.name, "slug": r.slug} for r in rows],
            "note": "Rule-based check; no fabricated scores."}


def keyword_ideas_tool(db: Session, seed: str = "", country: str = "", **kw) -> dict:
    return keyword_ideas(seed or "brass handicrafts wholesale", country, n=8)


def web_research(db: Session, query: str = "", **kw) -> dict:
    """Honest web research via LLM knowledge is NOT used as evidence.

    Returns a clearly labelled planning scaffold; connect a search API for
    live sourcing. Never fabricates sources or contacts.
    """
    return {"ok": True, "query": query,
            "items": [],
            "note": "Live web search is not connected. Provide SEARCH_API_KEY to enable sourced research; no results are invented."}


# ---------------- mutating tools: create approvals, never silent writes ----------------

def _approval(db, task_id, agent_key, kind, title, proposed, previous=None, summary="", user_email=""):
    row = models.AiApproval(task_id=task_id, agent_key=agent_key, kind=kind, title=title[:255],
                            summary=summary, previous_json=json.dumps(previous or {}, ensure_ascii=False),
                            proposed_json=json.dumps(proposed, ensure_ascii=False, default=str),
                            requested_by=user_email or "agent")
    db.add(row); db.flush()
    return row


def update_product(db: Session, task_id=None, agent_key="", user_email="", preview: bool = True, **params) -> dict:
    pid = params.get("product_id")
    row = db.query(models.Product).filter(models.Product.id == int(pid)).first() if pid else None
    if not row:
        return {"ok": False, "error": "Product not found"}
    fields = {k: v for k, v in params.items() if k in
              {"name", "short_description", "description", "seo_title", "seo_description", "featured", "status"}}
    if not fields:
        return {"ok": False, "error": "No product fields supplied"}
    prev = {k: getattr(row, k) for k in fields}
    if preview:
        a = _approval(db, task_id, agent_key, "product_change", f"Update product: {row.name}",
                      fields, prev, "Product field changes require approval before publishing.", user_email)
        return {"ok": True, "approval_id": a.id, "preview": True, "previous": prev, "proposed": fields}
    for k, v in fields.items():
        setattr(row, k, v)
    db.flush()
    return {"ok": True, "preview": False, "product_id": row.id, "updated": list(fields)}


def create_product(db: Session, task_id=None, agent_key="", user_email="", preview: bool = True, **params) -> dict:
    name = str(params.get("name") or "").strip()
    if not name:
        return {"ok": False, "error": "Product name required"}
    from ..text import slugify
    fields = {k: v for k, v in params.items() if k in
              {"name", "short_description", "description", "seo_title", "seo_description", "sku", "status", "category_id"}}
    fields["name"] = name
    fields.setdefault("status", "draft")
    # Images analysed from the local folder can be attached by filename.
    images = params.get("image_names") or []
    if isinstance(images, str):
        images = [images]
    images = [str(x) for x in images][:12]
    if images:
        fields["image_names"] = images
    if preview:
        a = _approval(db, task_id, agent_key, "product_create", f"Create product: {name}",
                      fields, {}, "New product requires approval before it is saved.", user_email)
        return {"ok": True, "approval_id": a.id, "preview": True, "proposed": fields}
    return create_product_record(db, fields)


def create_product_record(db: Session, fields: dict) -> dict:
    """Persist a product proposal (used by tools and by approval execution)."""
    from ..text import slugify
    from ..media_store import save_file, public_url, validate_rights
    from .image_folder import folder_path
    data = dict(fields)
    images = data.pop("image_names", []) or []
    name = data.pop("name")
    status = data.pop("status", "draft")
    if status not in ("published", "draft", "archived"):
        status = "draft"
    row = models.Product(name=name, slug=slugify(name), status=status,
                         price_on_request=True, price_visibility="on_request", **data)
    db.add(row); db.flush()
    folder = folder_path()
    attached = 0
    for idx, img in enumerate(images):
        src = folder / str(img)
        if not src.exists() or not src.is_file():
            # allow absolute paths supplied by the analysis tool
            src = Path(str(img))
        if not src.exists() or not src.is_file():
            continue
        try:
            content = src.read_bytes()
            meta = save_file(src.name, content, "image/jpeg" if src.suffix.lower() in (".jpg", ".jpeg") else "image/png")
            db.add(models.MediaFile(filename=meta["filename"], original_name=src.name[:255],
                                    content_type="image/jpeg", size=len(content),
                                    source="AI agent (analysed product photo)", permission=validate_rights("own"),
                                    has_thumb=bool(meta.get("has_thumb")), has_webp=bool(meta.get("has_webp"))))
            db.add(models.ProductImage(product_id=row.id, url=public_url(meta["filename"]),
                                       alt_text=f"{name} — handcrafted product photo",
                                       is_primary=(idx == 0), sort_order=idx,
                                       source="own", permission="AI agent (analysed product photo)"))
            attached += 1
        except Exception:
            continue
    db.flush()
    return {"ok": True, "preview": False, "product_id": row.id, "images_attached": attached}


def update_site_content(db: Session, task_id=None, agent_key="", user_email="", preview: bool = True, **params) -> dict:
    # Accept natural params from the LLM: {page:"home", section:"hero", headline:"..."}
    # and normalize them to the CMS shape {key:"hero", value:{headline:"..."}}.
    meta = {"task_id", "agent_key", "user_email", "preview", "page", "section", "key", "value"}
    key = str(params.get("key") or params.get("section") or "").strip().lower()
    if not key:
        return {"ok": False, "error": "Content key required (use key or section)"}
    if "value" in params and isinstance(params["value"], dict):
        proposed = dict(params["value"])
    else:
        proposed = {k: v for k, v in params.items() if k not in meta}
    if not proposed:
        return {"ok": False, "error": "No content values supplied"}
    row = db.query(models.SiteContent).filter(models.SiteContent.key == key).first()
    prev = _json(row.value, None) if row else None
    if isinstance(prev, dict) and isinstance(proposed, dict):
        merged = dict(prev); merged.update(proposed); proposed = merged
    if preview:
        a = _approval(db, task_id, agent_key, "site_content", f"Update site content: {key}",
                      {"key": key, "value": proposed}, {"key": key, "value": prev},
                      "Website content changes require approval.", user_email)
        return {"ok": True, "approval_id": a.id, "preview": True, "proposed": {"key": key, "value": proposed}}
    if row is None:
        row = models.SiteContent(key=key); db.add(row)
    row.value = json.dumps(proposed, ensure_ascii=False)
    db.flush()
    return {"ok": True, "preview": False, "key": key}


def create_banner(db: Session, task_id=None, agent_key="", user_email="", preview: bool = True, **params) -> dict:
    if not str(params.get("image_url") or "").strip():
        return {"ok": False, "error": "image_url required for a banner"}
    if preview:
        a = _approval(db, task_id, agent_key, "banner_create", f"Create banner: {params.get('title','Untitled')}",
                      params, {}, "Banner creation requires approval before publishing.", user_email)
        return {"ok": True, "approval_id": a.id, "preview": True}
    row = models.Banner(placement=params.get("placement", "home_hero"), title=params.get("title", ""),
                        subtitle=params.get("subtitle", ""), image_url=params["image_url"],
                        cta_text=params.get("cta_text", ""), cta_link=params.get("cta_link", ""),
                        is_active=bool(params.get("is_active", False)))
    db.add(row); db.flush()
    return {"ok": True, "preview": False, "banner_id": row.id}


def update_seo_page(db: Session, task_id=None, agent_key="", user_email="", preview: bool = True, **params) -> dict:
    path = str(params.get("path") or "/")
    fields = {k: v for k, v in params.items() if k in ("title", "meta_description", "canonical", "description")}
    if "description" in fields:
        fields["meta_description"] = fields.pop("description")
    if preview:
        a = _approval(db, task_id, agent_key, "seo_page", f"Update SEO: {path}",
                      {"path": path, **fields}, {"path": path}, "SEO metadata changes require approval.", user_email)
        return {"ok": True, "approval_id": a.id, "preview": True}
    row = db.query(models.SeoPage).filter(models.SeoPage.path == path).first()
    if row is None:
        row = models.SeoPage(path=path, title="", meta_description="", canonical="")
        db.add(row)
    for k, v in fields.items():
        if hasattr(row, k):
            setattr(row, k, v)
    db.flush()
    return {"ok": True, "preview": False, "path": path}


def create_followup(db: Session, task_id=None, agent_key="", user_email="", preview: bool = True, **params) -> dict:
    eid = params.get("enquiry_id")
    body = str(params.get("body") or "").strip()
    if not eid or not body:
        return {"ok": False, "error": "enquiry_id and body required"}
    proposed = {"enquiry_id": int(eid), "subject": params.get("subject", "Following up on your enquiry"),
                "body": body, "channel": params.get("channel", "email"), "due_at": params.get("due_at")}
    if preview:
        a = _approval(db, task_id, agent_key, "followup", "Draft enquiry follow-up",
                      proposed, {}, "Outbound communication requires explicit approval.", user_email)
        return {"ok": True, "approval_id": a.id, "preview": True}
    row = models.SalesFollowup(**{k: v for k, v in proposed.items() if k != "due_at"})
    if proposed.get("due_at"):
        try:
            row.due_at = datetime.fromisoformat(str(proposed["due_at"]))
        except ValueError:
            pass
    db.add(row); db.flush()
    return {"ok": True, "preview": False, "followup_id": row.id}


def generate_image(db: Session, **params) -> dict:
    from ..llm import image_configured, generate_image_bytes
    if not image_configured():
        return {"ok": False, "error": "Image generation provider not configured"}
    res = generate_image_bytes(str(params.get("prompt") or ""))
    if not res.get("image_bytes"):
        return {"ok": False, "error": res.get("error", "generation failed")}
    return {"ok": True, "note": "Concept image generated (not saved automatically).", "bytes": len(res["image_bytes"])}


def snapshot_kpis(db: Session, **params) -> dict:
    from .tools import get_analytics, get_website_overview
    a = get_analytics(db); o = get_website_overview(db)
    period = str(params.get("period") or datetime.utcnow().strftime("%Y-W%W"))
    values = {"clicks": a["clicks"], "impressions": a["impressions"], "enquiries": o["enquiries"],
              "rfqs": o["rfqs"], "products": o["products"], "events": a["events"]}
    saved = []
    for metric, value in values.items():
        row = db.query(models.AnalyticsSnapshot).filter(
            models.AnalyticsSnapshot.period == period, models.AnalyticsSnapshot.metric == metric,
            models.AnalyticsSnapshot.source == "database").first()
        if row is None:
            row = models.AnalyticsSnapshot(period=period, metric=metric, source="database"); db.add(row)
        row.value = float(value); saved.append(metric)
    db.flush()
    return {"ok": True, "period": period, "metrics": saved}


def list_product_images(db: Session, limit: int = 12, **kw) -> dict:
    from .image_folder import list_new_images
    return list_new_images(limit)


def analyse_product_images(db: Session, names: list[str] | None = None, limit: int = 3, **kw) -> dict:
    from .image_folder import analyse_images
    return analyse_images(names, limit)


def seo_coverage_report(db: Session, **kw) -> dict:
    """Grounded SEO coverage report. Only real DB counts — never rankings,
    traffic, keyword volume or invented scores. Read-only."""
    published = db.query(models.Product).filter(models.Product.status == "published")
    products = published.all()
    imaged = {r[0] for r in db.query(models.ProductImage.product_id).distinct().all()}
    gsc = db.query(models.SeoKeyword).filter(models.SeoKeyword.source == "gsc").count()
    return {
        "published_products": len(products),
        "products_missing_seo_title": sum(1 for p in products if not (p.seo_title or "").strip()),
        "products_missing_seo_description": sum(1 for p in products if not (p.seo_description or "").strip()),
        "products_without_images": sum(1 for p in products if p.id not in imaged),
        "images_missing_alt_text": db.query(models.ProductImage)
            .filter((models.ProductImage.alt_text.is_(None)) | (models.ProductImage.alt_text == "")).count(),
        "published_seo_pages": db.query(models.SeoPage).filter(models.SeoPage.published.is_(True)).count(),
        "verified_gsc_keywords": gsc,
        "candidate_keywords": db.query(models.SeoKeyword).filter(models.SeoKeyword.source == "candidate").count(),
        "note": ("Counts come from the local database only. No Google rankings, impressions, "
                 "keyword volume or traffic are estimated. Connect GSC/GA4 to measure performance."),
    }


TOOLS = {
    "get_website_overview": get_website_overview,
    "list_product_images": list_product_images,
    "analyse_product_images": analyse_product_images,
    "search_products": search_products,
    "get_analytics": get_analytics,
    "list_enquiries": list_enquiries,
    "list_media": list_media,
    "seo_audit": seo_audit,
    "seo_coverage_report": seo_coverage_report,
    "keyword_ideas": keyword_ideas_tool,
    "web_research": web_research,
    "update_product": update_product,
    "create_product": create_product,
    "update_site_content": update_site_content,
    "create_banner": create_banner,
    "update_seo_page": update_seo_page,
    "create_followup": create_followup,
    "generate_image": generate_image,
    "snapshot_kpis": snapshot_kpis,
}
