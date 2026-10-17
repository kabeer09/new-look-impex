"""One-time migration: merchant's live site -> local catalogue (DRAFTS).

Usage (project root, backend running NOT required):
    $env:PYTHONPATH="backend"; python backend/scripts/import_linker_store.py

Reads the live sitemap, parses each product page politely (3s delays),
downloads gallery images into the media store, and creates DRAFT products
for human review + publishing. Safe to re-run: source_url dedupes.
Writes docs/linker-import-report.json with the mapping + review list.
"""
from __future__ import annotations
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import models  # noqa: E402
from app.catalog import _save_product  # noqa: E402
from app.database import SessionLocal, ensure_schema  # noqa: E402
from app.linker_import import (  # noqa: E402
    download_image, fetch, finish_from_name, map_category, parse_product_page,
    polite_pause, product_urls, sanitize_description, seo_for,
)
from app.media_store import public_url, save_file  # noqa: E402
from app.schemas import ProductIn  # noqa: E402
from app.text import slugify  # noqa: E402

LANTERN_CAT = ("Metal Lanterns", "metal-lanterns",
               "Handcrafted metal lanterns for home décor and hospitality buyers.")


def ensure_lantern_category(db) -> int:
    c = db.query(models.Category).filter(models.Category.slug == LANTERN_CAT[1]).first()
    if not c:
        c = models.Category(name=LANTERN_CAT[0], slug=LANTERN_CAT[1],
                            description=LANTERN_CAT[2], status="published")
        db.add(c)
        db.commit()
        db.refresh(c)
    return c.id


def run() -> dict:
    ensure_schema()
    db = SessionLocal()
    report: dict = {"products": [], "skipped": [], "errors": [], "needs_review": []}
    try:
        lantern_id = ensure_lantern_category(db)
        urls = product_urls()
        print(f"{len(urls)} product URLs from live sitemap")
        for i, url in enumerate(urls, 1):
            try:
                if db.query(models.Product).filter(models.Product.source_url == url).first():
                    report["skipped"].append(url)
                    print(f"[{i}/{len(urls)}] skip (already imported)")
                    continue
                html = fetch(url)
                polite_pause()
                parsed = parse_product_page(url, html)
                name = parsed["name"] or url.rsplit("/", 1)[-1].replace("-", " ").title()
                cat_slug, material = map_category(name)
                cat = db.query(models.Category).filter(models.Category.slug == cat_slug).first()
                cat_id = lantern_id if cat_slug == "metal-lanterns" else (cat.id if cat else None)
                clean_desc, had_claims = sanitize_description(parsed["description"])
                title, meta, primary, secondaries = seo_for(name, cat_slug)
                tags = list(dict.fromkeys(
                    [material.lower(), cat_slug.replace("-", " ")] + secondaries))[:8]
                tags = [t for t in tags if t]
                body = ProductIn(
                    name=name[:512], slug="", short_description=clean_desc[:300],
                    description=clean_desc[:4000] if clean_desc else "",
                    category_id=cat_id, material=material,
                    finish=finish_from_name(name), color="", dimensions="",
                    weight="", sku="", tags=tags, moq="", lead_time="",
                    packaging_info="", price=None, currency="USD",
                    price_on_request=True, featured=False, sort_order=0,
                    status="draft", seo_title=title, seo_description=meta,
                    variant_data=[], spec_data=[], collection_ids=[], image_urls=[])
                p = models.Product(name=body.name, slug=slugify(body.slug or body.name))
                p = _save_product(p, body, db, is_new=True)
                p.source_url = url
                saved_imgs = 0
                for j, img_url in enumerate(parsed["images"][:6]):
                    try:
                        content, mime = download_image(img_url)
                        polite_pause()
                        ext = ".png" if "png" in mime else ".jpg"
                        meta = save_file(f"linker-{p.slug}-{j}{ext}", content, mime,
                                         label=p.slug)
                        alt = f"{name} — product photo {j + 1}"[:512]
                        db.add(models.MediaFile(
                            filename=meta["filename"], original_name=img_url[:255],
                            content_type=mime, size=meta.get("size", 0),
                            has_thumb=meta.get("has_thumb", False),
                            has_webp=meta.get("has_webp", False),
                            alt_text=alt, source="own",
                            permission=f"Merchant-owned site {url}"))
                        db.add(models.ProductImage(
                            product_id=p.id, url=public_url(meta["filename"]),
                            alt_text=alt, is_primary=(j == 0), sort_order=j,
                            source="own",
                            permission=f"Merchant-owned site {url}"))
                        saved_imgs += 1
                    except Exception as e:
                        report["errors"].append(f"{url} img{j}: {type(e).__name__}")
                db.add(models.ProductImport(
                    kind="linker-site", filename="", source_url=url,
                    rights_source="own", category_id=cat_id, status="saved",
                    items_json=json.dumps({"product_id": p.id, "images": saved_imgs,
                                           "claims_stripped": had_claims})[:2000]))
                db.commit()
                review = []
                if not clean_desc:
                    review.append("description empty after claim-scrub — write from photos")
                if not material:
                    review.append("material unconfirmed (lantern metal not stated)")
                if saved_imgs == 0:
                    review.append("no images downloaded")
                entry = {"slug": p.slug, "name": name, "url": url,
                         "category": cat_slug, "images": saved_imgs}
                if review:
                    entry["needs_review"] = review
                    report["needs_review"].append(entry)
                report["products"].append(entry)
                print(f"[{i}/{len(urls)}] draft {p.slug} ({saved_imgs} imgs)")
            except Exception as e:
                db.rollback()
                report["errors"].append(f"{url}: {type(e).__name__}: {str(e)[:200]}")
                print(f"[{i}/{len(urls)}] ERROR {url}: {e}")
    finally:
        db.close()
    Path("docs/linker-import-report.json").write_text(json.dumps(report, indent=2),
                                                      encoding="utf-8")
    print(f"done: {len(report['products'])} drafts, "
          f"{len(report['skipped'])} skipped, {len(report['errors'])} errors, "
          f"{len(report['needs_review'])} need review -> docs/linker-import-report.json")
    return report


if __name__ == "__main__":
    run()
