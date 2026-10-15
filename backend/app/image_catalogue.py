"""Merchant image-catalogue importer: images/ folder -> real products.

Uses ONLY the merchant's images/ folder (originals never modified, copied into
the media store with descriptive names). Every product is built from visually
verified evidence: no invented dimensions, capacity, weight, certifications,
prices, MOQs, stock, purity, food-safety or manufacturing claims. Unknowns stay
blank for admin verification.

Idempotent: existing slugs/categories/collections are skipped, so re-running
is safe. Produces docs/product-seo-map.csv as a side effect.
"""
from __future__ import annotations
import csv
import json
from pathlib import Path

from sqlalchemy import func

from . import models
from .catalog import _save_product
from .media_store import public_url, save_file
from .schemas import ProductIn
from .text import slugify

RIGHTS = "own"
PERMISSION = "Merchant images folder (images/)"
CTA = (" Contact New Look Impex for bulk requirements and a quotation.")


def _desc(*sentences: str) -> str:
    return " ".join(s for s in sentences if s) + CTA


CATEGORIES = [
    ("Copper Bottles", "copper-bottles",
     "Copper water bottles in hammered, smooth matte and diamond-cut finishes for retail, hospitality and gifting assortments.",
     "WhatsApp Image 2026-10-14 at 8.16.04 PM (1).jpeg"),
    ("Copper Jugs & Pitchers", "copper-jugs-pitchers",
     "Copper jugs, pitchers and drinkware sets for tabletop service and gifting programmes.",
     "WhatsApp Image 2026-10-14 at 8.16.04 PM (2).jpeg"),
    ("Copper Mugs & Tumblers", "copper-mugs-tumblers",
     "Copper tumblers, mugs and barware for retail and hospitality buyers.",
     "WhatsApp Image 2026-10-14 at 8.16.03 PM.jpeg"),
    ("Copper Kitchenware", "copper-kitchenware",
     "Copper kitchenware including water dispensers for bulk supply.",
     "WhatsApp Image 2026-10-15 at 8.57.28 PM (1).jpeg"),
    ("Brass Kitchenware", "brass-kitchenware",
     "Brass kadai cookware, mortar and pestle, and kitchen displays for wholesale buyers.",
     "WhatsApp Image 2026-10-15 at 8.57.22 PM.jpeg"),
]

COLLECTIONS = [
    ("Copper Drinkware", "copper-drinkware",
     "Bottles, jugs, tumblers and sets for wholesale drinkware programmes.",
     "WhatsApp Image 2026-10-14 at 8.16.01 PM.jpeg"),
    ("Brass Kitchen Collection", "brass-kitchen-collection",
     "Hammered brass kadai cookware and kitchen pieces for wholesale buyers.",
     "WhatsApp Image 2026-10-15 at 8.57.22 PM.jpeg"),
]

