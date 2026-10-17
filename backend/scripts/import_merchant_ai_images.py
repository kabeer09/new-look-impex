"""One-time import: 16 merchant-supplied product photos -> draft products + banner.

Usage (project root; backend server NOT required):
    $env:PYTHONPATH="backend"; python backend/scripts/import_merchant_ai_images.py

Reads the merchant's Gemini-generated product renders from their Downloads
folder (path overridable with MERCHANT_IMAGE_DIR), re-encodes working copies
to JPEG (originals untouched), and creates DRAFT products with SEO titles,
meta descriptions and keyword tags for human review + publishing. The wide
line-up shot becomes an INACTIVE homepage banner the admin can activate.

Safe to re-run: skips products already recorded via source_url markers.
Writes docs/merchant-ai-images-import.json with the image->product mapping.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import models  # noqa: E402
from app.catalog import _save_product  # noqa: E402
from app.database import SessionLocal, ensure_schema  # noqa: E402
from app.merchant_ai_images import (  # noqa: E402
    BANNER, PLAN, RIGHTS_NOTE, RIGHTS_SOURCE, compress_to_jpeg, jpeg_filename,
    validate_plan,
)
from app.media_store import public_url, save_file  # noqa: E402
from app.schemas import ProductIn  # noqa: E402

DEFAULT_DIR = str(Path.home() / "Downloads")
SOURCE_MARKER = "gemini-import"  # source_url prefix used for idempotency


def run() -> dict:
    validate_plan()  # refuse to import a broken plan
    src_dir = Path(os.environ.get("MERCHANT_IMAGE_DIR", DEFAULT_DIR))
    missing = [f for f in [BANNER["file"]] if not (src_dir / f).exists()]
    for entry in PLAN:
        for fname, _alt in entry["images"]:
            if not (src_dir / fname).exists():
                missing.append(fname)
    if missing:
        raise SystemExit(f"Missing source images in {src_dir}: {missing}")

    ensure_schema()
    db = SessionLocal()
    report: dict = {"products": [], "skipped": [], "banner": None, "errors": []}
    try:
        # ---- products ----------------------------------------------------
        for entry in PLAN:
            marker = f"{SOURCE_MARKER}:{entry['key']}"
            if db.query(models.Product).filter(models.Product.source_url == marker).first():
                report["skipped"].append(entry["key"])
                print(f"skip (already imported): {entry['key']}")
                continue
            cat = db.query(models.Category).filter(
                models.Category.slug == entry["category"]).first()
            body = ProductIn(
                name=entry["name"], slug="", short_description=entry["short_description"],
                description=entry["description"], category_id=cat.id if cat else None,
                material=entry["material"], finish=entry["finish"], color="",
                dimensions="", weight="", sku="", tags=entry["tags"], moq="",
                lead_time="", packaging_info="", price=None, currency="USD",
                price_on_request=True, featured=False, sort_order=0, status="draft",
                seo_title=entry["seo_title"], seo_description=entry["seo_description"],
                variant_data=[], spec_data=[], collection_ids=[], image_urls=[])
            p = models.Product(name=body.name, slug="")
            p = _save_product(p, body, db, is_new=True)
            p.source_url = marker
            saved = 0
            for j, (fname, alt) in enumerate(entry["images"]):
                try:
                    raw = (src_dir / fname).read_bytes()
                    jpeg, ctype = compress_to_jpeg(raw)
                    meta = save_file(jpeg_filename(entry["key"], j), jpeg, ctype,
                                     label=entry["key"])
                    db.add(models.MediaFile(
                        filename=meta["filename"], original_name=fname[:255],
                        content_type=ctype, size=meta.get("size", 0),
                        has_thumb=meta.get("has_thumb", False),
                        has_webp=meta.get("has_webp", False),
                        alt_text=alt, source=RIGHTS_SOURCE, permission=RIGHTS_NOTE))
                    db.add(models.ProductImage(
                        product_id=p.id, url=public_url(meta["filename"]),
                        alt_text=alt, is_primary=(j == 0), sort_order=j,
                        source=RIGHTS_SOURCE, permission=RIGHTS_NOTE))
                    saved += 1
                except Exception as e:  # keep going; report per-image failures
                    report["errors"].append(f"{entry['key']} {fname}: {type(e).__name__}: {e}")
            db.add(models.ProductImport(
                kind="ai_images", filename="", source_url=marker,
                rights_source=RIGHTS_SOURCE, category_id=cat.id if cat else None,
                status="saved",
                items_json=json.dumps({"product_id": p.id, "images": saved})[:2000]))
            db.commit()
            report["products"].append({
                "key": entry["key"], "slug": p.slug, "name": entry["name"],
                "seo_title": entry["seo_title"], "seo_description": entry["seo_description"],
                "tags": entry["tags"], "images": saved,
                "files": [f for f, _a in entry["images"]]})
            print(f"draft {p.slug} ({saved} imgs)")

        # ---- banner (inactive until an admin activates it) ----------------
        exists = db.query(models.Banner).filter(
            models.Banner.title == BANNER["title"]).first()
        if not exists:
            raw = (src_dir / BANNER["file"]).read_bytes()
            jpeg, ctype = compress_to_jpeg(raw)
            meta = save_file("antique-engraved-collection-banner.jpg", jpeg, ctype,
                             label="home-banner")
            db.add(models.MediaFile(
                filename=meta["filename"], original_name=BANNER["file"][:255],
                content_type=ctype, size=meta.get("size", 0),
                has_thumb=meta.get("has_thumb", False),
                has_webp=meta.get("has_webp", False),
                alt_text=BANNER["alt"], source=RIGHTS_SOURCE, permission=RIGHTS_NOTE))
            max_sort = db.query(models.Banner).count()
            db.add(models.Banner(
                placement="home_hero", title=BANNER["title"], subtitle=BANNER["subtitle"],
                image_url=public_url(meta["filename"]), cta_text=BANNER["cta_text"],
                cta_link=BANNER["cta_link"], sort_order=max_sort, is_active=False))
            db.commit()
            report["banner"] = {"file": BANNER["file"], "image": meta["filename"],
                                "active": False,
                                "note": "inactive — activate in Admin > Banners after review"}
            print("banner created (inactive)")
        else:
            report["banner"] = {"skipped": BANNER["title"]}
    finally:
        db.close()
    Path("docs/merchant-ai-images-import.json").write_text(
        json.dumps(report, indent=2), encoding="utf-8")
    print(f"done: {len(report['products'])} drafts, {len(report['skipped'])} skipped, "
          f"{len(report['errors'])} errors -> docs/merchant-ai-images-import.json")
    return report


if __name__ == "__main__":
    run()
