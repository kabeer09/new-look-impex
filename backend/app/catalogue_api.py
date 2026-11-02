"""AI Catalogue admin API (spec §3, §10, §11, §17).

Pipeline: scan folder -> pending -> analyzing -> ai_generated / needs_review
-> approved -> published (or failed). Unapproved AI content is never public:
publishing requires the profile to be approved first, and the public API only
serves published products (existing behaviour in catalog.py).
"""
from __future__ import annotations
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from . import models
from . import product_scanner
from .auth import current_user, rate_limit, require_role
from .catalogue_ai import (analyze_image_observed, generate_payload,
                           parse_ai_json, build_descriptions, build_keywords,
                           build_seo, build_b2b, build_schema,
                           build_image_seo, _llm_descriptions, COMPANY, BRAND)
from .config import settings
from .database import get_db
from .llm import llm_configured
from .media_store import read_file
from .text import slugify

router = APIRouter()

NOW = lambda: datetime.now(timezone.utc).replace(tzinfo=None)  # noqa: E731


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _loads(text: str, default):
    try:
        return json.loads(text or "")
    except Exception:
        return default


def _profile_out(p: models.ProductSeoProfile) -> dict:
    return {
        "status": p.status, "source": p.source or "",
        "observed": _loads(p.observed_json, {}),
        "observed_facts": _loads(p.observed_json, {}).get("observed_facts", []) if _loads(p.observed_json, {}) else [],
        "assumptions": _loads(p.observed_json, {}).get("assumptions", []) if _loads(p.observed_json, {}) else [],
        "descriptions": _loads(p.descriptions_json, {}),
        "keywords": _loads(p.keywords_json, {}),
        "seo": _loads(p.seo_json, {}),
        "image_seo": _loads(p.image_seo_json, []),
        "schema": _loads(p.schema_json, {}),
        "b2b": _loads(p.b2b_json, {}),
        "needs_verification": _loads(p.needs_verification_json, []),
        "error": p.error or "",
        "generated_at": p.generated_at.isoformat() if p.generated_at else None,
        "approved_at": p.approved_at.isoformat() if p.approved_at else None,
        "approved_by": p.approved_by or "",
        "published_at": p.published_at.isoformat() if p.published_at else None,
    }


