"""Product / category / collection APIs — public browsing + admin CRUD."""
from __future__ import annotations
import csv
import io
import json

# Cache for public products (module-level)
import time as _time
_PUBLIC_CACHE: dict = {}
_CACHE_TTL = 60  # seconds

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Form, HTTPException, Query, Request, UploadFile, File
from fastapi.responses import PlainTextResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from . import models
from . import campaigns as nli_campaigns
from .auth import current_user, require_role, rate_limit
from .email import (campaign_email_html, campaign_email_text, email_configured,
                    send_customer_ack, send_campaign_batch, send_email,
                    send_newsletter_welcome)
from .database import get_db
from .media_store import delete_file, save_file
from .schemas import (CategoryIn, CollectionIn, ImagePatch, ProductIn, ProductPatch,
                      SpecIn, VariantIn)
from .text import slugify
from . import media_store

router = APIRouter()

NOW = lambda: datetime.now(timezone.utc).replace(tzinfo=None)  # noqa: E731


# ---------------- helpers ----------------

def _product_out(p: models.Product, db: Session, public: bool = False) -> dict:
    cat = None
    if p.category_id:
        c = db.query(models.Category).filter(models.Category.id == p.category_id).first()
        if c:
            cat = {"id": c.id, "name": c.name, "slug": c.slug}
    img = db.query(models.ProductImage).filter(
        models.ProductImage.product_id == p.id).order_by(
        models.ProductImage.is_primary.desc(), models.ProductImage.sort_order).first()
    variants = [{"id": v.id, "name": v.name, "sku": v.sku, "price": v.price,
                 "moq": v.moq} for v in db.query(models.ProductVariant).filter(
        models.ProductVariant.product_id == p.id).order_by(models.ProductVariant.sort_order).all()]
    specs = [{"key": s.key, "value": s.value} for s in db.query(models.ProductSpec).filter(
        models.ProductSpec.product_id == p.id).all()]
    images = [{"id": im.id, "url": im.url, "alt_text": im.alt_text,
               "source": im.source or "", "permission": im.permission or "",
               "is_concept": bool(im.is_concept)} for im in
              db.query(models.ProductImage).filter(models.ProductImage.product_id == p.id)
              .order_by(models.ProductImage.is_primary.desc(), models.ProductImage.sort_order).all()]
    colls = [{"id": cl.id, "name": cl.name, "slug": cl.slug} for cl in
             db.query(models.Collection).join(models.ProductCollection,
                                              models.ProductCollection.collection_id == models.Collection.id)
             .filter(models.ProductCollection.product_id == p.id).all()]
    out = {
        "id": p.id, "name": p.name, "slug": p.slug,
        "external_product_id": p.external_product_id or "",
        "short_description": p.short_description, "description": p.description,
        "category": cat, "category_id": p.category_id,
        "material": p.material, "capacity": p.capacity or "",
        "finish": p.finish, "color": p.color,
        "dimensions": p.dimensions, "weight": p.weight, "sku": p.sku,
        "tags": json.loads(p.tags or "[]"),
        "moq": p.moq, "lead_time": p.lead_time, "packaging_info": p.packaging_info,
        "price": p.price, "currency": p.currency, "price_on_request": p.price_on_request,
        "price_visibility": p.price_visibility or "on_request",
        "stock_status": p.stock_status or "",
        "featured": p.featured, "sort_order": p.sort_order, "status": p.status,
        "seo_title": p.seo_title, "seo_description": p.seo_description,
        "source_url": p.source_url or "",
        "variants": variants, "specifications": specs, "images": images,
        "collections": colls,
        "image": images[0] if images else None,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }
    if public and p.status != "published":
        out["status"] = "published"  # public detail only served for published; never leak drafts
    return out


# ---------------- PUBLIC: product reviews ----------------
@router.get("/api/public/products/{slug}/reviews")
def public_reviews(slug: str, db: Session = Depends(get_db)):
    p = db.query(models.Product).filter(func.lower(models.Product.slug) == slug.strip().lower()).first()
    if not p:
        raise HTTPException(404, "Product not found")
    rows = db.query(models.ProductReview).filter(
        models.ProductReview.product_id == p.id,
        models.ProductReview.status == "approved").order_by(models.ProductReview.created_at.desc()).all()
    items = [{"id": r.id, "name": r.reviewer_name, "rating": r.rating,
              "title": r.title, "body": r.body, "date": r.created_at.isoformat() if r.created_at else None}
             for r in rows]
    avg = (sum(r.rating for r in rows) / len(rows)) if rows else 0
    return {"product_id": p.id, "count": len(rows), "average": round(avg, 1), "items": items}


@router.post("/api/public/products/{slug}/reviews", status_code=201)
def submit_review(slug: str, body: dict, db: Session = Depends(get_db)):
    p = db.query(models.Product).filter(func.lower(models.Product.slug) == slug.strip().lower()).first()
    if not p:
        raise HTTPException(404, "Product not found")
    name = (body.get("name") or "").strip()
    rating = int(body.get("rating") or 0)
    if not name or rating < 1 or rating > 5:
        raise HTTPException(400, "Name and rating (1-5) are required")
    r = models.ProductReview(
        product_id=p.id, reviewer_name=name[:255],
        reviewer_email=(body.get("email") or "")[:255],
        rating=rating, title=(body.get("title") or "")[:512],
        body=(body.get("body") or "")[:2000], status="pending")
    db.add(r); db.commit(); db.refresh(r)
    return {"id": r.id, "status": "pending", "message": "Review submitted for moderation"}


# ---------------- PUBLIC: automated seasonal sale campaign ----------------
@router.get("/api/public/active-campaign")
def public_active_campaign(db: Session = Depends(get_db)):
    """Live seasonal campaign — rotates automatically by date (Halloween,
    Black Friday, Christmas, Mother's Day, …) and self-syncs its discount
    code into discount_codes. No manual work needed, ever."""
    camp = nli_campaigns.active_campaign()
    nli_campaigns.sync_if_changed(db, camp)
    return camp


# ---------------- ADMIN: preview / test-send a campaign email ----------------
@router.post("/api/admin/campaign/test-send")
def admin_campaign_test_send(to: str = Query(...), kind: str = Query("announcement"),
                             u=Depends(require_role("admin"))):
    """Send one copy of the current campaign email to a single address (preview)."""
    camp = nli_campaigns.active_campaign()
    sent_ok, failed, detail = send_campaign_batch(
        [to.strip().lower()], f"[PREVIEW] {camp['name']} — {camp['percent']}% OFF",
        campaign_email_html(camp, kind), campaign_email_text(camp, kind))
    return {"sent": sent_ok, "failed": failed, "detail": detail,
            "campaign": camp["code"], "kind": kind}


# ---------------- PUBLIC: discount code validation ----------------
@router.post("/api/public/discount/validate")
def validate_discount(body: dict, db: Session = Depends(get_db)):
    code = (body.get("code") or "").strip().upper()
    if not code:
        raise HTTPException(400, "Code required")
    d = db.query(models.DiscountCode).filter(func.upper(models.DiscountCode.code) == code).first()
    if not d or not d.is_active:
        raise HTTPException(404, "Invalid or inactive code")
    from datetime import datetime
    now = datetime.utcnow()
    if d.starts_at and now < d.starts_at:
        raise HTTPException(400, "Code not yet active")
    if d.expires_at and now > d.expires_at:
        raise HTTPException(400, "Code expired")
    if d.max_uses and d.used_count >= d.max_uses:
        raise HTTPException(400, "Code usage limit reached")
    return {"code": d.code, "type": d.discount_type, "value": d.discount_value,
            "description": d.description, "min_order_qty": d.min_order_qty}


