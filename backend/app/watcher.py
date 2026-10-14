"""Drop-folder auto-import watcher.

Workflow: the merchant drops product photos into
`INCOMING_DIR/products/<optional-category-slug>/` and banner images into
`INCOMING_DIR/banners/` (e.g. straight from VS Code). Every INCOMING_INTERVAL
seconds the watcher ingests new files:

- products → AI-analysed draft product (title, description, SEO, keywords,
  alt text) + media record with rights provenance. NEVER auto-published
  unless INCOMING_AUTO_PUBLISH=true. Unknowns stay null / "needs verification".
- banners → active home-hero banner record.

Processed files move to `processed/` (idempotency), failures to `failed/`
with the error recorded on the ProductImport row (visible in Admin → AI Import
→ history, retry by moving the file back).

Safety: image validation, 8 MB cap via media_store, per-scan cap, per-file
try/except (one bad file never stops the scan), rights default from
INCOMING_RIGHTS (validated — watcher refuses to start with an invalid value).

Limitation: works wherever the backend has filesystem access (local PC,
VPS, Docker). Ephemeral PaaS disks (Render free) cannot receive VS Code
drops — there, use Admin → Media / AI Import upload instead.
"""
from __future__ import annotations
import json
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import func

from . import models
from .catalog import _save_product
from .config import settings
from .database import SessionLocal
from .llm import llm_configured
from .media_store import MAX_BYTES, public_url, save_file, validate_rights
from .schemas import ProductIn
from .text import slugify

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
PER_SCAN_CAP = 20

# Status of the last scan (served by GET /api/admin/watcher).
LAST_RUN: dict = {"at": None, "products": 0, "banners": 0, "failed": 0,
                  "error": ""}


def incoming_root() -> Path:
    return Path(settings.INCOMING_DIR).expanduser()


def _pretty_name(stem: str) -> str:
    name = stem.replace("-", " ").replace("_", " ").strip()
    # drop trailing short hashes like "-a1b2c3d4"
    parts = name.split()
    if parts and len(parts[-1]) == 8 and all(c in "0123456789abcdef" for c in parts[-1].lower()):
        parts = parts[:-1]
    return " ".join(parts).strip().title() or "Untitled import"


def _iter_new_files(sub: str) -> list[Path]:
    root = incoming_root() / sub
    if not root.is_dir():
        return []
    files = [p for p in sorted(root.rglob("*"))
             if p.is_file() and p.suffix.lower() in IMAGE_EXTS
             and not p.name.startswith(".") and p.name.lower() != "thumbs.db"]
    return files[:PER_SCAN_CAP]


def _move(p: Path, dest_sub: str) -> None:
    dest = incoming_root() / dest_sub / p.name
    dest.parent.mkdir(parents=True, exist_ok=True)
    # avoid collisions
    if dest.exists():
        dest = dest.parent / f"{p.stem}-{int(time.time())}{p.suffix}"
    p.rename(dest)


def _match_category(db, file: Path, products_root: Path) -> int | None:
    try:
        rel = file.parent.relative_to(products_root)
        slug = str(rel).split("/")[0].strip().lower()
    except ValueError:
        return None
    if not slug or slug == ".":
        return None
    c = db.query(models.Category).filter(
        func.lower(models.Category.slug) == slug).first()
    return c.id if c else None


def _ai_suggest(image_bytes: bytes, mime: str, filename: str) -> tuple[dict, str]:
    """Same rules as the AI Import preview: AI vision when configured,
    filename-only fallback otherwise. Returns (suggestion, source)."""
    from .ai_import import (_suggestion_base, _finalise, _parse_ai_json,
                            _ai_source, VISION_PROMPT)
    from . import ai_import as _ai
    item = _suggestion_base()
    res = _ai.analyze_image(image_bytes, mime, VISION_PROMPT)
    parsed = _parse_ai_json(res.get("text", "")) if res.get("text") else None
    if parsed:
        for k in ("name", "description", "material", "finish", "color",
                  "dimensions", "seo_title", "seo_description", "slug", "alt_text"):
            if parsed.get(k):
                item[k] = str(parsed[k])[:1500]
        item["tags"] = [str(t)[:60] for t in (parsed.get("tags") or [])][:12]
        item["keywords"] = [str(t)[:120] for t in (parsed.get("keywords") or [])][:12]
        return _finalise(item), _ai_source()
    item["name"] = _pretty_name(Path(filename).stem)[:120]
    item["slug"] = slugify(item["name"])
    item["alt_text"] = item["name"]
    item["needs_verification"] = ["description", "material", "finish", "color",
                                  "dimensions", "seo_title", "seo_description"]
    return item, "rule-based (drop folder — verify all fields)"