PRODUCTS: list[dict] = [
    dict(slug="hammered-copper-water-bottle", name="Hammered Copper Water Bottle",
         category="copper-bottles", material="Copper", finish="Hammered", sku="NLI-CB001",
         tags=["copper", "bottle", "water bottle", "hammered", "drinkware", "wholesale"],
         short="Hammered copper water bottle with screw cap for retail and gifting assortments.",
         desc=_desc("Hammered copper water bottle with screw cap, shown here on a white studio background.",
                   "A staple piece for drinkware assortments across retail, hospitality and corporate gifting."),
         seo_title="Hammered Copper Water Bottle Wholesale | New Look Impex",
         seo_description="Wholesale hammered copper water bottles from Moradabad, India for retailers, importers and gifting buyers. Enquire for a quotation.",
         primary_kw="copper bottles wholesale",
         secondary_kws=["copper drinkware wholesale", "copperware supplier for retailers"],
         collections=["copper-drinkware"],
         images=[
             ("WhatsApp Image 2026-10-14 at 8.16.04 PM (1).jpeg",
              "Hammered copper water bottle with screw cap on a white studio background"),
             ("WhatsApp Image 2026-10-14 at 8.16.02 PM (1).jpeg",
              "Hammered copper water bottle outdoors beside a bowl of grapefruit"),
             ("WhatsApp Image 2026-10-14 at 8.16.04 PM.jpeg",
              "Hammered copper water bottle on a wooden desk beside stacked books"),
             ("WhatsApp Image 2026-10-14 at 8.23.01 PM.jpeg",
              "Hammered copper water bottle and tumbler on a park bench outdoors"),
         ]),
    dict(slug="smooth-matte-copper-bottle", name="Smooth Matte Copper Bottle",
         category="copper-bottles", material="Copper", finish="Smooth matte", sku="NLI-CB002",
         tags=["copper", "bottle", "water bottle", "matte", "drinkware", "wholesale"],
         short="Smooth matte copper water bottle with screw cap.",
         desc=_desc("Smooth matte copper water bottle with screw cap, photographed in a calm interior setting.",
                   "Suited to minimal retail assortments and gifting programmes."),
         seo_title="Smooth Matte Copper Bottle Wholesale | New Look Impex",
         seo_description="Wholesale smooth matte copper water bottles from Moradabad, India for retailers and gifting buyers. Enquire for a quotation.",
         primary_kw="copper drinkware wholesale",
         secondary_kws=["copper bottles wholesale", "copperware supplier for retailers"],
         collections=["copper-drinkware"],
         images=[
             ("WhatsApp Image 2026-10-14 at 8.16.02 PM (2).jpeg",
              "Smooth matte copper water bottle with screw cap beside a yoga mat"),
             ("WhatsApp Image 2026-10-14 at 8.16.06 PM (1).jpeg",
              "Slim smooth copper water bottle with a yoga practitioner in the background"),
         ]),
    dict(slug="diamond-cut-copper-bottle", name="Diamond-Cut Copper Water Bottle",
         category="copper-bottles", material="Copper", finish="Textured (diamond-cut)", sku="NLI-CB003",
         tags=["copper", "bottle", "water bottle", "diamond-cut", "drinkware", "wholesale"],
         short="Diamond-cut textured copper water bottle for premium assortments.",
         desc=_desc("Copper water bottle with a diamond-cut textured surface, photographed on a dining table.",
                   "A distinctive piece for premium drinkware assortments."),
         seo_title="Diamond-Cut Copper Water Bottle Supplier | New Look Impex",
         seo_description="Diamond-cut copper water bottles for wholesale buyers — retail, hospitality and gifting assortments. Enquire for a quotation.",
         primary_kw="copper bottle supplier",
         secondary_kws=["copper bottles wholesale", "copper drinkware wholesale"],
         collections=["copper-drinkware"],
         images=[
             ("WhatsApp Image 2026-10-15 at 8.57.25 PM (1).jpeg",
              "Diamond-cut copper water bottle on a dining table"),
         ]),
    dict(slug="copper-bottle-gift-set", name="Copper Bottle Gift Set in Wooden Box",
         category="copper-bottles", material="Copper", finish="Hammered", sku="NLI-CB004",
         tags=["copper", "bottle", "gift set", "wooden box", "corporate gifting", "wholesale"],
         short="Two hammered copper bottles presented in a wooden gift box.",
         desc=_desc("Two hammered copper bottles presented in a wooden gift box with glass lid.",
                   "Prepared for festive and corporate gifting programmes."),
         seo_title="Copper Bottle Gift Set Wholesale | New Look Impex",
         seo_description="Wholesale copper bottle gift sets in wooden boxes for corporate and festive gifting. Enquire for a quotation.",
         primary_kw="corporate metal gifts",
         secondary_kws=["copper gift sets wholesale", "festive corporate gifting"],
         collections=["copper-drinkware", "gifting"],
         images=[
             ("WhatsApp Image 2026-10-14 at 8.16.02 PM (3).jpeg",
              "Two hammered copper bottles in a wooden gift box with glass lid"),
         ]),
    dict(slug="hammered-copper-jug-tumblers", name="Hammered Copper Jug with Tumblers",
         category="copper-jugs-pitchers", material="Copper", finish="Hammered", sku="NLI-CJ001",
         tags=["copper", "jug", "tumblers", "hammered", "drinkware set", "wholesale"],
         short="Hammered copper jug with lid and two matching tumblers.",
         desc=_desc("Hammered copper jug with lid and two matching tumblers, photographed in studio and lifestyle settings.",
                   "A complete serving set for tabletop and gifting assortments."),
         seo_title="Hammered Copper Jug with Tumblers Wholesale",
         seo_description="Wholesale hammered copper jug and tumbler sets from Moradabad, India for retailers and hospitality buyers. Enquire for a quotation.",
         primary_kw="copper jugs wholesale",
         secondary_kws=["copper drinkware wholesale", "copper kitchenware supplier"],
         collections=["copper-drinkware"],
         images=[
             ("WhatsApp Image 2026-10-14 at 8.16.04 PM (2).jpeg",
              "Hammered copper jug with lid and two matching tumblers on a light background"),
             ("WhatsApp Image 2026-10-14 at 8.16.02 PM.jpeg",
              "Water being poured from a hammered copper jug into a matching tumbler"),
             ("WhatsApp Image 2026-10-14 at 8.23.01 PM (1).jpeg",
              "Two-scene image of a hammered copper jug pouring into a tumbler and the set on a table"),
         ]),
    dict(slug="copper-jug-gift-set", name="Copper Jug Gift Set in Wooden Box",
         category="copper-jugs-pitchers", material="Copper", finish="Hammered", sku="NLI-CJ002",
         tags=["copper", "jug", "gift set", "wooden box", "corporate gifting", "wholesale"],
         short="Hammered copper jug and tumblers in a wooden gift box.",
         desc=_desc("Hammered copper jug and two tumblers presented in a wooden gift box with floral styling.",
                   "Prepared for festive and corporate gifting programmes."),
         seo_title="Copper Jug Gift Set Wholesale | New Look Impex",
         seo_description="Wholesale copper jug gift sets in wooden boxes for corporate and festive gifting. Enquire for a quotation.",
         primary_kw="copper gift sets wholesale",
         secondary_kws=["corporate metal gifts", "festive corporate gifting"],
         collections=["copper-drinkware", "gifting"],
         images=[
             ("WhatsApp Image 2026-10-14 at 8.23.00 PM.jpeg",
              "Hammered copper jug and two tumblers presented in a wooden gift box"),
         ]),
    dict(slug="hammered-copper-flower-pitcher", name="Hammered Copper Flower Pitcher",
         category="copper-jugs-pitchers", material="Copper", finish="Hammered", sku="NLI-CJ003",
         tags=["copper", "pitcher", "jug", "vase", "home decor", "wholesale"],
         short="Hammered copper pitcher styled as a flower vase.",
         desc=_desc("Hammered copper pitcher with handle, shown styled with dried and fresh flowers.",
                   "Suited to home décor and floral retail assortments as well as tabletop use."),
         seo_title="Hammered Copper Pitcher Wholesale | New Look Impex",
         seo_description="Wholesale hammered copper pitchers for home décor and tabletop buyers. Enquire for a quotation.",
         primary_kw="metal home décor wholesale",
         secondary_kws=["copper jugs wholesale", "homeware importers and distributors"],
         collections=["copper-drinkware"],
         images=[
             ("WhatsApp Image 2026-10-15 at 8.57.27 PM.jpeg",
              "Hammered copper pitcher holding dried flowers on a grey background"),
             ("WhatsApp Image 2026-10-15 at 8.57.26 PM (2).jpeg",
              "Hammered copper jug holding white flowers on a console table"),
             ("WhatsApp Image 2026-10-15 at 8.57.28 PM.jpeg",
              "Hammered copper pitcher with autumn flowers on a marble counter"),
         ]),
    dict(slug="copper-drinkware-set", name="Hammered Copper Drinkware Set",
         category="copper-jugs-pitchers", material="Copper", finish="Hammered", sku="NLI-CJ004",
         tags=["copper", "drinkware set", "jug", "bottles", "tumblers", "wholesale"],
         short="Hammered copper jug, bottles and tumblers as a kitchen assortment.",
         desc=_desc("Hammered copper jug, water bottles and tumblers styled as a kitchen assortment.",
                   "Offered for wholesale drinkware programmes that buy coordinated sets."),
         seo_title="Hammered Copper Drinkware Set Wholesale | NLI",
         seo_description="Wholesale hammered copper drinkware sets — jugs, bottles and tumblers for retail programmes. Enquire for a quotation.",
         primary_kw="copper kitchenware supplier",
         secondary_kws=["copper drinkware wholesale", "copper jugs wholesale"],
         collections=["copper-drinkware"],
         images=[
             ("WhatsApp Image 2026-10-14 at 8.16.01 PM.jpeg",
              "Hammered copper jug, water bottles and tumblers styled on a kitchen counter"),
         ]),
    dict(slug="hammered-copper-tumbler", name="Hammered Copper Tumbler",
         category="copper-mugs-tumblers", material="Copper", finish="Hammered", sku="NLI-CM001",
         tags=["copper", "tumbler", "glass", "hammered", "drinkware", "wholesale"],
         short="Hammered copper tumbler for retail and hospitality.",
         desc=_desc("Hammered copper tumbler, photographed in studio and lifestyle settings.",
                   "A high-volume piece for drinkware assortments."),
         seo_title="Hammered Copper Tumbler Wholesale | New Look Impex",
         seo_description="Wholesale hammered copper tumblers from Moradabad, India for retailers and hospitality buyers. Enquire for a quotation.",
         primary_kw="copper drinkware wholesale",
         secondary_kws=["copper mugs tumblers", "copperware supplier for retailers"],
         collections=["copper-drinkware"],
         images=[
             ("WhatsApp Image 2026-10-14 at 8.16.03 PM.jpeg",
              "Hand holding a hammered copper tumbler against a dark background"),
             ("WhatsApp Image 2026-10-14 at 8.16.03 PM (2).jpeg",
              "Hand holding a hammered copper tumbler above an open book"),
             ("WhatsApp Image 2026-10-14 at 8.16.03 PM (1).jpeg",
              "Split image of an antique-finish copper tumbler and a lemon-salt cleaning demonstration"),
         ]),
    dict(slug="antique-finish-copper-tumbler", name="Antique Finish Copper Tumbler",
         category="copper-mugs-tumblers", material="Copper", finish="Antique-style patina", sku="NLI-CM002",
         tags=["copper", "tumbler", "antique", "patina", "drinkware", "wholesale"],
         short="Copper tumbler with antique-style patina finish.",
         desc=_desc("Copper tumbler with an antique-style patina finish, shown with a lemon cleaning demonstration.",
                   "For buyers seeking darker, heritage-look drinkware. Finish and care details confirmed on enquiry."),
         seo_title="Antique Finish Copper Tumbler Wholesale | NLI",
         seo_description="Wholesale antique-finish copper tumblers for retail and hospitality buyers. Enquire for a quotation.",
         primary_kw="copper tumblers wholesale",
         secondary_kws=["copper drinkware wholesale", "antique copper barware"],
         collections=["copper-drinkware"],
         images=[
             ("WhatsApp Image 2026-10-14 at 8.23.00 PM (1).jpeg",
              "Antique-finish copper tumbler being cleaned with lemon, hammered copper pot behind"),
         ]),
    dict(slug="copper-mule-mug-shaker", name="Copper Moscow Mule Mug and Shaker",
         category="copper-mugs-tumblers", material="Copper", finish="Hammered", sku="NLI-CM003",
         tags=["copper", "mug", "moscow mule", "barware", "shaker", "wholesale"],
         short="Hammered copper Moscow mule mug with brass handle and shaker.",
         desc=_desc("Hammered copper Moscow mule mug with brass-tone handle, photographed beside a copper cocktail shaker.",
                   "For barware and hospitality assortments; seasonal lifestyle imagery available."),
         seo_title="Copper Mule Mug and Barware Wholesale | NLI",
         seo_description="Wholesale copper Moscow mule mugs and barware for hospitality buyers. Enquire for a quotation.",
         primary_kw="copper barware wholesale",
         secondary_kws=["copper mugs wholesale", "copper drinkware wholesale"],
         collections=["copper-drinkware"],
         images=[
             ("WhatsApp Image 2026-10-14 at 8.16.06 PM.jpeg",
              "Hammered copper Moscow mule mug with brass handle beside a copper cocktail shaker"),
             ("WhatsApp Image 2026-10-15 at 8.57.25 PM (2).jpeg",
              "Hammered copper mug on an autumn harvest tablescape"),
             ("WhatsApp Image 2026-10-15 at 8.57.27 PM (1).jpeg",
              "Autumn tablescape with two hammered copper mugs and candles"),
         ]),
    dict(slug="copper-water-dispenser-tap", name="Hammered Copper Water Dispenser with Tap",
         category="copper-kitchenware", material="Copper", finish="Hammered", sku="NLI-CK001",
         tags=["copper", "dispenser", "water", "tap", "kitchenware", "wholesale"],
         short="Large hammered copper water dispenser with metal tap.",
         desc=_desc("Large hammered copper water dispenser with metal tap on a cork stand, shown beside a copper bottle.",
                   "Capacity and tap specifications confirmed on enquiry. For kitchenware and hospitality programmes."),
         seo_title="Copper Water Dispenser with Tap Wholesale | NLI",
         seo_description="Wholesale hammered copper water dispensers with tap for kitchenware buyers. Capacity confirmed on enquiry — request a quotation.",
         primary_kw="copper kitchenware supplier",
         secondary_kws=["copper drinkware wholesale", "copper water dispenser"],
         collections=["copper-drinkware"],
         images=[
             ("WhatsApp Image 2026-10-14 at 8.16.05 PM (1).jpeg",
              "Large hammered copper water dispenser with metal tap on a cork stand beside a copper bottle"),
             ("WhatsApp Image 2026-10-14 at 8.16.05 PM.jpeg",
              "Hand operating the tap of a hammered copper water dispenser filling a glass"),
         ]),
    dict(slug="brass-kadai-with-lid", name="Hammered Brass Kadai with Lid",
         category="brass-kitchenware", material="Brass", finish="Hammered", sku="NLI-BK001",
         tags=["brass", "kadai", "cookware", "hammered", "kitchenware", "wholesale"],
         short="Hammered brass kadai cooking pot with lid and serving spoon.",
         desc=_desc("Hammered brass kadai cooking pot with fitted lid and serving spoon, styled for serving and display.",
                   "For cookware and kitchenware wholesale programmes."),
         seo_title="Hammered Brass Kadai with Lid Wholesale | NLI",
         seo_description="Wholesale hammered brass kadai cookware with lid for kitchenware buyers. Enquire for a quotation.",
         primary_kw="brass kitchenware wholesale",
         secondary_kws=["brass home décor wholesale", "hammered brass cookware"],
         collections=["brass-kitchen-collection"],
         images=[
             ("WhatsApp Image 2026-10-15 at 8.57.23 PM (2).jpeg",
              "Hammered brass kadai cooking pot with lid and serving spoon on a wooden table"),
             ("WhatsApp Image 2026-10-15 at 8.57.23 PM.jpeg",
              "Three-scene image of a brass kadai served with curry, utensils flat-lay and styled pot"),
         ]),
    dict(slug="brass-mortar-pestle", name="Polished Brass Mortar and Pestle",
         category="brass-kitchenware", material="Brass", finish="Polished", sku="NLI-BK002",
         tags=["brass", "mortar", "pestle", "kitchenware", "polished", "wholesale"],
         short="Polished brass mortar and pestle for spice preparation.",
         desc=_desc("Polished brass mortar and pestle, photographed with cinnamon and cardamom.",
                   "For kitchenware and tabletop wholesale assortments."),
         seo_title="Brass Mortar and Pestle Wholesale | New Look Impex",
         seo_description="Wholesale polished brass mortar and pestle sets for kitchenware buyers. Enquire for a quotation.",
         primary_kw="brass mortar pestle wholesale",
         secondary_kws=["brass kitchenware wholesale", "brass tableware"],
         collections=["brass-kitchen-collection"],
         images=[
             ("WhatsApp Image 2026-10-15 at 8.57.24 PM.jpeg",
              "Polished brass mortar and pestle with cinnamon and cardamom on a wooden board"),
         ]),
]