# ---------------- ADMIN: discount codes ----------------
@router.get("/api/discounts")
def list_discounts(db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    rows = db.query(models.DiscountCode).order_by(models.DiscountCode.created_at.desc()).all()
    return {"items": [{"id": d.id, "code": d.code, "description": d.description,
                       "type": d.discount_type, "value": d.discount_value,
                       "min_order_qty": d.min_order_qty, "max_uses": d.max_uses,
                       "used_count": d.used_count, "is_active": d.is_active,
                       "starts_at": d.starts_at.isoformat() if d.starts_at else None,
                       "expires_at": d.expires_at.isoformat() if d.expires_at else None}
                      for d in rows]}


@router.post("/api/discounts", status_code=201)
def create_discount(body: dict, db: Session = Depends(get_db), u=Depends(require_role("admin"))):
    code = (body.get("code") or "").strip().upper()
    if not code:
        raise HTTPException(400, "Code required")
    if db.query(models.DiscountCode).filter(func.upper(models.DiscountCode.code) == code).first():
        raise HTTPException(409, "Code already exists")
    d = models.DiscountCode(
        code=code, description=(body.get("description") or "")[:512],
        discount_type=body.get("type") or "percent",
        discount_value=float(body.get("value") or 0),
        min_order_qty=int(body.get("min_order_qty") or 0),
        max_uses=int(body.get("max_uses") or 0),
        is_active=bool(body.get("is_active", True)))
    db.add(d); db.commit(); db.refresh(d)
    return {"id": d.id, "code": d.code}


@router.delete("/api/discounts/{did}")
def delete_discount(did: int, db: Session = Depends(get_db), u=Depends(require_role("admin"))):
    d = db.query(models.DiscountCode).filter(models.DiscountCode.id == did).first()
    if not d:
        raise HTTPException(404, "Not found")
    db.delete(d); db.commit()
    return {"deleted": True}


# ---------------- ADMIN: reviews ----------------
@router.get("/api/reviews")
def list_reviews(status: str = "", db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    qry = db.query(models.ProductReview)
    if status:
        qry = qry.filter(models.ProductReview.status == status)
    rows = qry.order_by(models.ProductReview.created_at.desc()).all()
    return {"items": [{"id": r.id, "product_id": r.product_id, "name": r.reviewer_name,
                       "rating": r.rating, "title": r.title, "body": r.body,
                       "status": r.status, "date": r.created_at.isoformat() if r.created_at else None}
                      for r in rows]}


@router.post("/api/reviews/{rid}/approve")
def approve_review(rid: int, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    r = db.query(models.ProductReview).filter(models.ProductReview.id == rid).first()
    if not r:
        raise HTTPException(404, "Not found")
    r.status = "approved"
    from datetime import datetime
    r.approved_at = datetime.utcnow()
    db.commit()
    return {"approved": True}


@router.post("/api/reviews/{rid}/reject")
def reject_review(rid: int, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    r = db.query(models.ProductReview).filter(models.ProductReview.id == rid).first()
    if not r:
        raise HTTPException(404, "Not found")
    r.status = "rejected"
    db.commit()
    return {"rejected": True}


@router.delete("/api/reviews/{rid}")
def delete_review(rid: int, db: Session = Depends(get_db), u=Depends(require_role("admin"))):
    r = db.query(models.ProductReview).filter(models.ProductReview.id == rid).first()
    if not r:
        raise HTTPException(404, "Not found")
    db.delete(r); db.commit()
    return {"deleted": True}


# ---------------- ADMIN: categories ----------------

@router.get("/api/categories")
def list_categories(db: Session = Depends(get_db), u=Depends(current_user)):
    rows = db.query(models.Category).order_by(models.Category.sort_order, models.Category.id).all()
    counts = dict(db.query(models.Product.category_id, func.count(models.Product.id))
                  .group_by(models.Product.category_id).all())
    items = [{"id": c.id, "name": c.name, "slug": c.slug, "description": c.description,
              "image_url": c.image_url, "parent_id": c.parent_id,
              "seo_title": c.seo_title, "seo_description": c.seo_description,
              "featured": c.featured, "sort_order": c.sort_order, "status": c.status,
              "product_count": counts.get(c.id, 0)} for c in rows]
    return {"total": len(items), "items": items}


@router.post("/api/categories", status_code=201)
def create_category(body: CategoryIn, db: Session = Depends(get_db),
                    u=Depends(require_role("admin", "editor"))):
    slug = slugify(body.slug or body.name)
    exists = db.query(models.Category).filter(func.lower(models.Category.slug) == slug.lower()).first()
    if exists:
        raise HTTPException(409, "Category slug already exists")
    c = models.Category(name=body.name.strip(), slug=slug, description=body.description,
                        image_url=body.image_url, parent_id=body.parent_id,
                        seo_title=body.seo_title, seo_description=body.seo_description,
                        featured=body.featured, sort_order=body.sort_order, status=body.status)
    db.add(c); db.commit(); db.refresh(c)
    return {"id": c.id, "slug": c.slug}


@router.put("/api/categories/{cid}")
def update_category(cid: int, body: CategoryIn, db: Session = Depends(get_db),
                    u=Depends(require_role("admin", "editor"))):
    c = db.query(models.Category).filter(models.Category.id == cid).first()
    if not c:
        raise HTTPException(404, "Category not found")
    if body.slug and slugify(body.slug) != c.slug:
        slug = slugify(body.slug)
        dup = db.query(models.Category).filter(
            func.lower(models.Category.slug) == slug.lower(),
            models.Category.id != cid).first()
        if dup:
            raise HTTPException(409, "Category slug already exists")
        c.slug = slug
    for field in ("name", "description", "image_url", "parent_id", "seo_title",
                  "seo_description", "featured", "sort_order", "status"):
        setattr(c, field, getattr(body, field))
    db.commit(); db.refresh(c)
    return {"id": c.id, "slug": c.slug}


@router.delete("/api/categories/{cid}")
def delete_category(cid: int, db: Session = Depends(get_db), u=Depends(require_role("admin"))):
    c = db.query(models.Category).filter(models.Category.id == cid).first()
    if not c:
        raise HTTPException(404, "Category not found")
    # products keep their data; category link is cleared
    db.query(models.Product).filter(models.Product.category_id == cid).update(
        {models.Product.category_id: None})
    db.delete(c); db.commit()
    return {"deleted": cid}


# ---------------- ADMIN: collections ----------------

@router.get("/api/collections")
def list_collections(db: Session = Depends(get_db), u=Depends(current_user)):
    rows = db.query(models.Collection).order_by(models.Collection.sort_order, models.Collection.id).all()
    counts = {}
    for pc in db.query(models.ProductCollection.collection_id, func.count(models.ProductCollection.product_id)) \
            .group_by(models.ProductCollection.collection_id).all():
        counts[pc[0]] = pc[1]
    items = [{"id": c.id, "name": c.name, "slug": c.slug, "description": c.description,
              "image_url": c.image_url, "seo_title": c.seo_title,
              "seo_description": c.seo_description, "featured": c.featured,
              "sort_order": c.sort_order, "status": c.status,
              "product_count": counts.get(c.id, 0)} for c in rows]
    return {"total": len(items), "items": items}


@router.post("/api/collections", status_code=201)
def create_collection(body: CollectionIn, db: Session = Depends(get_db),
                      u=Depends(require_role("admin", "editor"))):
    slug = slugify(body.slug or body.name)
    if db.query(models.Collection).filter(func.lower(models.Collection.slug) == slug.lower()).first():
        raise HTTPException(409, "Collection slug already exists")
    c = models.Collection(name=body.name.strip(), slug=slug, description=body.description,
                          image_url=body.image_url, seo_title=body.seo_title,
                          seo_description=body.seo_description, featured=body.featured,
                          sort_order=body.sort_order, status=body.status)
    db.add(c); db.commit(); db.refresh(c)
    return {"id": c.id, "slug": c.slug}


@router.put("/api/collections/{colid}")
def update_collection(colid: int, body: CollectionIn, db: Session = Depends(get_db),
                      u=Depends(require_role("admin", "editor"))):
    c = db.query(models.Collection).filter(models.Collection.id == colid).first()
    if not c:
        raise HTTPException(404, "Collection not found")
    if body.slug and slugify(body.slug) != c.slug:
        slug = slugify(body.slug)
        if db.query(models.Collection).filter(func.lower(models.Collection.slug) == slug.lower(),
                                              models.Collection.id != colid).first():
            raise HTTPException(409, "Collection slug already exists")
        c.slug = slug
    for field in ("name", "description", "image_url", "seo_title", "seo_description",
                  "featured", "sort_order", "status"):
        setattr(c, field, getattr(body, field))
    db.commit(); db.refresh(c)
    return {"id": c.id, "slug": c.slug}


@router.delete("/api/collections/{colid}")
def delete_collection(colid: int, db: Session = Depends(get_db), u=Depends(require_role("admin"))):
    c = db.query(models.Collection).filter(models.Collection.id == colid).first()
    if not c:
        raise HTTPException(404, "Collection not found")
    db.query(models.ProductCollection).filter(models.ProductCollection.collection_id == colid).delete()
    db.delete(c); db.commit()
    return {"deleted": colid}


@router.post("/api/collections/{colid}/products", status_code=201)
def collection_add_products(colid: int, payload: dict, db: Session = Depends(get_db),
                            u=Depends(require_role("admin", "editor"))):
    c = db.query(models.Collection).filter(models.Collection.id == colid).first()
    if not c:
        raise HTTPException(404, "Collection not found")
    ids = payload.get("product_ids", [])
    added = 0
    for pid in ids:
        exists = db.query(models.ProductCollection).filter(
            models.ProductCollection.collection_id == colid,
            models.ProductCollection.product_id == pid).first()
        if not exists and db.query(models.Product).filter(models.Product.id == pid).first():
            db.add(models.ProductCollection(collection_id=colid, product_id=pid))
            added += 1
    db.commit()
    return {"added": added}


@router.delete("/api/collections/{colid}/products/{pid}")
def collection_remove_product(colid: int, pid: int, db: Session = Depends(get_db),
                              u=Depends(require_role("admin", "editor"))):
    db.query(models.ProductCollection).filter(
        models.ProductCollection.collection_id == colid,
        models.ProductCollection.product_id == pid).delete()
    db.commit()
    return {"removed": pid}


# ---------------- ADMIN: products ----------------

def _save_product(p: models.Product, body: ProductIn, db: Session, is_new: bool) -> models.Product:
    for field in ("short_description", "description", "category_id", "material", "capacity",
                  "finish", "color", "dimensions", "weight", "sku", "moq", "lead_time",
                  "packaging_info", "price", "currency", "price_on_request", "featured",
                  "sort_order", "status", "seo_title", "seo_description", "stock_status"):
        setattr(p, field, getattr(body, field))
    p.name = body.name.strip()
    # Preserve the source-catalogue identifier so the record can be re-synced.
    p.external_product_id = (body.external_product_id or "").strip()[:255]
    # Normalise price visibility; keep the legacy bool in sync so the storefront
    # and old clients agree. "public" = price shown; otherwise price on request.
    # Backward compatible: clients that only send price_on_request still work —
    # an explicit price_on_request=False maps to public visibility.
    vis = (body.price_visibility or "").strip().lower()
    if vis not in ("public", "on_request", "hidden"):
        vis = "public" if not body.price_on_request else "on_request"
    p.price_visibility = vis
    p.price_on_request = vis != "public"
    p.tags = json.dumps([t.strip() for t in body.tags if t.strip()])
    old_slug = (p.slug or "").strip().lower() or None
    if is_new or not p.slug:
        p.slug = slugify(body.slug or body.name)
    elif (body.slug or "").strip() and slugify(body.slug) != p.slug:
        p.slug = slugify(body.slug)
    # Slug uniqueness — check BEFORE flush to avoid UNIQUE constraint violation.
    # For new products p.id is None; for updates exclude self by id.
    def _slug_taken(slug_val):
        q = db.query(models.Product).filter(func.lower(models.Product.slug) == slug_val.lower())
        if p.id is not None:
            q = q.filter(models.Product.id != p.id)
        return q.first() is not None
    if _slug_taken(p.slug):
        base = p.slug
        n = 2
        while _slug_taken(f"{base}-{n}"):
            n += 1
        p.slug = f"{base}-{n}"
    # Ensure the product row exists so related rows can reference p.id
    db.add(p)
    db.flush()
    # Permanent redirect history when an existing product's slug changes.
    if not is_new and old_slug and old_slug != p.slug.lower():
        if not db.query(models.ProductSlugRedirect).filter(
                func.lower(models.ProductSlugRedirect.old_slug) == old_slug).first():
            db.add(models.ProductSlugRedirect(old_slug=old_slug, product_id=p.id))
    # variants
    db.query(models.ProductVariant).filter(models.ProductVariant.product_id == p.id).delete()
    for v in body.variant_data:
        db.add(models.ProductVariant(product_id=p.id, name=v.name.strip(), sku=v.sku,
                                     price=v.price, moq=v.moq, sort_order=v.sort_order))
    # specs
    db.query(models.ProductSpec).filter(models.ProductSpec.product_id == p.id).delete()
    for s in body.spec_data:
        db.add(models.ProductSpec(product_id=p.id, key=s.key.strip(), value=s.value))
    # collections
    db.query(models.ProductCollection).filter(models.ProductCollection.product_id == p.id).delete()
    for cid in body.collection_ids:
        if db.query(models.Collection).filter(models.Collection.id == cid).first():
            db.add(models.ProductCollection(product_id=p.id, collection_id=cid))
    # image urls
    if body.image_urls:
        db.query(models.ProductImage).filter(models.ProductImage.product_id == p.id).delete()
        for i, url in enumerate(body.image_urls[:20]):
            db.add(models.ProductImage(product_id=p.id, url=url[:1024],
                                       alt_text=f"{p.name} image {i + 1}",
                                       is_primary=(i == 0), sort_order=i))
    db.commit()
    db.refresh(p)
    # ensure exactly one primary image
    if not db.query(models.ProductImage).filter(models.ProductImage.product_id == p.id,
                                                models.ProductImage.is_primary == True).first():  # noqa: E712
        first = db.query(models.ProductImage).filter(models.ProductImage.product_id == p.id) \
            .order_by(models.ProductImage.sort_order).first()
        if first:
            first.is_primary = True
            db.commit()
    return p


@router.get("/api/products")
def list_products(q: str = "", status: str = "", category_id: int | None = None,
                  featured: bool | None = None, page: int = Query(1, ge=1),
                  page_size: int = Query(20, ge=1, le=100),
                  db: Session = Depends(get_db), u=Depends(current_user)):
    qry = db.query(models.Product)
    if q:
        like = f"%{q}%"
        qry = qry.filter(
            func.lower(models.Product.name).like(func.lower(like))
            | func.lower(models.Product.sku).like(func.lower(like))
            | func.lower(models.Product.tags).like(func.lower(like)))
    if status:
        qry = qry.filter(models.Product.status == status)
    if category_id is not None:
        qry = qry.filter(models.Product.category_id == category_id)
    if featured is not None:
        qry = qry.filter(models.Product.featured == featured)
    total = qry.count()
    rows = qry.order_by(models.Product.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "page": page, "page_size": page_size,
            "items": [_product_out(p, db) for p in rows]}


@router.post("/api/products", status_code=201)
def create_product(body: ProductIn, db: Session = Depends(get_db),
                   u=Depends(require_role("admin", "editor"))):
    rate_limit(f"prod:{u.email}", 60, 60)
    slug = slugify(body.slug or body.name)
    p = models.Product(name=body.name.strip(), slug=slug)
    p = _save_product(p, body, db, is_new=True)
    return _product_out(p, db)


PRODUCT_CSV_FIELDS = ["external_product_id", "name", "slug", "short_description",
                      "description", "category", "material", "capacity", "finish",
                      "color", "dimensions", "weight", "sku", "tags", "moq",
                      "lead_time", "packaging_info", "price", "currency",
                      "price_visibility", "stock_status", "featured", "status",
                      "seo_title", "seo_description"]


@router.post("/api/products/import", status_code=201)
def import_products(payload: dict, db: Session = Depends(get_db),
                    u=Depends(require_role("admin", "editor"))):
    csv_text = payload.get("csv", "")
    if not csv_text.strip():
        raise HTTPException(400, "Provide {csv: '...'} content.")
    reader = csv.DictReader(io.StringIO(csv_text))
    created, updated, errors = 0, 0, []
    for i, row in enumerate(reader, start=2):
        name = (row.get("name") or "").strip()
        if not name:
            errors.append(f"row {i}: missing name"); continue
        try:
            price_raw = (row.get("price") or "").strip()
            price = float(price_raw) if price_raw else None
            cat_name = (row.get("category") or "").strip()
            category_id = None
            if cat_name:
                cat = db.query(models.Category).filter(
                    func.lower(models.Category.name) == cat_name.lower()).first()
                if cat:
                    category_id = cat.id
            slug = slugify(row.get("slug") or name)
            # Dedupe by preserved source identifier first (stable across renames),
            # then fall back to slug matching.
            ext_id = (row.get("external_product_id") or "").strip()
            existing = None
            if ext_id:
                existing = db.query(models.Product).filter(
                    models.Product.external_product_id == ext_id).first()
            if not existing:
                existing = db.query(models.Product).filter(
                    func.lower(models.Product.slug) == slug.lower()).first()
            tags = [t.strip() for t in (row.get("tags") or "").split(";") if t.strip()]
            price_visibility = (row.get("price_visibility") or "").strip().lower()
            if price_visibility not in ("public", "on_request", "hidden"):
                # legacy CSVs used a price_on_request boolean column
                price_on_request = (row.get("price_on_request") or "").lower() in ("", "true", "1", "yes")
                price_visibility = "on_request" if price_on_request else "public"
            body = ProductIn(
                name=name, slug=slug,
                external_product_id=(row.get("external_product_id") or "").strip(),
                short_description=row.get("short_description") or "",
                description=row.get("description") or "",
                category_id=category_id, material=row.get("material") or "",
                capacity=row.get("capacity") or "",
                finish=row.get("finish") or "", color=row.get("color") or "",
                dimensions=row.get("dimensions") or "", weight=row.get("weight") or "",
                sku=row.get("sku") or "", tags=tags, moq=row.get("moq") or "",
                lead_time=row.get("lead_time") or "", packaging_info=row.get("packaging_info") or "",
                price=price, currency=(row.get("currency") or "USD"),
                price_visibility=price_visibility,
                price_on_request=(price_visibility != "public"),
                stock_status=(row.get("stock_status") or "").strip().lower(),
                featured=(row.get("featured") or "").lower() in ("true", "1", "yes"),
                status=(row.get("status") or "draft").lower(),
                seo_title=row.get("seo_title") or "", seo_description=row.get("seo_description") or "")
            if existing:
                _save_product(existing, body, db, is_new=False)
                updated += 1
            else:
                p = models.Product(name=name, slug=slug)
                _save_product(p, body, db, is_new=True)
                created += 1
        except Exception as e:
            errors.append(f"row {i}: {type(e).__name__}: {str(e)[:120]}")
    return {"created": created, "updated": updated, "errors": errors}


# ---------------- CSV import workflow: template / preview / commit ----------------

PRODUCT_CSV_REQUIRED = ["name"]
PRODUCT_CSV_OPTIONAL = ["external_product_id", "slug", "short_description", "description",
                        "category", "material", "capacity", "finish", "color", "dimensions",
                        "weight", "sku", "tags", "moq", "lead_time", "packaging_info",
                        "price", "currency", "price_visibility", "stock_status", "featured",
                        "status", "seo_title", "seo_description"]


@router.get("/api/products/import/template")
def download_csv_template(u=Depends(require_role("admin", "editor"))):
    """Downloadable CSV template with all supported columns and one example row."""
    import csv as _csv
    import io as _io
    buf = _io.StringIO()
    w = _csv.writer(buf)
    w.writerow(PRODUCT_CSV_FIELDS)
    w.writerow(["LS-1001", "Hammered Copper Water Bottle", "hammered-copper-water-bottle",
                "Pure copper bottle with hammered finish.", "A handcrafted copper water bottle.",
                "Copper Bottles", "Copper", "1000 ml", "Hammered", "Copper", "26 cm x 8 cm",
                "250 g", "NLI-CCB-1001", "copper;bottle;wholesale", "50 pcs", "",
                "", "", "USD", "on_request", "in_stock", "false", "draft",
                "Hammered Copper Bottle Wholesale | New Look Impex",
                "Wholesale hammered copper water bottles from Moradabad, India."])
    return PlainTextResponse(buf.getvalue(), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=newlookimpex-product-template.csv"})


def _row_to_productin(row: dict, db: Session) -> tuple[ProductIn | None, list[str]]:
    """Convert one CSV row into a ProductIn, returning (body, errors)."""
    errs = []
    name = (row.get("name") or "").strip()
    if not name:
        # ProductIn requires a non-empty name, so return early with the error.
        return None, ["missing required field: name"]
    price = None
    price_raw = (row.get("price") or "").strip()
    if price_raw:
        try:
            price = float(price_raw)
        except ValueError:
            errs.append(f"invalid price: {price_raw!r} (must be a number)")
    category_id = None
    cat_name = (row.get("category") or "").strip()
    if cat_name:
        cat = db.query(models.Category).filter(
            func.lower(models.Category.name) == cat_name.lower()).first()
        if cat:
            category_id = cat.id
        else:
            errs.append(f"unknown category (will be left unassigned): {cat_name!r}")
    status = (row.get("status") or "draft").strip().lower()
    if status not in ("draft", "published", "archived"):
        errs.append(f"invalid status: {status!r} (use draft/published/archived)")
        status = "draft"
    price_visibility = (row.get("price_visibility") or "").strip().lower()
    if price_visibility not in ("public", "on_request", "hidden", ""):
        errs.append(f"invalid price_visibility: {price_visibility!r}")
        price_visibility = "on_request"
    if not price_visibility:
        price_on_request = (row.get("price_on_request") or "").lower() in ("", "true", "1", "yes")
        price_visibility = "on_request" if price_on_request else "public"
    tags = [t.strip() for t in (row.get("tags") or "").split(";") if t.strip()]
    body = ProductIn(
        name=name, slug=(row.get("slug") or name),
        external_product_id=(row.get("external_product_id") or "").strip(),
        short_description=row.get("short_description") or "",
        description=row.get("description") or "",
        category_id=category_id, material=row.get("material") or "",
        capacity=row.get("capacity") or "", finish=row.get("finish") or "",
        color=row.get("color") or "", dimensions=row.get("dimensions") or "",
        weight=row.get("weight") or "", sku=row.get("sku") or "", tags=tags,
        moq=row.get("moq") or "", lead_time=row.get("lead_time") or "",
        packaging_info=row.get("packaging_info") or "",
        price=price, currency=(row.get("currency") or "USD"),
        price_visibility=price_visibility, price_on_request=(price_visibility != "public"),
        stock_status=(row.get("stock_status") or "").strip().lower(),
        featured=(row.get("featured") or "").lower() in ("true", "1", "yes"),
        status=status,
        seo_title=row.get("seo_title") or "", seo_description=row.get("seo_description") or "")
    return body, errs


def _find_existing(db: Session, row: dict, body: ProductIn):
    """Locate an existing product by external id, then slug."""
    ext_id = (row.get("external_product_id") or "").strip()
    if ext_id:
        p = db.query(models.Product).filter(
            models.Product.external_product_id == ext_id).first()
        if p:
            return p
    slug = slugify(body.slug or body.name)
    return db.query(models.Product).filter(
        func.lower(models.Product.slug) == slug.lower()).first()


@router.post("/api/products/import/preview")
def preview_csv_import(payload: dict, db: Session = Depends(get_db),
                       u=Depends(require_role("admin", "editor"))):
    """Validate uploaded CSV rows and classify each as create / update / error.
    Nothing is written — the admin reviews before committing."""
    csv_text = payload.get("csv", "")
    if not csv_text.strip():
        raise HTTPException(400, "Provide {csv: '...'} content.")
    reader = csv.DictReader(io.StringIO(csv_text))
    fieldnames = reader.fieldnames or []
    unknown = [f for f in fieldnames if f not in PRODUCT_CSV_FIELDS]
    rows_out, counts = [], {"create": 0, "update": 0, "error": 0}
    seen_ext_ids: dict[str, int] = {}
    for i, row in enumerate(reader, start=2):
        body, errs = _row_to_productin(row, db)
        ext_id = (row.get("external_product_id") or "").strip()
        # duplicate external ids within the file itself
        if ext_id:
            if ext_id in seen_ext_ids:
                errs.append(f"duplicate external_product_id {ext_id!r} (also on row {seen_ext_ids[ext_id]})")
            else:
                seen_ext_ids[ext_id] = i
        action = "error"
        existing = None
        if not any(e.startswith("missing required") or e.startswith("invalid ") for e in errs):
            existing = _find_existing(db, row, body)
            action = "update" if existing else "create"
        # hard errors (missing name / invalid price/status) => error bucket
        hard = any(e.startswith("missing required") or e.startswith("invalid price")
                   or e.startswith("invalid status") or e.startswith("invalid price_visibility")
                   or e.startswith("duplicate external") for e in errs)
        if hard:
            action = "error"
            counts["error"] += 1
        elif existing:
            counts["update"] += 1
        else:
            counts["create"] += 1
        rows_out.append({
            "row": i, "action": action,
            "name": (row.get("name") or "").strip(),
            "external_product_id": ext_id,
            "slug": slugify(body.slug or body.name) if body else "",
            "existing_id": existing.id if existing else None,
            "status": body.status if body else "draft",
            "errors": errs,
        })
    preview_id = None
    if rows_out:
        imp = models.ProductImport(kind="csv", status="previewed",
                                   items_json=json.dumps(rows_out)[:200000],
                                   created_by=u.email)
        db.add(imp); db.commit(); db.refresh(imp)
        preview_id = imp.id
    return {"preview_id": preview_id, "fieldnames": fieldnames,
            "unknown_columns": unknown, "total_rows": len(rows_out),
            "counts": counts, "rows": rows_out,
            "note": "Nothing has been imported yet. Choose a mode and commit to apply."}


@router.post("/api/products/import/commit")
def commit_csv_import(payload: dict, db: Session = Depends(get_db),
                      u=Depends(require_role("admin", "editor"))):
    """Apply a reviewed CSV. Modes:
       - update_existing (default): update matched products, create new ones.
       - create_new_only: only create products that don't already exist.
       - update_only: only update matched products; skip new ones.
       auto_publish=false (default) forces imported rows to draft unless the CSV
       explicitly marks them published AND auto_publish is true."""
    csv_text = payload.get("csv", "")
    mode = (payload.get("mode") or "update_existing").strip()
    if mode not in ("update_existing", "create_new_only", "update_only"):
        raise HTTPException(400, "mode must be update_existing, create_new_only or update_only.")
    auto_publish = bool(payload.get("auto_publish", False))
    if not csv_text.strip():
        raise HTTPException(400, "Provide {csv: '...'} content.")
    reader = csv.DictReader(io.StringIO(csv_text))
    created, updated, skipped, errors = 0, 0, 0, []
    for i, row in enumerate(reader, start=2):
        body, errs = _row_to_productin(row, db)
        hard = [e for e in errs if e.startswith("missing required") or e.startswith("invalid ")]
        if hard or body is None:
            errors.append(f"row {i}: {'; '.join(hard) or 'invalid row'}")
            skipped += 1
            continue
        # Safety: never auto-publish unless explicitly enabled.
        if not auto_publish and body.status == "published":
            body.status = "draft"
        existing = _find_existing(db, row, body)
        try:
            if existing:
                if mode == "create_new_only":
                    skipped += 1
                    continue
                _save_product(existing, body, db, is_new=False)
                updated += 1
            else:
                if mode == "update_only":
                    skipped += 1
                    continue
                p = models.Product(name=body.name.strip(), slug=slugify(body.slug or body.name))
                _save_product(p, body, db, is_new=True)
                created += 1
        except Exception as e:
            errors.append(f"row {i}: {type(e).__name__}: {str(e)[:120]}")
            skipped += 1
    # log the import result (§5: log import results)
    db.add(models.ProductImport(kind="csv", status="saved" if not errors else "partial",
                                items_json=json.dumps({"mode": mode, "auto_publish": auto_publish,
                                                       "created": created, "updated": updated,
                                                       "skipped": skipped})[:20000],
                                error="; ".join(errors)[:2000],
                                created_by=u.email))
    db.commit()
    return {"created": created, "updated": updated, "skipped": skipped, "errors": errors,
            "mode": mode, "auto_publish": auto_publish}


@router.get("/api/products/export")
def export_products(db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=PRODUCT_CSV_FIELDS)
    w.writeheader()
    for p in db.query(models.Product).order_by(models.Product.id).limit(5000).all():
        cat = ""
        if p.category_id:
            c = db.query(models.Category).filter(models.Category.id == p.category_id).first()
            cat = c.name if c else ""
        w.writerow({
            "external_product_id": p.external_product_id or "",
            "name": p.name, "slug": p.slug, "short_description": p.short_description,
            "description": p.description, "category": cat, "material": p.material,
            "capacity": p.capacity or "", "finish": p.finish, "color": p.color,
            "dimensions": p.dimensions,
            "weight": p.weight, "sku": p.sku, "tags": ";".join(json.loads(p.tags or "[]")),
            "moq": p.moq, "lead_time": p.lead_time, "packaging_info": p.packaging_info,
            "price": p.price if p.price is not None else "", "currency": p.currency,
            "price_visibility": p.price_visibility or "on_request",
            "stock_status": p.stock_status or "",
            "featured": str(p.featured).lower(), "status": p.status,
            "seo_title": p.seo_title, "seo_description": p.seo_description})
    return PlainTextResponse(buf.getvalue(), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=products.csv"})


@router.get("/api/products/{pid}")
def get_product(pid: int, db: Session = Depends(get_db), u=Depends(current_user)):
    p = db.query(models.Product).filter(models.Product.id == pid).first()
    if not p:
        raise HTTPException(404, "Product not found")
    return _product_out(p, db)


@router.put("/api/products/{pid}")
def update_product(pid: int, body: ProductIn, db: Session = Depends(get_db),
                   u=Depends(require_role("admin", "editor"))):
    p = db.query(models.Product).filter(models.Product.id == pid).first()
    if not p:
        raise HTTPException(404, "Product not found")
    p = _save_product(p, body, db, is_new=False)
    return _product_out(p, db)


@router.patch("/api/products/{pid}")
def patch_product(pid: int, body: ProductPatch, db: Session = Depends(get_db),
                  u=Depends(require_role("admin", "editor"))):
    """Partial update of SEO/content fields only (name, slug, descriptions,
    meta tags). Fields that are absent or null are left untouched, and unlike
    PUT it never rebuilds variants, specs, collections or image rows — safe
    for bulk content edits. A slug change records a permanent redirect from
    the previous slug, exactly like PUT does."""
    p = db.query(models.Product).filter(models.Product.id == pid).first()
    if not p:
        raise HTTPException(404, "Product not found")

    if body.name is not None:
        name = body.name.strip()
        if not name:
            raise HTTPException(422, "name cannot be empty")
        p.name = name[:512]
    if body.short_description is not None:
        p.short_description = body.short_description
    if body.description is not None:
        p.description = body.description
    if body.seo_title is not None:
        p.seo_title = body.seo_title.strip()[:255]
    if body.seo_description is not None:
        p.seo_description = body.seo_description.strip()[:512]

    if body.slug is not None and body.slug.strip():
        new_slug = slugify(body.slug)
        if new_slug and new_slug != p.slug:
            def _slug_taken(slug_val: str) -> bool:
                q = db.query(models.Product).filter(
                    func.lower(models.Product.slug) == slug_val.lower())
                return q.filter(models.Product.id != p.id).first() is not None

            if _slug_taken(new_slug):
                base, n = new_slug, 2
                while _slug_taken(f"{base}-{n}"):
                    n += 1
                new_slug = f"{base}-{n}"
            old_slug = (p.slug or "").strip().lower() or None
            p.slug = new_slug
            db.flush()
            if old_slug and not db.query(models.ProductSlugRedirect).filter(
                    func.lower(models.ProductSlugRedirect.old_slug) == old_slug).first():
                db.add(models.ProductSlugRedirect(old_slug=old_slug, product_id=p.id))

    db.commit()
    db.refresh(p)
    return _product_out(p, db)


@router.patch("/api/products/{pid}/images/{image_id}")
def patch_product_image(pid: int, image_id: int, body: ImagePatch,
                        db: Session = Depends(get_db),
                        u=Depends(require_role("admin", "editor"))):
    """Update a product image's alt text only. Null keeps the current value."""
    img = db.query(models.ProductImage).filter(
        models.ProductImage.id == image_id,
        models.ProductImage.product_id == pid).first()
    if not img:
        raise HTTPException(404, "Image not found")
    if body.alt_text is not None:
        img.alt_text = body.alt_text.strip()[:512]
        db.commit()
        db.refresh(img)
    return {"id": img.id, "product_id": img.product_id, "url": img.url,
            "alt_text": img.alt_text, "source": img.source or "",
            "permission": img.permission or "", "is_concept": bool(img.is_concept)}


@router.delete("/api/products/{pid}")
def delete_product(pid: int, db: Session = Depends(get_db), u=Depends(require_role("admin"))):
    p = db.query(models.Product).filter(models.Product.id == pid).first()
    if not p:
        raise HTTPException(404, "Product not found")
    if db.query(models.RFQItem).filter(models.RFQItem.product_id == pid).first():
        raise HTTPException(409,
                          "Product is referenced by RFQs. Archive it instead of deleting.")
    db.query(models.ProductImage).filter(models.ProductImage.product_id == pid).delete()
    db.query(models.ProductVariant).filter(models.ProductVariant.product_id == pid).delete()
    db.query(models.ProductSpec).filter(models.ProductSpec.product_id == pid).delete()
    db.query(models.ProductCollection).filter(models.ProductCollection.product_id == pid).delete()
    db.delete(p); db.commit()
    return {"deleted": pid}


@router.post("/api/products/{pid}/publish")
def publish_product(pid: int, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    p = _get_or_404(pid, db)
    p.status = "published"; db.commit()
    return {"id": p.id, "status": p.status}


@router.post("/api/products/{pid}/unpublish")
def unpublish_product(pid: int, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    p = _get_or_404(pid, db)
    p.status = "draft"; db.commit()
    return {"id": p.id, "status": p.status}


@router.post("/api/products/{pid}/archive")
def archive_product(pid: int, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    p = _get_or_404(pid, db)
    p.status = "archived"; db.commit()
    return {"id": p.id, "status": p.status}


def _get_or_404(pid: int, db: Session) -> models.Product:
    p = db.query(models.Product).filter(models.Product.id == pid).first()
    if not p:
        raise HTTPException(404, "Product not found")
    return p


# ---------------- product images (multipart upload) ----------------

@router.post("/api/products/{pid}/images", status_code=201)
async def upload_product_images(pid: int, files: list[UploadFile] = File(...),
                                rights_source: str = Form(""),
                                permission: str = Form(""),
                                db: Session = Depends(get_db),
                                u=Depends(require_role("admin", "editor"))):
    from .media_store import public_url, validate_rights
    try:
        rights = validate_rights(rights_source) if rights_source else ""
    except ValueError as e:
        raise HTTPException(400, str(e))
    p = _get_or_404(pid, db)
    saved = []
    for f in files:
        content = await f.read()
        try:
            meta = save_file(f.filename or "image.jpg", content, f.content_type or "",
                             label=p.slug)
        except ValueError as e:
            raise HTTPException(400, str(e))
        db.add(models.MediaFile(filename=meta["filename"],
                                original_name=meta.get("original_name", "")[:255],
                                content_type=meta.get("content_type", ""),
                                size=meta.get("size", 0),
                                has_thumb=meta.get("has_thumb", False),
                                source=rights,
                                permission=(permission or "")[:512]))
        existing = db.query(models.ProductImage).filter(models.ProductImage.product_id == pid).count()
        db.add(models.ProductImage(product_id=pid, url=public_url(meta["filename"]),
                                   alt_text=f"{p.name}", is_primary=(existing == 0),
                                   sort_order=existing, source=rights,
                                   permission=(permission or "")[:512]))
        saved.append({"url": public_url(meta["filename"]), "filename": meta["filename"]})
    db.commit()
    return {"images": saved}


@router.delete("/api/products/images/{iid}")
def delete_product_image(iid: int, db: Session = Depends(get_db),
                         u=Depends(require_role("admin", "editor"))):
    img = db.query(models.ProductImage).filter(models.ProductImage.id == iid).first()
    if not img:
        raise HTTPException(404, "Image not found")
    # Unlink only: the stored file and its media-library record are preserved,
    # so the image can be re-attached and originals are never lost.
    was_primary = bool(img.is_primary)
    pid = img.product_id
    db.delete(img)
    db.flush()
    if was_primary:
        nxt = db.query(models.ProductImage).filter(
            models.ProductImage.product_id == pid) \
            .order_by(models.ProductImage.sort_order).first()
        if nxt:
            nxt.is_primary = True
    db.commit()
    return {"deleted": iid}


# ---------------- PUBLIC catalogue browsing ----------------

@router.get("/api/public/products")

def public_products(q: str = "", category: str = "", material: str = "", style: str = "",
                    finish: str = "", has_moq: bool = False,
                    min_price: float | None = None, max_price: float | None = None,
                    sort: str = "newest", page: int = Query(1, ge=1),
                    page_size: int = Query(24, ge=1, le=100),
                    db: Session = Depends(get_db)):
    # Simple in-memory cache for repeated identical requests
    cache_key = f"pub:{q}:{category}:{material}:{style}:{finish}:{has_moq}:{min_price}:{max_price}:{sort}:{page}:{page_size}"
    now = _time.time()
    cached = _PUBLIC_CACHE.get(cache_key)
    if cached and (now - cached[0]) < _CACHE_TTL:
        return cached[1]
    qry = db.query(models.Product).filter(models.Product.status == "published")
    if q:
        like = f"%{q}%"
        qry = qry.filter(
            func.lower(models.Product.name).like(func.lower(like))
            | func.lower(models.Product.description).like(func.lower(like))
            | func.lower(models.Product.material).like(func.lower(like))
            | func.lower(models.Product.sku).like(func.lower(like))
            | func.lower(models.Product.tags).like(func.lower(like)))
    if category:
        slug = category.strip().lower()
        cat = db.query(models.Category).filter(func.lower(models.Category.slug) == slug).first()
        if not cat:
            cat = db.query(models.Category).filter(func.lower(models.Category.name) == slug.replace("-", " ")).first()
        if cat:
            qry = qry.filter(models.Product.category_id == cat.id)
        else:
            qry = qry.filter(models.Product.category_id == -1)  # unknown category → empty, not error
    if material:
        qry = qry.filter(func.lower(models.Product.material).like(f"%{material.lower()}%"))
    if style:
        like = f"%{style}%"
        qry = qry.filter(
            func.lower(models.Product.finish).like(func.lower(like))
            | func.lower(models.Product.tags).like(func.lower(like)))
    if finish:
        qry = qry.filter(func.lower(models.Product.finish).like(f"%{finish.lower()}%"))
    if has_moq:
        qry = qry.filter(models.Product.moq != "")
    if min_price is not None:
        qry = qry.filter(models.Product.price >= min_price)
    if max_price is not None:
        qry = qry.filter(models.Product.price <= max_price)
    if sort == "name":
        qry = qry.order_by(models.Product.name.asc())
    elif sort == "featured":
        qry = qry.order_by(models.Product.featured.desc(), models.Product.sort_order.asc())
    else:
        qry = qry.order_by(models.Product.id.desc())
    total = qry.count()
    rows = qry.offset((page - 1) * page_size).limit(page_size).all()
    has_price = [p for p in rows if p.price is not None]

    # Batch-fetch related data to avoid N+1 queries (critical for slow DB connections)
    if rows:
        pids = [p.id for p in rows]
        cat_ids = [p.category_id for p in rows if p.category_id]
        # categories
        cats = {c.id: c for c in db.query(models.Category).filter(models.Category.id.in_(cat_ids)).all()} if cat_ids else {}
        # images
        all_imgs = db.query(models.ProductImage).filter(models.ProductImage.product_id.in_(pids)).order_by(
            models.ProductImage.is_primary.desc(), models.ProductImage.sort_order).all()
        imgs_by_pid = {}
        for im in all_imgs:
            imgs_by_pid.setdefault(im.product_id, []).append(im)
        # collections
        coll_rows = db.query(models.ProductCollection, models.Collection).join(
            models.Collection, models.Collection.id == models.ProductCollection.collection_id).filter(
            models.ProductCollection.product_id.in_(pids)).all()
        colls_by_pid = {}
        for pc, cl in coll_rows:
            colls_by_pid.setdefault(pc.product_id, []).append(cl)
        # variants & specs
        variants = db.query(models.ProductVariant).filter(models.ProductVariant.product_id.in_(pids)).all()
        specs = db.query(models.ProductSpec).filter(models.ProductSpec.product_id.in_(pids)).all()
        variants_by_pid = {}
        for v in variants:
            variants_by_pid.setdefault(v.product_id, []).append(v)
        specs_by_pid = {}
        for s in specs:
            specs_by_pid.setdefault(s.product_id, []).append(s)

        items = []
        for p in rows:
            cat = cats.get(p.category_id) if p.category_id else None
            cat_out = {"id": cat.id, "name": cat.name, "slug": cat.slug} if cat else None
            imgs = imgs_by_pid.get(p.id, [])
            img_out = [{"id": im.id, "url": im.url, "alt_text": im.alt_text,
                        "source": im.source or "", "permission": im.permission or "",
                        "is_concept": bool(im.is_concept)} for im in imgs]
            v_out = [{"id": v.id, "name": v.name, "sku": v.sku, "price": v.price, "moq": v.moq}
                     for v in variants_by_pid.get(p.id, [])]
            s_out = [{"key": s.key, "value": s.value} for s in specs_by_pid.get(p.id, [])]
            c_out = [{"id": cl.id, "name": cl.name, "slug": cl.slug} for cl in colls_by_pid.get(p.id, [])]
            items.append({
                "id": p.id, "name": p.name, "slug": p.slug,
                "external_product_id": p.external_product_id or "",
                "short_description": p.short_description, "description": p.description,
                "category": cat_out, "category_id": p.category_id,
                "material": p.material, "capacity": p.capacity or "",
                "finish": p.finish, "color": p.color,
                "dimensions": p.dimensions, "weight": p.weight, "sku": p.sku,
                "tags": json.loads(p.tags or "[]"),
                "moq": p.moq, "lead_time": p.lead_time, "packaging_info": p.packaging_info,
                "price": p.price, "currency": p.currency, "price_on_request": p.price_on_request,
                "price_visibility": p.price_visibility or "on_request",
                "stock_status": p.stock_status or "",
                "featured": p.featured, "sort_order": p.sort_order, "status": p.status,
                "seo_title": p.seo_title, "seo_description": p.seo_description,
                "source_url": p.source_url or "",
                "variants": v_out, "specifications": s_out, "images": img_out,
                "collections": c_out,
                "image": img_out[0] if img_out else None,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "updated_at": p.updated_at.isoformat() if p.updated_at else None,
            })
    else:
        items = []

    result = {"total": total, "page": page, "page_size": page_size,
              "items": items,
              "price_data_available": bool(has_price)}
    _PUBLIC_CACHE[cache_key] = (now, result)
    # Evict old entries (keep cache small)
    if len(_PUBLIC_CACHE) > 50:
        oldest = min(_PUBLIC_CACHE.items(), key=lambda x: x[1][0])
        del _PUBLIC_CACHE[oldest[0]]
    return result


@router.get("/api/public/products/search/suggest")
def suggest(q: str = "", db: Session = Depends(get_db)):
    q = (q or "").strip()
    if len(q) < 2:
        return {"suggestions": []}
    like = f"%{q}%"
    names = db.query(models.Product.name).filter(
        models.Product.status == "published",
        func.lower(models.Product.name).like(func.lower(like))).limit(8).all()
    mats = db.query(models.Product.material).filter(
        models.Product.status == "published",
        func.lower(models.Product.material).like(func.lower(like))).limit(4).all()
    cats = db.query(models.Category.name).filter(
        func.lower(models.Category.name).like(func.lower(like))).limit(4).all()
    out = [n for (n,) in names] + [m for (m,) in mats if m] + [c for (c,) in cats]
    return {"suggestions": list(dict.fromkeys(out))[:10]}


@router.get("/api/public/products/{slug}")
def public_product_detail(slug: str, db: Session = Depends(get_db)):
    p = db.query(models.Product).filter(
        func.lower(models.Product.slug) == slug.strip().lower(),
        models.Product.status == "published").first()
    if not p:
        # Permanent redirect for renamed products (preserves rankings/links).
        redir = db.query(models.ProductSlugRedirect).filter(
            func.lower(models.ProductSlugRedirect.old_slug) == slug.strip().lower()).first()
        if redir:
            target = db.query(models.Product).filter(
                models.Product.id == redir.product_id,
                models.Product.status == "published").first()
            if target:
                from fastapi.responses import RedirectResponse
                return RedirectResponse(url=f"/api/public/products/{target.slug}",
                                        status_code=308)
        raise HTTPException(404, "Product not found")
    detail = _product_out(p, db, public=True)
    detail["canonical_slug"] = p.slug
    # related: same category or material, published, exclude self
    rel_q = db.query(models.Product).filter(models.Product.status == "published",
                                            models.Product.id != p.id)
    if p.category_id:
        rel_q = rel_q.filter(models.Product.category_id == p.category_id)
    elif p.material:
        rel_q = rel_q.filter(func.lower(models.Product.material) == p.material.lower())
    detail["related"] = [_product_out(r, db, public=True) for r in rel_q.limit(4).all()]
    return detail


@router.get("/api/public/categories")
def public_categories(db: Session = Depends(get_db)):
    HIDDEN_CATEGORIES = {"copper handicrafts", "brass handicrafts", "metal home décor", "metal home decor"}
    rows = db.query(models.Category).filter(
        models.Category.status == "published",
        ~func.lower(models.Category.name).in_(HIDDEN_CATEGORIES)) \
        .order_by(models.Category.sort_order, models.Category.id).all()
    items = []
    for c in rows:
        count = db.query(func.count(models.Product.id)).filter(
            models.Product.category_id == c.id, models.Product.status == "published").scalar() or 0
        items.append({"id": c.id, "name": c.name, "slug": c.slug,
                      "description": c.description, "image_url": c.image_url,
                      "seo_title": c.seo_title, "seo_description": c.seo_description,
                      "product_count": count})
    return {"total": len(items), "items": items}


@router.get("/api/public/categories/{slug}")
def public_category_detail(slug: str, page: int = Query(1, ge=1),
                           page_size: int = Query(24, ge=1, le=100),
                           db: Session = Depends(get_db)):
    c = db.query(models.Category).filter(
        func.lower(models.Category.slug) == slug.strip().lower(),
        models.Category.status == "published").first()
    if not c or c.name.strip().lower() in {"copper handicrafts", "brass handicrafts", "metal home décor", "metal home decor"}:
        raise HTTPException(404, "Category not found")
    qry = db.query(models.Product).filter(models.Product.category_id == c.id,
                                          models.Product.status == "published")
    total = qry.count()
    rows = qry.order_by(models.Product.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"id": c.id, "name": c.name, "slug": c.slug, "description": c.description,
            "seo_title": c.seo_title, "seo_description": c.seo_description,
            "total": total, "page": page, "page_size": page_size,
            "image_url": c.image_url,
            "items": [_product_out(p, db, public=True) for p in rows]}


@router.get("/api/public/collections")
def public_collections(db: Session = Depends(get_db)):
    rows = db.query(models.Collection).filter(models.Collection.status == "published") \
        .order_by(models.Collection.sort_order, models.Collection.id).all()
    items = []
    for c in rows:
        count = db.query(func.count(models.ProductCollection.product_id)).filter(
            models.ProductCollection.collection_id == c.id).scalar() or 0
        items.append({"id": c.id, "name": c.name, "slug": c.slug,
                      "description": c.description, "image_url": c.image_url,
                      "seo_title": c.seo_title, "seo_description": c.seo_description,
                      "product_count": count})
    return {"total": len(items), "items": items}


@router.get("/api/public/collections/{slug}")
def public_collection_detail(slug: str, page: int = Query(1, ge=1),
                             page_size: int = Query(24, ge=1, le=100),
                             db: Session = Depends(get_db)):
    c = db.query(models.Collection).filter(
        func.lower(models.Collection.slug) == slug.strip().lower(),
        models.Collection.status == "published").first()
    if not c:
        raise HTTPException(404, "Collection not found")
    qry = db.query(models.Product).join(models.ProductCollection,
                                        models.ProductCollection.product_id == models.Product.id) \
        .filter(models.ProductCollection.collection_id == c.id,
                models.Product.status == "published")
    total = qry.count()
    rows = qry.order_by(models.Product.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"id": c.id, "name": c.name, "slug": c.slug, "description": c.description,
            "seo_title": c.seo_title, "seo_description": c.seo_description,
            "total": total, "page": page, "page_size": page_size,
            "image_url": c.image_url,
            "items": [_product_out(p, db, public=True) for p in rows]}
