"""Backfill/cleanup SEO fields on all draft products.

Usage (project root; backend server NOT required):
    $env:PYTHONPATH="backend"; python backend/scripts/backfill_draft_seo.py

For every draft product:
  * decodes HTML entities that leaked in from the source site (&amp; -> &)
  * trims unverifiable-claim phrases out of SEO titles/descriptions
  * fills any missing SEO title/meta description with wholesale-framed copy
  * tops keyword tags up to 4 with category-appropriate B2B keywords

Idempotent — re-running produces no further changes.
Writes docs/draft-seo-backfill.json with a before/after report.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal, ensure_schema  # noqa: E402
from app import models  # noqa: E402
from app.seo_backfill import (  # noqa: E402
    clean_seo, description_needs_regen, generate_seo_description,
    generate_seo_title, title_needs_regen, top_up_tags, unescape_text,
)
from app.merchant_ai_images import DESC_MAX, TITLE_MAX  # noqa: E402

# Automated-test leftovers in the dev DB (empty descriptions, no real content).
# Not real products — no SEO can be honestly written for them; listed in the
# report so the merchant can delete them from Admin > Products.
TEST_FIXTURE_SLUGS = {"watch-brass-bowl", "cat-item"}


def run() -> dict:
    ensure_schema()
    db = SessionLocal()
    report: dict = {"updated": [], "unchanged": [], "skipped_fixtures": [],
                    "created": []}
    try:
        drafts = db.query(models.Product).filter(
            models.Product.status == "draft").all()
        for p in drafts:
            if p.slug in TEST_FIXTURE_SLUGS:
                report["skipped_fixtures"].append(p.slug)
                continue
            cat = db.query(models.Category).filter(
                models.Category.id == p.category_id).first()
            cat_slug = cat.slug if cat else ""
            before = {"name": p.name, "seo_title": p.seo_title,
                      "seo_description": p.seo_description,
                      "tags": json.loads(p.tags or "[]")}
            changed = False
            # 1) HTML-entity cleanup (names + SEO + copy)
            for field in ("name", "short_description", "description",
                          "seo_title", "seo_description"):
                old = getattr(p, field) or ""
                new = unescape_text(old)
                if new != old:
                    setattr(p, field, new)
                    changed = True
            # 2) claim-trim + word-boundary cut; regenerate broken titles/descs
            cleaned_title = clean_seo(p.seo_title or "", TITLE_MAX)
            if title_needs_regen(cleaned_title, p.name):
                cleaned_title = generate_seo_title(p.name)
            if cleaned_title != (p.seo_title or ""):
                changed = True
            p.seo_title = cleaned_title
            cleaned_desc = clean_seo(p.seo_description or "", DESC_MAX)
            if description_needs_regen(cleaned_desc):
                cleaned_desc = generate_seo_description(p.name, cat_slug)
            if cleaned_desc != (p.seo_description or ""):
                changed = True
            p.seo_description = cleaned_desc
            # 3) keyword top-up
            tags = top_up_tags(json.loads(p.tags or "[]"), cat_slug)
            if tags != json.loads(p.tags or "[]"):
                changed = True
            p.tags = json.dumps(tags)
            if changed:
                db.commit()
                report["updated"].append({
                    "slug": p.slug, "before": before,
                    "after": {"name": p.name, "seo_title": p.seo_title,
                              "seo_description": p.seo_description,
                              "tags": tags}})
            else:
                report["unchanged"].append(p.slug)
    finally:
        db.close()
    Path("docs/draft-seo-backfill.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"updated {len(report['updated'])}, unchanged "
          f"{len(report['unchanged'])}, fixtures skipped "
          f"{len(report['skipped_fixtures'])} -> docs/draft-seo-backfill.json")
    return report


if __name__ == "__main__":
    run()
