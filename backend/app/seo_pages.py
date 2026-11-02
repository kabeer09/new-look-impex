"""Admin-configurable SEO metadata for static pages (§6 SEOPage).

The public site reads these to emit unique titles, meta descriptions and
canonical URLs for the homepage, /wholesale, /export, regional pages, etc.,
without a code deploy. Admin CRUD is role-protected.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from . import models
from .auth import current_user, require_role
from .database import get_db
from .schemas import SeoPageIn

router = APIRouter()


def _out(p: models.SeoPage) -> dict:
    return {
        "id": p.id, "path": p.path, "title": p.title or "",
        "meta_description": p.meta_description or "",
        "canonical_url": p.canonical_url or "",
        "og_image_url": p.og_image_url or "",
        "published": bool(p.published),
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


# ---------------- PUBLIC ----------------

@router.get("/api/public/seo-pages")
def public_seo_pages(db: Session = Depends(get_db)):
    """Published page metadata keyed by path (frontend looks up by pathname)."""
    rows = db.query(models.SeoPage).filter(models.SeoPage.published == True).all()  # noqa: E712
    return {"items": [_out(p) for p in rows]}


@router.get("/api/public/seo-pages/{path:path}")
def public_seo_page(path: str, db: Session = Depends(get_db)):
    p = db.query(models.SeoPage).filter(
        func.lower(models.SeoPage.path) == path.strip().lower()).first()
    if not p or not p.published:
        raise HTTPException(404, "Page metadata not found")
    return _out(p)


# ---------------- ADMIN ----------------

@router.get("/api/seo-pages")
def list_seo_pages(db: Session = Depends(get_db), u=Depends(current_user)):
    rows = db.query(models.SeoPage).order_by(models.SeoPage.path).all()
    return {"total": len(rows), "items": [_out(p) for p in rows]}


@router.post("/api/seo-pages", status_code=201)
def create_seo_page(body: SeoPageIn, db: Session = Depends(get_db),
                    u=Depends(require_role("admin", "editor"))):
    path = body.path.strip().strip("/").lower()
    if not path:
        raise HTTPException(400, "Path is required (e.g. 'wholesale' or 'au').")
    if db.query(models.SeoPage).filter(func.lower(models.SeoPage.path) == path).first():
        raise HTTPException(409, "A page with this path already exists.")
    p = models.SeoPage(path=path, title=body.title[:512],
                       meta_description=body.meta_description[:1024],
                       canonical_url=body.canonical_url[:1024],
                       og_image_url=body.og_image_url[:1024],
                       published=body.published)
    db.add(p); db.commit(); db.refresh(p)
    return _out(p)


@router.put("/api/seo-pages/{pid}")
def update_seo_page(pid: int, body: SeoPageIn, db: Session = Depends(get_db),
                    u=Depends(require_role("admin", "editor"))):
    p = db.query(models.SeoPage).filter(models.SeoPage.id == pid).first()
    if not p:
        raise HTTPException(404, "Page not found")
    path = body.path.strip().strip("/").lower()
    if path and path != p.path:
        if db.query(models.SeoPage).filter(func.lower(models.SeoPage.path) == path,
                                           models.SeoPage.id != pid).first():
            raise HTTPException(409, "A page with this path already exists.")
        p.path = path
    p.title = body.title[:512]
    p.meta_description = body.meta_description[:1024]
    p.canonical_url = body.canonical_url[:1024]
    p.og_image_url = body.og_image_url[:1024]
    p.published = body.published
    db.commit(); db.refresh(p)
    return _out(p)


@router.delete("/api/seo-pages/{pid}")
def delete_seo_page(pid: int, db: Session = Depends(get_db),
                    u=Depends(require_role("admin", "editor"))):
    p = db.query(models.SeoPage).filter(models.SeoPage.id == pid).first()
    if not p:
        raise HTTPException(404, "Page not found")
    db.delete(p); db.commit()
    return {"deleted": pid}
