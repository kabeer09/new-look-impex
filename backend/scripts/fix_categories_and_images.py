"""Fix product categories, remove empty categories and imageless products.

Run against the database that backs the site (set DATABASE_URL):

  # preview (default — writes nothing)
  python backend/scripts/fix_categories_and_images.py --dry-run

  # apply
  python backend/scripts/fix_categories_and_images.py --apply

On production (Render + Supabase), run this in the Render Shell / a one-off job
with the production DATABASE_URL exported. The public catalogue currently has
133 published products; 47 sit in hidden catch-all buckets and 12 have no image.

Rules are ID-based against that catalogue so the mapping is exact, with a
name-pattern fallback so the script remains useful if IDs change.
"""
from __future__ import annotations
import argparse
import os
import sys

os.environ.setdefault("SECRET_KEY", "local-fix-script-placeholder-32-chars-minimum")

# Add backend/ to the import path when run from the repo root.
HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.dirname(HERE)
if BACKEND not in sys.path:
    sys.path.insert(0, BACKEND)

from sqlalchemy import func  # noqa: E402
from app.database import SessionLocal  # noqa: E402
from app import models  # noqa: E402

# Exact production IDs -> target category slug.
# Brass spice boxes / canisters / dinner sets / mortars are BRASS KITCHENWARE;
# copper cutlery, storage, serveware, chafers and dinner sets are COPPER
# KITCHENWARE; water dispensers are COPPER JUGS & PITCHERS.
ID_TO_SLUG: dict[int, str] = {
    # Brass kitchenware
    186: "brass-kitchenware",  # Brass Mortar And Pestle
    150: "brass-kitchenware",  # Polished Brass Spice Box
    149: "brass-kitchenware",  # Polished Brass Spice Box
    121: "brass-kitchenware",  # Matte Brass Spice Box
    118: "brass-kitchenware",  # Etched Brass Spice Box
    117: "brass-kitchenware",  # Brass Canister Set
    115: "brass-kitchenware",  # Brass Canisters
    114: "brass-kitchenware",  # Brass Storage Canister
    111: "brass-kitchenware",  # Matte Brass Spice Box
    109: "brass-kitchenware",  # Polished Brass Spice Box
    108: "brass-kitchenware",  # Brass Dining Set
    107: "brass-kitchenware",  # Brass Dinner Set
    105: "brass-kitchenware",  # Brass Coffee Filter
    # Copper kitchenware
    145: "copper-kitchenware", 144: "copper-kitchenware", 143: "copper-kitchenware",
    142: "copper-kitchenware", 141: "copper-kitchenware", 140: "copper-kitchenware",
    139: "copper-kitchenware", 138: "copper-kitchenware", 137: "copper-kitchenware",
    136: "copper-kitchenware", 135: "copper-kitchenware", 134: "copper-kitchenware",
    133: "copper-kitchenware", 132: "copper-kitchenware", 131: "copper-kitchenware",
    129: "copper-kitchenware", 124: "copper-kitchenware", 123: "copper-kitchenware",
    119: "copper-kitchenware", 100: "copper-kitchenware", 82: "copper-kitchenware",
    79: "copper-kitchenware", 68: "copper-kitchenware", 63: "copper-kitchenware",
    66: "copper-kitchenware",   # Copper Chafer
    64: "copper-kitchenware",   # Copper Chafing Dish
    62: "copper-kitchenware",   # Copper Kitchenware Set
    57: "copper-kitchenware",   # Copper Bucket
    # Water dispensers -> jugs & pitchers
    174: "copper-jugs-pitchers", 53: "copper-jugs-pitchers", 35: "copper-jugs-pitchers",
}

