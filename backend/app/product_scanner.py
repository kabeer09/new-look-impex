"""Product-photo folder scanner (spec §3/§14).

Watches PRODUCT_SCAN_DIR (default: ./product, falling back to ./products —
the merchant's actual photo folder) for new product images:

- JPG / JPEG / PNG / WEBP support.
- Exact-duplicate detection by sha256; near-duplicate (same photo re-saved
  or resized) by 64-bit perceptual hash — near-duplicates are ATTACHED to the
  existing product as an extra gallery image instead of creating a new one,
  which is also how multi-photo products are grouped.
- New files become draft products with a pending ProductSeoProfile (never
  published automatically) plus media-store derivatives (800px thumb + WebP).
- ORIGINALS ARE NEVER MOVED, RENAMED OR DELETED. A hash registry
  (ProductScanFile) makes re-scans cheap and idempotent.
- Per-file error isolation: one bad file never stops the scan.
"""
from __future__ import annotations
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import func
from sqlalchemy.orm import Session

from . import models
from .catalogue_ai import BRAND, COMPANY
from .config import settings
from .database import SessionLocal
from .image_hash import hamming_distance, perceptual_hash, sha256_hex
from .media_store import MAX_BYTES, public_url, save_file
from .text import slugify

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
MIME = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
        "webp": "image/webp"}

# Status of the last scan (served by GET /api/catalogue/status).
LAST_RUN: dict = {"at": None, "scanned": 0, "created": 0, "attached": 0,
                  "duplicates": 0, "failed": 0, "error": "", "dir": ""}


def scan_root() -> Path:
    """Resolve the scan directory: explicit setting, ./product, ./products."""
    configured = (settings.PRODUCT_SCAN_DIR or "").strip()
    if configured:
        return Path(configured).expanduser()
    for candidate in (Path("./product"), Path("./products")):
        if candidate.is_dir():
            return candidate
    return Path("./product")


def _pretty_name(stem: str) -> str:
    """Readable product name from a filename stem.

    Strips camera-app noise: 'WhatsApp Image 2026-11-01 at 3.27.24 PM (1)'
    -> 'Product 2026-11-01 3.27.24 PM' would be useless, so when the stem is
    a generic camera export we fall back to a neutral working title that the
    AI analysis will replace."""
    name = stem.replace("-", " ").replace("_", " ").strip()
    parts = name.split()
    # drop trailing short hashes like "-a1b2c3d4"
    if parts and len(parts[-1]) == 8 and all(c in "0123456789abcdef" for c in parts[-1].lower()):
        parts = parts[:-1]
    name = " ".join(parts).strip()
    low = name.lower()
    generic = (low.startswith("whatsapp image") or low.startswith("img-")
               or low.startswith("img ") or low.startswith("dsc")
               or low.startswith("screenshot") or low.startswith("photo ")
               or low.startswith("untitled"))
    if generic or not name:
        return "New catalogue product (pending analysis)"
    return name.title()[:120]


def _iter_images(root: Path) -> list[Path]:
    if not root.is_dir():
        return []
    return [p for p in sorted(root.rglob("*"))
            if p.is_file() and p.suffix.lower() in IMAGE_EXTS
            and not p.name.startswith(".") and p.name.lower() != "thumbs.db"]


def _next_product_slug(db: Session, base: str) -> str:
    slug = slugify(base)
    n = 2
    while db.query(models.Product).filter(
            func.lower(models.Product.slug) == slug.lower()).first():
        slug = f"{slugify(base)}-{n}"
        n += 1
    return slug


def _register_media(db: Session, path: Path, content: bytes, mime: str,
                    rights: str) -> str:
    """Store the image in the media library (thumb + webp derivatives)."""
    meta = save_file(path.name, content, mime, label=path.stem)
    db.add(models.MediaFile(filename=meta["filename"],
                            original_name=path.name[:255],
                            content_type=meta.get("content_type", ""),
                            size=meta.get("size", 0),
                            has_thumb=meta.get("has_thumb", False),
                            source=rights,
                            permission="Product folder scan (original preserved)"))
    db.flush()
    return meta["filename"]


def _near_duplicate(db: Session, phash: str,
                    max_distance: int) -> models.ProductScanFile | None:
    """Find a registered image whose perceptual hash is within `max_distance`."""
    if not phash:
        return None
    candidates = (db.query(models.ProductScanFile)
                  .filter(models.ProductScanFile.phash != "",
                          models.ProductScanFile.product_id != None)  # noqa: E711
                  .limit(2000).all())
    best, best_dist = None, max_distance + 1
    for row in candidates:
        d = hamming_distance(phash, row.phash)
        if d < best_dist:
            best, best_dist = row, d
    return best if best_dist <= max_distance else None


