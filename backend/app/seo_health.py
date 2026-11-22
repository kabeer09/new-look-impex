"""Read-only SEO health scan for the admin dashboard.

Bridges the gaps in Phase 8 of the international SEO plan:
  - missing metadata detection
  - duplicate title detection
  - broken link reports
  - internal link recommendations

Everything is computed from the live database and a bounded crawl of the
public site. Nothing is written, nothing is auto-published, and no search
volume, ranking or traffic numbers are invented — those only come from an
authorised Search Console integration (/api/seo/performance).
"""
from __future__ import annotations

from collections import defaultdict
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from . import models
from .auth import current_user
from .config import settings
from .database import get_db

router = APIRouter()

# Public site base for the broken-link crawl. Always use the canonical
# production host declared in the site metadata/sitemap; the configured
# PUBLIC_SITE_URL is a dev placeholder (localhost / vercel preview / example)
# in this repo and must never be probed as if it were the live site.
SITE = "https://www.newlookimpex.store"


def _norm(title: str | None) -> str:
    return " ".join((title or "").strip().lower().split())


def _duplicate_titles(db: Session) -> list[dict]:
    """Titles shared by more than one indexable record (cannibalisation risk)."""
    seen: dict[str, list[str]] = defaultdict(list)
    queries = (
        (models.SeoPage.title, "seo_page", lambda r: r.path, None),
        (models.Category.seo_title, "category", lambda r: f"/categories/{r.slug}", "published"),
        (models.Collection.seo_title, "collection", lambda r: f"/collections/{r.slug}", "published"),
        (models.Product.seo_title, "product", lambda r: f"/products/{r.slug}", "published"),
    )
    for column, kind, url_fn, status_filter in queries:
        # Fetch full rows so we can build the path from the same record.
        model = {
            "seo_page": models.SeoPage, "category": models.Category,
            "collection": models.Collection, "product": models.Product,
        }[kind]
        for row in db.query(model).all():
            if status_filter and getattr(row, "status", status_filter) != status_filter:
                continue
            if getattr(row, "published", True) is False:
                continue
            title = _norm(getattr(row, "seo_title", None) if kind != "seo_page" else row.title)
            if not title:
                continue
            seen[title].append(f"{kind}:{url_fn(row)}")
    out = []
    for title, refs in seen.items():
        if len(refs) > 1:
            out.append({"title": title[:120], "count": len(refs), "references": refs[:12]})
    out.sort(key=lambda x: -x["count"])
    return out[:50]


def _missing_metadata(db: Session) -> dict:
    """Published/indexable records that lack a title or description."""
    products = db.query(models.Product).filter(models.Product.status == "published").all()
    categories = db.query(models.Category).filter(models.Category.status == "published").all()
    collections = db.query(models.Collection).filter(models.Collection.status == "published").all()
    pages = db.query(models.SeoPage).filter(models.SeoPage.published.is_(True)).all()

    def missing(obj, *fields):
        return [f for f in fields if not (getattr(obj, f, "") or "").strip()]

    return {
        "products": [
            {"id": p.id, "name": p.name, "slug": p.slug,
             "missing": missing(p, "seo_title", "seo_description", "short_description")}
            for p in products if missing(p, "seo_title", "seo_description")
        ][:100],
        "categories": [
            {"id": c.id, "name": c.name, "slug": c.slug,
             "missing": missing(c, "seo_title", "seo_description")}
            for c in categories if missing(c, "seo_title", "seo_description")
        ][:100],
        "collections": [
            {"id": c.id, "name": c.name, "slug": c.slug,
             "missing": missing(c, "seo_title", "seo_description")}
            for c in collections if missing(c, "seo_title", "seo_description")
        ][:100],
        "seo_pages": [
            {"id": p.id, "path": p.path,
             "missing": missing(p, "title", "meta_description")}
            for p in pages if missing(p, "title", "meta_description")
        ][:100],
    }


def _internal_link_suggestions(db: Session) -> list[dict]:
    """Published products with no category or collection association — these
    are the pages least likely to be discovered through internal links."""
    orphans = db.query(models.Product).filter(
        models.Product.status == "published",
        models.Product.category_id.is_(None),
    ).limit(50).all()
    return [
        {"type": "product", "slug": p.slug, "name": p.name,
         "suggestion": "Assign a category or collection, then link from that listing page."}
        for p in orphans
    ]


def _broken_links(paths: list[str], timeout: float) -> list[dict]:
    """Live HEAD/GET check of a bounded list of local paths. Only reports
    statuses actually observed; never guesses."""
    results = []
    seen = set()
    for path in paths:
        if not path or not path.startswith("/") or path in seen:
            continue
        if any(path.startswith(p) for p in ("/admin", "/api/", "/_next")):
            continue  # private / internal — not public SEO links
        seen.add(path)
        url = SITE + path
        try:
            r = httpx.head(url, timeout=timeout, follow_redirects=True)
            if r.status_code == 405:  # some hosts reject HEAD
                r = httpx.get(url, timeout=timeout, follow_redirects=True)
            status = r.status_code
        except Exception:
            status = None
        if status is None or status >= 400:
            results.append({"path": path, "status": status})
        if len(seen) >= 60:  # bounded crawl
            break
    return results


@router.get("/api/seo/health")
def seo_health(db: Session = Depends(get_db), u=Depends(current_user)):
    """Read-only scan: missing metadata, duplicate titles, link suggestions."""
    return {
        "site": SITE,
        "duplicate_titles": _duplicate_titles(db),
        "missing_metadata": _missing_metadata(db),
        "internal_link_suggestions": _internal_link_suggestions(db),
        "note": "Counts come from the live catalogue. Search volume, rankings and traffic require an authorised Search Console integration.",
    }


@router.post("/api/seo/broken-links")
def seo_broken_links(
    body: dict,
    db: Session = Depends(get_db),
    u=Depends(current_user),
    timeout: float = Query(8.0, ge=1, le=20),
):
    """Check a bounded list of public paths supplied by the admin UI.
    Body: {"paths": ["/about", ...]} — returns only paths that failed."""
    paths = body.get("paths") or []
    if not isinstance(paths, list):
        paths = []
    return {"checked": len([p for p in paths if isinstance(p, str) and p.startswith("/")]),
            "broken": _broken_links([p for p in paths if isinstance(p, str)], timeout),
            "site": SITE}