def import_catalogue(db, images_dir: str | Path = "images") -> dict:
    """Idempotent import of the merchant image catalogue. Returns a report."""
    images_dir = Path(images_dir)
    report: dict = {"categories": 0, "collections": 0, "products": 0,
                    "images": 0, "skipped": [], "errors": [], "banner": None}
    stored: dict[str, str] = {}  # source filename -> stored filename

    def store(source_file: str, label: str, alt: str) -> str:
        if source_file in stored:
            return stored[source_file]
        src = images_dir / source_file
        if not src.exists():
            raise FileNotFoundError(f"Source image missing: {source_file}")
        content = src.read_bytes()
        meta = save_file(source_file, content, "image/jpeg", label=label)
        db.add(models.MediaFile(filename=meta["filename"], original_name=source_file[:255],
                                content_type="image/jpeg", size=meta.get("size", 0),
                                has_thumb=meta.get("has_thumb", False),
                                has_webp=meta.get("has_webp", False),
                                alt_text=alt[:512], source="own",
                                permission="Merchant images folder (images/)"))
        db.flush()
        stored[source_file] = meta["filename"]
        report["images"] += 1
        return meta["filename"]

    cat_ids: dict[str, int] = {}
    created_cats = 0
    for name, slug, desc, img_file in CATEGORIES:
        c = db.query(models.Category).filter(models.Category.slug == slug).first()
        if not c:
            c = models.Category(name=name, slug=slug, description=desc,
                                status="published")
            db.add(c); db.flush()
            created_cats += 1
        try:
            fn = store(img_file, slug, f"{name} — wholesale range")
            c.image_url = public_url(fn)
        except Exception as e:
            report["errors"].append(f"category {slug}: {e}")
        db.commit()
        cat_ids[slug] = c.id
    report["categories"] = created_cats

    col_ids: dict[str, int] = {}
    created_cols = 0
    for name, slug, desc, img_file in COLLECTIONS:
        col = db.query(models.Collection).filter(models.Collection.slug == slug).first()
        if not col:
            col = models.Collection(name=name, slug=slug, description=desc,
                                    status="published", featured=True)
            db.add(col); db.flush()
            created_cols += 1
        try:
            fn = store(img_file, slug, f"{name} — wholesale collection")
            col.image_url = public_url(fn)
        except Exception as e:
            report["errors"].append(f"collection {slug}: {e}")
        db.commit()
        col_ids[slug] = col.id
    report["collections"] = created_cols

    for p in PRODUCTS:
        try:
            if db.query(models.Product).filter(
                    func.lower(models.Product.slug) == p["slug"].lower()).first():
                report["skipped"].append(p["slug"])
                continue
            body = ProductIn(
                name=p["name"], slug=p["slug"], short_description=p["short"],
                description=p["desc"], category_id=cat_ids.get(p["category"]),
                material=p["material"], finish=p["finish"], color="", dimensions="",
                weight="", sku=p["sku"], tags=p["tags"], moq="", lead_time="",
                packaging_info="", price=None, currency="USD", price_on_request=True,
                featured=False, sort_order=0, status="published",
                seo_title=p["seo_title"], seo_description=p["seo_description"],
                variant_data=[], spec_data=[],
                collection_ids=[col_ids[c] for c in p.get("collections", []) if c in col_ids],
                image_urls=[])
            prod = models.Product(name=body.name, slug=p["slug"])
            prod = _save_product(prod, body, db, is_new=True)
            for i, (fn, alt) in enumerate(p["images"]):
                stored_fn = store(fn, p["slug"], alt)
                db.add(models.ProductImage(product_id=prod.id,
                                           url=public_url(stored_fn),
                                           alt_text=alt[:512], is_primary=(i == 0),
                                           sort_order=i, source="own",
                                           permission="Merchant images folder (images/)"))
            db.commit()
            report["products"] += 1
        except Exception as e:
            db.rollback()
            report["errors"].append(f"{p['slug']}: {type(e).__name__}: {str(e)[:200]}")

    # Hero banner from the drinkware set scene (only when none exist).
    if db.query(models.Banner).count() == 0:
        try:
            fn = store("WhatsApp Image 2026-10-14 at 8.16.01 PM.jpeg",
                       "copper-drinkware-hero",
                       "Hammered copper drinkware set styled on a kitchen counter")
            db.add(models.Banner(placement="home_hero", title="Copper Drinkware for Wholesale",
                                 subtitle="Bottles, jugs and tumblers from Moradabad, India",
                                 image_url=public_url(fn), cta_text="Explore Our Collection",
                                 cta_link="/products", sort_order=1, is_active=True))
            db.commit()
            report["banner"] = "created"
        except Exception as e:
            db.rollback()
            report["errors"].append(f"banner: {e}")

    # SEO map side-effect for the deliverable.
    try:
        with open("docs/product-seo-map.csv", "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["slug", "name", "primary_keyword", "secondary_keywords",
                        "seo_title", "meta_description"])
            for p in PRODUCTS:
                w.writerow([p["slug"], p["name"], p["primary_kw"],
                            "; ".join(p["secondary_kws"]), p["seo_title"],
                            p["seo_description"]])
    except Exception as e:
        report["errors"].append(f"seo-map: {e}")
    return report