def _item_out(db: Session, p: models.Product,
              profile: models.ProductSeoProfile | None) -> dict:
    img = (db.query(models.ProductImage)
           .filter(models.ProductImage.product_id == p.id)
           .order_by(models.ProductImage.is_primary.desc(),
                     models.ProductImage.sort_order).first())
    cat = None
    if p.category_id:
        c = db.query(models.Category).filter(models.Category.id == p.category_id).first()
        if c:
            cat = {"id": c.id, "name": c.name, "slug": c.slug}
    image_count = db.query(func.count(models.ProductImage.id)).filter(
        models.ProductImage.product_id == p.id).scalar() or 0
    desc = _loads(profile.descriptions_json, {}) if profile else {}
    seo = _loads(profile.seo_json, {}) if profile else {}
    keywords = _loads(profile.keywords_json, {}) if profile else {}
    seo_complete = all([
        bool(p.seo_title or seo.get("title")),
        bool(p.seo_description or seo.get("meta_description")),
        bool(desc.get("short") or desc.get("detailed")),
        bool(keywords.get("primary")),
        image_count > 0,
    ])
    return {
        "id": p.id, "name": p.name, "slug": p.slug, "status": p.status,
        "pipeline_status": profile.status if profile else "missing",
        "category": cat, "material": p.material or "",
        "image": {"url": img.url, "alt_text": img.alt_text} if img else None,
        "image_count": image_count,
        "seo_title": p.seo_title or seo.get("title", ""),
        "seo_description": p.seo_description or seo.get("meta_description", ""),
        "primary_keyword": keywords.get("primary", ""),
        "has_description": bool(p.description or p.short_description or
                                desc.get("short") or desc.get("detailed")),
        "seo_complete": seo_complete,
        "source": profile.source if profile else "",
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


def _get_product_profile(db: Session, pid: int) -> tuple[models.Product,
                                                         models.ProductSeoProfile]:
    p = db.query(models.Product).filter(models.Product.id == pid).first()
    if not p:
        raise HTTPException(404, "Product not found")
    prof = db.query(models.ProductSeoProfile).filter(
        models.ProductSeoProfile.product_id == pid).first()
    if not prof:
        prof = models.ProductSeoProfile(product_id=pid, status="pending")
        db.add(prof)
        db.commit()
        db.refresh(prof)
    return p, prof


def _primary_image_bytes(db: Session, p: models.Product) -> tuple[bytes, str, str]:
    """(bytes, mime, media_filename) for the primary image, or ("", "", "")."""
    img = (db.query(models.ProductImage)
           .filter(models.ProductImage.product_id == p.id)
           .order_by(models.ProductImage.is_primary.desc(),
                     models.ProductImage.sort_order).first())
    if not img:
        return "", "", ""
    filename = img.url.rsplit("/", 1)[-1]
    content, mime = read_file(filename)
    return content or "", (mime or "image/jpeg"), filename


def _apply_payload_to_product(p: models.Product, prof: models.ProductSeoProfile,
                              db: Session, overwrite: bool = False) -> None:
    """Copy generated fields onto the product record.

    overwrite=False fills only empty fields (analysis of a fresh draft never
    clobbers human-entered data). overwrite=True is used on approve — the
    admin explicitly accepted this content."""
    obs = _loads(prof.observed_json, {})
    desc = _loads(prof.descriptions_json, {})
    seo = _loads(prof.seo_json, {})
    keywords = _loads(prof.keywords_json, {})

    def put(current, new, limit=0):
        if overwrite or not current:
            value = str(new or "")[:limit] if limit else str(new or "")
            return value if value else current
        return current

    p.short_description = put(p.short_description, desc.get("short"))
    p.description = put(p.description, desc.get("detailed"))
    p.material = put(p.material, obs.get("material"), 255)
    p.finish = put(p.finish, obs.get("finish"), 255)
    p.color = put(p.color, obs.get("colour"), 255)
    p.seo_title = put(p.seo_title, seo.get("title"), 512)
    p.seo_description = put(p.seo_description, seo.get("meta_description"), 1024)
    tags = _loads(p.tags or "[]", [])
    if (overwrite or not tags) and keywords.get("primary"):
        flat = [keywords["primary"]] + (keywords.get("secondary") or [])[:8]
        p.tags = json.dumps([t[:60] for t in flat if t][:12])
    db.flush()


# ---------------------------------------------------------------------------
# Scanner (spec §3)
# ---------------------------------------------------------------------------

@router.get("/api/catalogue/status")
def catalogue_status(db: Session = Depends(get_db), u=Depends(current_user)):
    root = product_scanner.scan_root()
    return {
        "enabled": bool(settings.PRODUCT_SCAN_ENABLED),
        "scan_dir": str(root),
        "scan_dir_exists": root.is_dir(),
        "interval_seconds": settings.PRODUCT_SCAN_INTERVAL,
        "llm_configured": llm_configured(),
        "last_run": product_scanner.LAST_RUN,
        "note": "Originals are never moved or deleted. New files become draft "
                "products with pipeline status 'pending'.",
    }


@router.post("/api/catalogue/scan")
def catalogue_scan(db: Session = Depends(get_db),
                   u=Depends(require_role("admin", "editor"))):
    rate_limit(f"cat-scan:{u.email}", 10, 600)
    counts = product_scanner.scan_once()
    return {"counts": counts, "scan_dir": product_scanner.LAST_RUN.get("dir", "")}


# ---------------------------------------------------------------------------
# Dashboard stats (spec §10)
# ---------------------------------------------------------------------------

@router.get("/api/catalogue/stats")
def catalogue_stats(db: Session = Depends(get_db), u=Depends(current_user)):
    total = db.query(func.count(models.Product.id)).filter(
        models.Product.status != "archived").scalar() or 0
    by_pipeline = dict(db.query(models.ProductSeoProfile.status,
                                func.count(models.ProductSeoProfile.id))
                       .group_by(models.ProductSeoProfile.status).all())
    published = db.query(func.count(models.Product.id)).filter(
        models.Product.status == "published").scalar() or 0
    missing_images = db.query(func.count(models.Product.id)).filter(
        models.Product.status != "archived",
        ~models.Product.id.in_(
            db.query(models.ProductImage.product_id))).scalar() or 0
    missing_descriptions = db.query(func.count(models.Product.id)).filter(
        models.Product.status != "archived",
        (func.coalesce(models.Product.short_description, "") == "") &
        (func.coalesce(models.Product.description, "") == "")).scalar() or 0
    missing_metadata = db.query(func.count(models.Product.id)).filter(
        models.Product.status != "archived",
        (func.coalesce(models.Product.seo_title, "") == "") |
        (func.coalesce(models.Product.seo_description, "") == "")).scalar() or 0
    # SEO completion: products with title+meta+description+image+keyword.
    complete = 0
    for p in (db.query(models.Product)
              .filter(models.Product.status != "archived")
              .options().limit(5000).all()):
        prof = db.query(models.ProductSeoProfile).filter(
            models.ProductSeoProfile.product_id == p.id).first()
        if _item_out(db, p, prof)["seo_complete"]:
            complete += 1
    pct = round(100 * complete / total, 1) if total else 0.0
    return {
        "total_products": total,
        "pending": by_pipeline.get("pending", 0),
        "analyzing": by_pipeline.get("analyzing", 0),
        "ai_generated": by_pipeline.get("ai_generated", 0),
        "needs_review": by_pipeline.get("needs_review", 0),
        "approved": by_pipeline.get("approved", 0),
        "published_pipeline": by_pipeline.get("published", 0),
        "failed": by_pipeline.get("failed", 0),
        "published_products": published,
        "seo_completion_pct": pct,
        "missing_images": missing_images,
        "missing_descriptions": missing_descriptions,
        "missing_metadata": missing_metadata,
        "llm_configured": llm_configured(),
    }


# ---------------------------------------------------------------------------
# Pipeline product list / detail (spec §10)
# ---------------------------------------------------------------------------

@router.get("/api/catalogue/products")
def catalogue_products(status: str = "", q: str = "",
                       page: int = 1, page_size: int = 24,
                       db: Session = Depends(get_db), u=Depends(current_user)):
    qry = db.query(models.Product).filter(models.Product.status != "archived")
    if q:
        like = f"%{q}%"
        qry = qry.filter(func.lower(models.Product.name).like(func.lower(like)))
    if status:
        if status == "no_description":
            qry = qry.filter((func.coalesce(models.Product.short_description, "") == "") &
                             (func.coalesce(models.Product.description, "") == ""))
        elif status == "no_metadata":
            qry = qry.filter((func.coalesce(models.Product.seo_title, "") == "") |
                             (func.coalesce(models.Product.seo_description, "") == ""))
        elif status == "no_image":
            qry = qry.filter(~models.Product.id.in_(
                db.query(models.ProductImage.product_id)))
        else:
            qry = qry.join(models.ProductSeoProfile,
                           models.ProductSeoProfile.product_id == models.Product.id,
                           isouter=True).filter(models.ProductSeoProfile.status == status)
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    total = qry.count()
    rows = qry.order_by(models.Product.id.desc()) \
        .offset((page - 1) * page_size).limit(page_size).all()
    items = []
    for p in rows:
        prof = db.query(models.ProductSeoProfile).filter(
            models.ProductSeoProfile.product_id == p.id).first()
        items.append(_item_out(db, p, prof))
    return {"total": total, "page": page, "page_size": page_size, "items": items}


@router.get("/api/catalogue/products/{pid}")
def catalogue_product_detail(pid: int, db: Session = Depends(get_db),
                             u=Depends(current_user)):
    p, prof = _get_product_profile(db, pid)
    images = [{"id": im.id, "url": im.url, "alt_text": im.alt_text,
               "is_primary": im.is_primary} for im in
              (db.query(models.ProductImage)
               .filter(models.ProductImage.product_id == pid)
               .order_by(models.ProductImage.is_primary.desc(),
                         models.ProductImage.sort_order).all())]
    return {"product": _item_out(db, p, prof), "profile": _profile_out(prof),
            "images": images,
            "product_fields": {
                "short_description": p.short_description, "description": p.description,
                "material": p.material, "finish": p.finish, "color": p.color,
                "dimensions": p.dimensions, "weight": p.weight, "sku": p.sku,
                "moq": p.moq, "lead_time": p.lead_time,
                "packaging_info": p.packaging_info,
                "seo_title": p.seo_title, "seo_description": p.seo_description,
            },
            "public_url": f"{settings.PUBLIC_SITE_URL.rstrip('/')}/products/{p.slug}",
            "preview_url": f"/products/{p.slug}" if p.status == "published" else None}


# ---------------------------------------------------------------------------
# Analyze (spec §4/§5) — vision + full payload generation
# ---------------------------------------------------------------------------

def _run_analysis(db: Session, p: models.Product,
                  prof: models.ProductSeoProfile) -> None:
    """Populate the profile from the product's primary image + fields.
    Sets status to ai_generated / needs_review / failed. Commits."""
    prof.status = "analyzing"
    prof.error = ""
    db.commit()
    try:
        content, mime, _fn = _primary_image_bytes(db, p)
        observed = analyze_image_observed(content, mime) if content else {}
        cat_name = ""
        if p.category_id:
            c = db.query(models.Category).filter(
                models.Category.id == p.category_id).first()
            cat_name = c.name if c else ""
        if not observed.get("category") and cat_name:
            observed["category"] = cat_name
        images = (db.query(models.ProductImage)
                  .filter(models.ProductImage.product_id == p.id)
                  .order_by(models.ProductImage.is_primary.desc()).all())
        filenames = [im.url.rsplit("/", 1)[-1] for im in images]
        urls = [im.url for im in images]
        base = settings.PUBLIC_SITE_URL.rstrip("/")
        payload = generate_payload(p.name, observed, filenames, urls,
                                   slug=p.slug, canonical_base=base,
                                   category_name=cat_name)
        # Do not clobber human-entered product fields (spec §11: admin edits win).
        prof.observed_json = json.dumps({**payload["observed"],
                                         "observed_facts": payload["observed_facts"],
                                         "assumptions": payload["assumptions"]})
        prof.descriptions_json = json.dumps(payload["descriptions"])
        prof.keywords_json = json.dumps(payload["keywords"])
        prof.seo_json = json.dumps(payload["seo"])
        prof.image_seo_json = json.dumps(payload["image_seo"])
        prof.schema_json = json.dumps(payload["schema"])
        prof.b2b_json = json.dumps(payload["b2b"])
        prof.needs_verification_json = json.dumps(payload["needs_verification"])
        prof.source = payload["source"]
        prof.generated_at = NOW()
        # Rule-based fallback or missing core observed facts => human review.
        # (needs_verification always carries the standard unknowns — dimensions,
        # weight, MOQ etc. — so it alone must not force review; only missing
        # VISION-derived facts do.)
        core_missing = [k for k in ("product_type", "category", "material",
                                    "finish", "colour")
                        if not payload["observed"].get(k)]
        review_needed = (not llm_configured()) or bool(core_missing)
        prof.status = "needs_review" if review_needed else "ai_generated"
        _apply_payload_to_product(p, prof, db)
        db.commit()
    except Exception as e:  # noqa: BLE001
        db.rollback()
        prof = db.query(models.ProductSeoProfile).filter(
            models.ProductSeoProfile.product_id == p.id).first()
        if prof:
            prof.status = "failed"
            prof.error = f"{type(e).__name__}: {str(e)[:500]}"
            db.commit()


@router.post("/api/catalogue/products/{pid}/analyze")
def catalogue_analyze(pid: int, db: Session = Depends(get_db),
                      u=Depends(require_role("admin", "editor"))):
    rate_limit(f"cat-analyze:{u.email}", 30, 600)
    p, prof = _get_product_profile(db, pid)
    _run_analysis(db, p, prof)
    db.refresh(prof)
    return {"product": _item_out(db, p, prof), "profile": _profile_out(prof)}


# ---------------------------------------------------------------------------
# Regenerate selected sections (spec §11)
# ---------------------------------------------------------------------------

@router.post("/api/catalogue/products/{pid}/regenerate")
def catalogue_regenerate(pid: int, payload: dict,
                         db: Session = Depends(get_db),
                         u=Depends(require_role("admin", "editor"))):
    rate_limit(f"cat-regen:{u.email}", 40, 600)
    p, prof = _get_product_profile(db, pid)
    sections = [str(s) for s in (payload.get("sections") or ["all"])]
    obs = _loads(prof.observed_json, {})
    facts = {k: obs.get(k) for k in
             ("product_type", "category", "material", "finish", "colour",
              "design", "usage", "style")}
    images = (db.query(models.ProductImage)
              .filter(models.ProductImage.product_id == pid)
              .order_by(models.ProductImage.is_primary.desc()).all())
    filenames = [im.url.rsplit("/", 1)[-1] for im in images]
    urls = [im.url for im in images]
    base = settings.PUBLIC_SITE_URL.rstrip("/")

    if "descriptions" in sections or "all" in sections:
        desc = _llm_descriptions(p.name, facts, build_descriptions(p.name, facts))
        existing = _loads(prof.descriptions_json, {})
        if existing.get("highlights") and "highlights" not in desc:
            desc["highlights"] = existing["highlights"]
        prof.descriptions_json = json.dumps(desc)
        if p.status != "published":  # public copy changes only via approve
            p.short_description = desc.get("short", p.short_description)
            p.description = desc.get("detailed", p.description)
    if "keywords" in sections or "all" in sections:
        prof.keywords_json = json.dumps(build_keywords(p.name, facts))
    if "seo" in sections or "all" in sections:
        keywords = _loads(prof.keywords_json, {})
        seo = build_seo(p.name, facts, keywords or build_keywords(p.name, facts),
                        canonical_base=base)
        seo["slug"] = p.slug
        prof.seo_json = json.dumps(seo)
        if p.status != "published":  # public metadata changes only via approve
            p.seo_title = seo["title"][:512]
            p.seo_description = seo["meta_description"][:1024]
    if "image_seo" in sections or "all" in sections:
        prof.image_seo_json = json.dumps(build_image_seo(p.name, facts, filenames))
    if "b2b" in sections or "all" in sections:
        prof.b2b_json = json.dumps(build_b2b(p.name, facts))
    if "schema" in sections or "all" in sections:
        desc = _loads(prof.descriptions_json, {})
        keywords = _loads(prof.keywords_json, {})
        seo = _loads(prof.seo_json, {})
        prof.schema_json = json.dumps(build_schema(
            p.name, p.slug, desc, facts, urls,
            canonical_url=seo.get("canonical_url", ""),
            category_name=facts.get("category") or ""))
    prof.generated_at = NOW()
    if prof.status in ("published",):
        prof.status = "needs_review"  # re-approval required after regeneration
    elif prof.status in ("pending", "failed"):
        prof.status = "needs_review"
    db.commit()
    db.refresh(prof)
    return {"product": _item_out(db, p, prof), "profile": _profile_out(prof)}


# ---------------------------------------------------------------------------
# Save admin edits (spec §11)
# ---------------------------------------------------------------------------

PRODUCT_TEXT_FIELDS = ("short_description", "description", "material", "finish",
                       "color", "dimensions", "weight", "sku", "moq",
                       "lead_time", "packaging_info", "seo_title",
                       "seo_description")

PROFILE_JSON_FIELDS = ("observed", "descriptions", "keywords", "seo",
                       "image_seo", "schema", "b2b")


@router.put("/api/catalogue/products/{pid}")
def catalogue_save(pid: int, payload: dict, db: Session = Depends(get_db),
                   u=Depends(require_role("admin", "editor"))):
    """Save edits from the tabbed editor: product fields + profile sections."""
    p, prof = _get_product_profile(db, pid)
    fields = payload.get("product_fields") or {}
    for key in PRODUCT_TEXT_FIELDS:
        if key in fields:
            setattr(p, key, str(fields[key] or "")[:2000])
    if "name" in fields and str(fields["name"]).strip():
        new_name = str(fields["name"]).strip()[:512]
        if new_name != p.name:
            p.name = new_name
    if "slug" in fields and str(fields["slug"]).strip():
        new_slug = slugify(fields["slug"])
        if new_slug != p.slug:
            dup = db.query(models.Product).filter(
                func.lower(models.Product.slug) == new_slug.lower(),
                models.Product.id != pid).first()
            if not dup:
                if p.status == "published":  # keep old URL working
                    db.add(models.ProductSlugRedirect(old_slug=p.slug, product_id=p.id))
                p.slug = new_slug
    sections = payload.get("sections") or {}
    for key in PROFILE_JSON_FIELDS:
        if key in sections and isinstance(sections[key], (dict, list)):
            col = f"{key}_json"
            setattr(prof, col, json.dumps(sections[key])[:200000])
    if "needs_verification" in sections and isinstance(sections["needs_verification"], list):
        prof.needs_verification_json = json.dumps(sections["needs_verification"])
    # Manual edits move the pipeline back to review unless already approved.
    if prof.status in ("ai_generated", "failed", "pending"):
        prof.status = "needs_review"
    db.commit()
    db.refresh(prof)
    return {"product": _item_out(db, p, prof), "profile": _profile_out(prof)}


# ---------------------------------------------------------------------------
# Approve / publish (spec §10/§11: never auto-publish, approve before publish)
# ---------------------------------------------------------------------------

@router.post("/api/catalogue/products/{pid}/approve")
def catalogue_approve(pid: int, db: Session = Depends(get_db),
                      u=Depends(require_role("admin", "editor"))):
    p, prof = _get_product_profile(db, pid)
    if prof.status not in ("ai_generated", "needs_review", "approved"):
        raise HTTPException(409, f"Cannot approve from status '{prof.status}'. "
                                 "Run AI analysis first.")
    if not (p.seo_title or _loads(prof.seo_json, {}).get("title")):
        raise HTTPException(409, "Cannot approve: product has no SEO title. "
                                 "Generate or enter one first.")
    prof.status = "approved"
    prof.approved_at = NOW()
    prof.approved_by = u.email
    _apply_payload_to_product(p, prof, db, overwrite=True)
    db.commit()
    db.refresh(prof)
    return {"product": _item_out(db, p, prof), "profile": _profile_out(prof)}


@router.post("/api/catalogue/products/{pid}/publish")
def catalogue_publish(pid: int, db: Session = Depends(get_db),
                      u=Depends(require_role("admin", "editor"))):
    p, prof = _get_product_profile(db, pid)
    if prof.status != "approved":
        raise HTTPException(409, "Only approved products can be published. "
                                 "Review and approve the AI content first.")
    if not p.description and not p.short_description:
        raise HTTPException(409, "Cannot publish: product has no description.")
    p.status = "published"
    prof.status = "published"
    prof.published_at = NOW()
    db.commit()
    db.refresh(prof)
    return {"product": _item_out(db, p, prof), "profile": _profile_out(prof)}


@router.post("/api/catalogue/products/{pid}/unpublish")
def catalogue_unpublish(pid: int, db: Session = Depends(get_db),
                        u=Depends(require_role("admin", "editor"))):
    p, prof = _get_product_profile(db, pid)
    p.status = "draft"
    if prof.status == "published":
        prof.status = "approved"
    db.commit()
    db.refresh(prof)
    return {"product": _item_out(db, p, prof), "profile": _profile_out(prof)}


# ---------------------------------------------------------------------------
# Bulk actions (spec §10)
# ---------------------------------------------------------------------------

@router.post("/api/catalogue/bulk")
def catalogue_bulk(payload: dict, db: Session = Depends(get_db),
                   u=Depends(require_role("admin", "editor"))):
    rate_limit(f"cat-bulk:{u.email}", 15, 600)
    action = str(payload.get("action") or "").strip()
    ids = [int(i) for i in (payload.get("ids") or []) if str(i).isdigit()][:100]
    if action not in ("analyze", "approve", "publish", "unpublish",
                      "delete", "mark_review"):
        raise HTTPException(400, "action must be analyze, approve, publish, "
                                 "unpublish, delete or mark_review.")
    if not ids:
        raise HTTPException(400, "Provide product ids.")
    done, errors = 0, []
    for pid in ids:
        try:
            p = db.query(models.Product).filter(models.Product.id == pid).first()
            if not p:
                errors.append(f"{pid}: not found")
                continue
            prof = db.query(models.ProductSeoProfile).filter(
                models.ProductSeoProfile.product_id == pid).first()
            if not prof and action != "delete":
                prof = models.ProductSeoProfile(product_id=pid, status="pending")
                db.add(prof)
                db.commit()
                db.refresh(prof)
            if action == "analyze":
                _run_analysis(db, p, prof)
            elif action == "approve" and prof.status in ("ai_generated",
                                                          "needs_review", "approved"):
                prof.status = "approved"
                prof.approved_at = NOW()
                prof.approved_by = u.email
                _apply_payload_to_product(p, prof, db, overwrite=True)
                db.commit()
            elif action == "publish" and prof.status == "approved":
                p.status = "published"
                prof.status = "published"
                prof.published_at = NOW()
                db.commit()
            elif action == "unpublish":
                p.status = "draft"
                if prof.status == "published":
                    prof.status = "approved"
                db.commit()
            elif action == "mark_review" and prof:
                if prof.status in ("pending", "ai_generated", "failed"):
                    prof.status = "needs_review"
                    db.commit()
            elif action == "delete":
                if db.query(models.RFQItem).filter(
                        models.RFQItem.product_id == pid).first():
                    errors.append(f"{pid}: referenced by RFQs — archive instead")
                    continue
                for tbl in (models.ProductImage, models.ProductVariant,
                            models.ProductSpec, models.ProductCollection,
                            models.ProductSeoProfile):
                    db.query(tbl).filter(tbl.product_id == pid).delete()
                db.delete(p)
                db.commit()
            else:
                errors.append(f"{pid}: action not allowed from current status")
            done += 1
        except Exception as e:  # noqa: BLE001 — per-item isolation
            db.rollback()
            errors.append(f"{pid}: {type(e).__name__}: {str(e)[:120]}")
    return {"requested": len(ids), "done": done, "errors": errors}


# ---------------------------------------------------------------------------
# Delete single product (spec §10)
# ---------------------------------------------------------------------------

@router.delete("/api/catalogue/products/{pid}")
def catalogue_delete(pid: int, db: Session = Depends(get_db),
                     u=Depends(require_role("admin"))):
    p = db.query(models.Product).filter(models.Product.id == pid).first()
    if not p:
        raise HTTPException(404, "Product not found")
    if db.query(models.RFQItem).filter(models.RFQItem.product_id == pid).first():
        raise HTTPException(409, "Product is referenced by RFQs. Archive it instead.")
    for tbl in (models.ProductImage, models.ProductVariant, models.ProductSpec,
                models.ProductCollection, models.ProductSeoProfile):
        db.query(tbl).filter(tbl.product_id == pid).delete()
    db.delete(p)
    db.commit()
    return {"deleted": pid}


# ---------------------------------------------------------------------------
# Google SERP preview + copy blocks (spec §11)
# ---------------------------------------------------------------------------

@router.get("/api/catalogue/products/{pid}/preview")
def catalogue_preview(pid: int, db: Session = Depends(get_db),
                      u=Depends(current_user)):
    p, prof = _get_product_profile(db, pid)
    seo = _loads(prof.seo_json, {})
    desc = _loads(prof.descriptions_json, {})
    keywords = _loads(prof.keywords_json, {})
    schema = _loads(prof.schema_json, {})
    base = settings.PUBLIC_SITE_URL.rstrip("/")
    canonical = f"{base}/products/{p.slug}"
    return {
        "google_preview": {
            "title": (p.seo_title or seo.get("title") or p.name)[:65],
            "url": canonical,
            "description": (p.seo_description or seo.get("meta_description") or "")[:165],
        },
        "copy_blocks": {
            "indiamart_description": desc.get("indiamart", ""),
            "b2b_description": desc.get("b2b", ""),
            "seo_keywords": {
                "primary": keywords.get("primary", ""),
                "all": [keywords.get("primary", "")]
                       + [k for group in ("secondary", "long_tail", "buyer_intent",
                                          "manufacturer", "supplier", "exporter",
                                          "wholesale", "bulk_order", "country_specific")
                          for k in (keywords.get(group) or [])],
            },
            "image_alt_texts": [f.get("alt_text", "") for f in
                                _loads(prof.image_seo_json, [])],
        },
        "json_ld": {k: v for k, v in schema.items() if v},
        "note": "Preview only. Content becomes public after approve + publish.",
    }