def ingest_file(db: Session, path: Path, root: Path,
                rights: str) -> tuple[str, int | None]:
    """Register + ingest one image. Returns (result, product_id).

    result: created | attached | duplicate | skipped | failed
    """
    rel = str(path.relative_to(root))
    known = db.query(models.ProductScanFile).filter(
        models.ProductScanFile.rel_path == rel).first()
    if known:
        return "skipped", known.product_id

    content = path.read_bytes()
    if len(content) > MAX_BYTES:
        db.add(models.ProductScanFile(rel_path=rel, sha256="", original_name=path.name,
                                      size=len(content), status="failed",
                                      detail="File exceeds 8 MB media limit."))
        db.commit()
        return "failed", None
    digest = sha256_hex(content)
    phash = perceptual_hash(content)

    # Exact duplicate of a file we already processed?
    exact = db.query(models.ProductScanFile).filter(
        models.ProductScanFile.sha256 == digest,
        models.ProductScanFile.id != None).first()  # noqa: E711
    if exact:
        db.add(models.ProductScanFile(rel_path=rel, sha256=digest, phash=phash,
                                      size=len(content), original_name=path.name,
                                      status="duplicate",
                                      detail=f"Exact copy of {exact.rel_path}",
                                      product_id=exact.product_id))
        db.commit()
        return "duplicate", exact.product_id

    # Near-duplicate (same photo, re-saved/resized): attach to that product.
    near = _near_duplicate(db, phash, settings.PRODUCT_SCAN_NEAR_DUP_DISTANCE)
    if near and near.product_id:
        product = db.query(models.Product).filter(
            models.Product.id == near.product_id).first()
        if product:
            filename = _register_media(db, path, content,
                                       MIME.get(path.suffix.lower().lstrip("."), "image/jpeg"),
                                       rights)
            order = (db.query(func.count(models.ProductImage.id))
                     .filter(models.ProductImage.product_id == product.id).scalar() or 0)
            db.add(models.ProductImage(
                product_id=product.id, url=public_url(filename),
                alt_text=f"{product.name} — additional view"[:512],
                is_primary=False, sort_order=order, source=rights,
                permission="Product folder scan (original preserved)"))
            db.add(models.ProductScanFile(
                rel_path=rel, sha256=digest, phash=phash, size=len(content),
                original_name=path.name, media_filename=filename,
                product_id=product.id, status="attached",
                detail=f"Near-duplicate of {near.rel_path} — attached as extra image."))
            db.commit()
            return "attached", product.id

    # Brand-new product.
    filename = _register_media(db, path, content,
                               MIME.get(path.suffix.lower().lstrip("."), "image/jpeg"),
                               rights)
    name = _pretty_name(path.stem)
    slug = _next_product_slug(db, name)
    product = models.Product(name=name, slug=slug, status="draft",
                             seo_title="", seo_description="",
                             source_url=f"scan:{rel}"[:1024])
    db.add(product)
    db.flush()
    db.add(models.ProductImage(product_id=product.id, url=public_url(filename),
                               alt_text=name[:512], is_primary=True,
                               sort_order=0, source=rights,
                               permission="Product folder scan (original preserved)"))
    db.add(models.ProductSeoProfile(product_id=product.id, status="pending"))
    db.add(models.ProductScanFile(rel_path=rel, sha256=digest, phash=phash,
                                  size=len(content), original_name=path.name,
                                  media_filename=filename, product_id=product.id,
                                  status="ingested",
                                  ingested_at=datetime.now(timezone.utc).replace(tzinfo=None)))
    db.commit()
    return "created", product.id


def scan_once() -> dict:
    """One scan pass. Never raises on per-file errors."""
    counts = {"scanned": 0, "created": 0, "attached": 0, "duplicates": 0,
              "failed": 0}
    root = scan_root()
    rights = settings.PRODUCT_SCAN_RIGHTS
    if rights not in ("own", "supplier_authorised", "licensed", "ai_generated"):
        rights = "own"
    db = SessionLocal()
    try:
        files = _iter_images(root)[:settings.PRODUCT_SCAN_CAP]
        for path in files:
            counts["scanned"] += 1
            try:
                result, _pid = ingest_file(db, path, root, rights)
                if result in ("created", "attached", "duplicate", "failed"):
                    counts[{"created": "created", "attached": "attached",
                            "duplicate": "duplicates", "failed": "failed"}[result]] += 1
            except Exception as e:  # noqa: BLE001 — per-file isolation
                db.rollback()
                try:
                    rel = str(path.relative_to(root))
                except ValueError:
                    rel = path.name
                try:
                    db.add(models.ProductScanFile(rel_path=rel, sha256="",
                                                  original_name=path.name,
                                                  status="failed",
                                                  detail=f"{type(e).__name__}: {str(e)[:300]}"))
                    db.commit()
                except Exception:
                    db.rollback()
                counts["failed"] += 1
    finally:
        db.close()
    LAST_RUN.update({"at": datetime.now(timezone.utc).isoformat(),
                     "dir": str(root), "error": "", **counts})
    return counts


# ---------------------------------------------------------------------------
# Optional background thread (PRODUCT_SCAN_ENABLED=true)
# ---------------------------------------------------------------------------

_stop: threading.Event | None = None


def _loop() -> None:
    interval = max(int(settings.PRODUCT_SCAN_INTERVAL or 300), 30)
    while _stop is not None and not _stop.is_set():
        try:
            scan_once()
        except Exception:
            pass
        _stop.wait(interval)


def start_scanner() -> bool:
    """Start background folder scanning. Returns False when disabled."""
    global _stop
    if not settings.PRODUCT_SCAN_ENABLED:
        return False
    if _stop is not None:
        return True
    scan_root().mkdir(parents=True, exist_ok=True)
    _stop = threading.Event()
    threading.Thread(target=_loop, name="product-scanner", daemon=True).start()
    return True