def process_product_file(db, path: Path, products_root: Path, rights: str) -> str:
    """Ingest one product photo. Returns the created product slug."""
    content = path.read_bytes()
    if len(content) > MAX_BYTES:
        raise ValueError(f"File too large ({len(content)} bytes, max 8 MB).")
    mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
            "webp": "image/webp", "gif": "image/gif"}.get(path.suffix.lower().lstrip("."), "image/jpeg")
    meta = save_file(path.name, content, mime, label=path.stem)
    db.add(models.MediaFile(filename=meta["filename"],
                            original_name=path.name[:255],
                            content_type=meta.get("content_type", ""),
                            size=meta.get("size", 0),
                            has_thumb=meta.get("has_thumb", False),
                            source=rights,
                            permission="Auto-import: drop folder"))
    db.flush()
    item, source = _ai_suggest(content, mime, path.name)
    cat_id = _match_category(db, path, products_root)
    status = "published" if settings.INCOMING_AUTO_PUBLISH else "draft"
    body = ProductIn(
        name=str(item.get("name") or _pretty_name(path.stem))[:512],
        slug=str(item.get("slug") or "")[:512],
        short_description="", description=str(item.get("description") or ""),
        category_id=cat_id, material=str(item.get("material") or ""),
        finish=str(item.get("finish") or ""), color=str(item.get("color") or ""),
        dimensions=str(item.get("dimensions") or ""), weight="", sku="",
        tags=list(item.get("tags") or []), moq="", lead_time="",
        packaging_info="", price=None, currency="USD", price_on_request=True,
        featured=False, sort_order=0, status=status,
        seo_title=str(item.get("seo_title") or "")[:512],
        seo_description=str(item.get("seo_description") or "")[:1024],
        variant_data=[], spec_data=[], collection_ids=[], image_urls=[])
    p = models.Product(name=body.name, slug=slugify(body.slug or body.name))
    p = _save_product(p, body, db, is_new=True)
    db.add(models.ProductImage(product_id=p.id, url=public_url(meta["filename"]),
                               alt_text=str(item.get("alt_text") or p.name)[:512],
                               is_primary=True, sort_order=0,
                               source=rights, permission="Auto-import: drop folder"))
    db.add(models.ProductImport(kind="watch", filename=path.name,
                                rights_source=rights, category_id=cat_id,
                                status="saved",
                                items_json=json.dumps({"product_id": p.id,
                                                       "source": source})[:2000]))
    db.commit()
    return p.slug


def process_banner_file(db, path: Path, rights: str) -> str:
    content = path.read_bytes()
    if len(content) > MAX_BYTES:
        raise ValueError(f"File too large ({len(content)} bytes, max 8 MB).")
    mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
            "webp": "image/webp", "gif": "image/gif"}.get(path.suffix.lower().lstrip("."), "image/jpeg")
    meta = save_file(path.name, content, mime, label=path.stem)
    db.add(models.MediaFile(filename=meta["filename"],
                            original_name=path.name[:255],
                            content_type=meta.get("content_type", ""),
                            size=meta.get("size", 0),
                            has_thumb=meta.get("has_thumb", False),
                            source=rights,
                            permission="Auto-import: drop folder (banner)"))
    db.flush()
    title = _pretty_name(path.stem)
    max_sort = db.query(func.max(models.Banner.sort_order)).scalar() or 0
    b = models.Banner(placement="home_hero", title=title[:255], subtitle="",
                      image_url=public_url(meta["filename"]),
                      cta_text="Explore Our Collection", cta_link="/products",
                      sort_order=(max_sort or 0) + 1, is_active=True)
    db.add(b)
    db.add(models.ProductImport(kind="watch", filename=path.name,
                                rights_source=rights, status="saved",
                                items_json=json.dumps({"banner": title})[:2000]))
    db.commit()
    return title


def scan_once() -> dict:
    """One ingestion pass. Returns counts. Never raises on per-file errors."""
    counts = {"products": 0, "banners": 0, "failed": 0}
    try:
        rights = validate_rights(settings.INCOMING_RIGHTS)
    except ValueError as e:
        LAST_RUN.update({"at": _now(), "error": str(e), "products": 0,
                         "banners": 0, "failed": 0})
        return counts
    root = incoming_root()
    products_root = root / "products"
    banners_root = root / "banners"
    db = SessionLocal()
    try:
        for path in _iter_new_files("products"):
            try:
                process_product_file(db, path, products_root, rights)
                _move(path, "processed")
                counts["products"] += 1
            except Exception as e:
                db.rollback()
                db.add(models.ProductImport(kind="watch", filename=path.name,
                                            rights_source=settings.INCOMING_RIGHTS,
                                            status="failed",
                                            error=f"{type(e).__name__}: {str(e)[:500]}"))
                db.commit()
                try:
                    _move(path, "failed")
                except Exception:
                    pass
                counts["failed"] += 1
        for path in _iter_new_files("banners"):
            try:
                process_banner_file(db, path, rights)
                _move(path, "processed")
                counts["banners"] += 1
            except Exception as e:
                db.rollback()
                db.add(models.ProductImport(kind="watch", filename=path.name,
                                            rights_source=settings.INCOMING_RIGHTS,
                                            status="failed",
                                            error=f"{type(e).__name__}: {str(e)[:500]}"))
                db.commit()
                try:
                    _move(path, "failed")
                except Exception:
                    pass
                counts["failed"] += 1
    finally:
        db.close()
    LAST_RUN.update({"at": _now(), "error": "", **counts})
    return counts


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


_stop: threading.Event | None = None


def _loop() -> None:
    interval = max(int(settings.INCOMING_INTERVAL or 60), 10)
    while _stop is not None and not _stop.is_set():
        try:
            scan_once()
        except Exception:
            pass
        _stop.wait(interval)


def start_watcher() -> bool:
    """Start the background thread. Returns False when disabled."""
    global _stop
    if not settings.INCOMING_ENABLED:
        return False
    if _stop is not None:
        return True
    root = incoming_root()
    for sub in ("products", "banners", "processed", "failed"):
        (root / sub).mkdir(parents=True, exist_ok=True)
    _stop = threading.Event()
    t = threading.Thread(target=_loop, name="incoming-watcher", daemon=True)
    t.start()
    return True