# Name-pattern fallback (used when an ID is absent from this DB).
NAME_RULES = [
    ("water dispenser", "copper-jugs-pitchers"),
    ("spice box", "brass-kitchenware"),
    ("mortar", "brass-kitchenware"),
    ("canister", "brass-kitchenware"),
    ("coffee filter", "brass-kitchenware"),
    ("dinner set", "kitchenware"),
    ("dining set", "kitchenware"),
    ("cutlery", "copper-kitchenware"),
    ("flatware", "copper-kitchenware"),
    ("serving spoon", "copper-kitchenware"),
    ("tableware", "copper-kitchenware"),
    ("serveware", "copper-kitchenware"),
    ("condiment", "copper-kitchenware"),
    ("storage", "kitchenware"),
    ("chafer", "copper-kitchenware"),
    ("chafing dish", "copper-kitchenware"),
    ("kitchenware set", "copper-kitchenware"),
    ("bucket", "copper-kitchenware"),
]
HIDDEN_SLUGS = {"metal-home-decor", "copper-handicrafts", "brass-handicrafts"}


def resolve_target(product, cats):
    """Return target Category row or None when no change is needed."""
    name = (product.name or "").lower()
    slug = ID_TO_SLUG.get(product.id)
    if not slug:
        for needle, target in NAME_RULES:
            if needle in name:
                slug = target
                break
    if not slug:
        return None
    if slug == "kitchenware":
        slug = "brass-kitchenware" if product.material and product.material.lower() == "brass" else "copper-kitchenware"
    return cats.get(slug)


def main():
    ap = argparse.ArgumentParser()
    group = ap.add_mutually_exclusive_group(required=True)
    group.add_argument("--dry-run", action="store_true", help="preview only (no writes)")
    group.add_argument("--apply", action="store_true", help="write changes")
    args = ap.parse_args()
    apply = args.apply

    db = SessionLocal()
    try:
        cats = {c.slug: c for c in db.query(models.Category).all()}
        cat_by_id = {c.id: c for c in cats.values()}
        products = db.query(models.Product).all()
        img_counts = {}
        for row in db.query(models.ProductImage.product_id, func.count(models.ProductImage.id)).group_by(models.ProductImage.product_id):
            img_counts[row[0]] = row[1]

        changes = []
        for p in products:
            current = cat_by_id.get(p.category_id)
            if current and current.slug not in HIDDEN_SLUGS:
                continue
            target = resolve_target(p, cats)
            if target and target.id != p.category_id:
                changes.append((p, target))

        imageless = [p for p in products if img_counts.get(p.id, 0) == 0]

        print(f"DATABASE_URL: {os.environ.get('DATABASE_URL','<unset>')}")
        print(f"\nCATEGORY CHANGES ({len(changes)}):")
        for p, t in changes:
            print(f"  #{p.id:<4} {p.name[:48]:<48} -> {t.name}")
        print(f"\nIMAGELESS PRODUCTS TO DELETE ({len(imageless)}):")
        for p in imageless:
            print(f"  #{p.id:<4} {p.name[:48]:<48} (category={getattr(cat_by_id.get(p.category_id),'name',None)})")

        # Empty categories after the moves (excluding ones being deleted).
        moved_ids = {p.id for p, _ in changes}
        deleted_ids = {p.id for p in imageless}
        remaining = {p.category_id for p in products
                     if p.id not in moved_ids and p.id not in deleted_ids and p.category_id}
        empty = [c for c in cats.values() if c.id not in remaining]
        print(f"\nEMPTY CATEGORIES TO DELETE ({len(empty)}):")
        for c in empty:
            print(f"  #{c.id:<4} {c.name}")

        if not apply:
            print("\nDRY RUN — nothing written. Re-run with --apply to commit.")
            return

        for p, t in changes:
            p.category_id = t.id
        for p in imageless:
            db.delete(p)
        db.flush()
        for c in empty:
            db.delete(c)
        db.commit()
        print(f"\nAPPLIED: {len(changes)} recategorised, {len(imageless)} products deleted, "
              f"{len(empty)} empty categories deleted.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
