"""Seed data: admin user + seed keywords + sample pages + catalogue seed.
Sample data is clearly labelled (source=sample analytics; products are real seed
records the merchant edits — no invented stock/price/capacity claims)."""
import json
from datetime import date, timedelta
from sqlalchemy.orm import Session
from .auth import hash_pw
from .config import settings
from .models import (User, WebsiteProperty, WebsitePage, AnalyticsDaily,
                       Category, Collection, Product, ProductSpec)
from .scoring import score_keyword
from .text import slugify

SEED_KEYWORDS = [
    ("Brass handicrafts manufacturer India", "India", "Brass handicrafts"),
    ("Copper handicrafts supplier India", "India", "Copper handicrafts"),
    ("Brass urli wholesale", "", "Brass urlis"),
    ("Copper urli supplier", "", "Copper urlis"),
    ("Brass diya wholesale", "India", "Brass diyas"),
    ("Metal diya supplier", "", "Metal diyas"),
    ("Indian brass home décor wholesale", "United Kingdom", "Metal home décor"),
    ("Copper decorative bowls", "Australia", "Decorative bowls"),
    ("Brass home décor supplier Australia", "Australia", "Metal home décor"),
    ("Indian handicrafts wholesale UK", "United Kingdom", "Brass handicrafts"),
    ("Brass décor importer UAE", "United Arab Emirates", "Brass handicrafts"),
    ("Custom metal corporate gifts", "United States", "Corporate gifts"),
]

SAMPLE_PAGES = [
    ("https://new-look-impex.vercel.app/", "New Look Impex | Brass & Copper Handicrafts Manufacturer, Moradabad", "Wholesale brass & copper handicrafts from Moradabad, India."),
    ("https://new-look-impex.vercel.app/brass-urli-wholesale", "Brass Urli Wholesale | Manufacturer India", "Bulk brass urlis for retailers & importers."),
    ("https://new-look-impex.vercel.app/brass-diya-wholesale", "Brass Diya Wholesale Supplier India", "Metal diyas for festive & corporate gifting."),
]

SEED_CATEGORIES = [
    ("Brass Urlis", "brass-urlis", "Handcrafted brass urlis for wholesale and export."),
    ("Copper Urlis", "copper-urlis", "Copper urlis for decor and gifting."),
    ("Brass Diyas", "brass-diyas", "Traditional brass diyas for festivals and gifting."),
    ("Metal Diyas", "metal-diyas", "Metal diyas in various finishes."),
    ("Brass Lanterns", "brass-lanterns", "Decorative brass lanterns."),
    ("Decorative Bowls", "decorative-bowls", "Copper and brass decorative bowls."),
    ("Copper Handicrafts", "copper-handicrafts", "Handmade copper handicrafts."),
    ("Brass Handicrafts", "brass-handicrafts", "Handmade brass handicrafts."),
    ("Metal Home Décor", "metal-home-decor", "Metal home décor items."),
    ("Festival Décor", "festival-decor", "Festival decoration products."),
    ("Corporate Gifting", "corporate-gifting", "Corporate gifting products."),
    ("Custom Bulk Orders", "custom-bulk-orders", "Custom and bulk-order products."),
]

SEED_COLLECTIONS = [
    ("Brass Collection", "brass-collection", "Our brass handicraft range.", True),
    ("Copper Collection", "copper-collection", "Our copper handicraft range.", True),
    ("Metal Home Décor", "metal-home-decor", "Metal home décor collection.", True),
    ("Urlis", "urlis", "Brass and copper urlis.", False),
    ("Diyas & Lanterns", "diyas-lanterns", "Diyas and lanterns for festivals.", False),
    ("Corporate & Festival Gifting", "gifting", "Corporate and festival gifting.", True),
]

# Sample products (editable by merchant; no invented prices — price_on_request=True)
SEED_PRODUCTS = [
    ("Handcrafted Brass Urli", "handcrafted-brass-urli", "Brass", "brass-urlis",
     "Polished", "Classic handcrafted brass urli for home entrance décor and gifting.",
     ["brass", "urli", "decor", "wholesale"]),
    ("Copper Decorative Urli", "copper-decorative-urli", "Copper", "copper-urlis",
     "Antique finish", "Copper urli with antique finish for premium décor.",
     ["copper", "urli", "decor"]),
    ("Brass Diya (Set Style)", "brass-diya-set-style", "Brass", "brass-diyas",
     "Gold plated", "Traditional brass diya suitable for festivals and gifting.",
     ["brass", "diya", "festival", "gifting"]),
    ("Metal Diya", "metal-diya", "Metal", "metal-diyas",
     "Matte", "Durable metal diya for daily use and events.",
     ["metal", "diya"]),
    ("Brass Lantern", "brass-lantern", "Brass", "brass-lanterns",
     "Engraved", "Decorative engraved brass lantern for home décor.",
     ["brass", "lantern", "decor"]),
    ("Copper Decorative Bowl", "copper-decorative-bowl", "Copper", "decorative-bowls",
     "Polished", "Handmade copper decorative bowl for display.",
     ["copper", "bowl", "decor"]),
    ("Brass Decorative Bowl", "brass-decorative-bowl", "Brass", "decorative-bowls",
     "Brushed", "Brass decorative bowl for home and hospitality décor.",
     ["brass", "bowl", "decor"]),
    ("Brass Handicraft Vase", "brass-handicraft-vase", "Brass", "brass-handicrafts",
     "Engraved", "Handcrafted brass vase for premium gifting.",
     ["brass", "vase", "handicraft", "gifting"]),
    ("Copper Handicraft Item", "copper-handicraft-item", "Copper", "copper-handicrafts",
     "Antique", "Handmade copper handicraft for collectors and décor.",
     ["copper", "handicraft"]),
    ("Metal Home Décor Accent", "metal-home-decor-accent", "Metal", "metal-home-decor",
     "Mixed finish", "Metal home décor accent piece.",
     ["metal", "home decor", "decor"]),
    ("Festival Décor Set", "festival-decor-set", "Brass", "festival-decor",
     "Festive", "Festival décor set for seasonal celebrations.",
     ["festival", "decor", "gifting"]),
    ("Corporate Gifting Diya", "corporate-gifting-diya", "Brass", "corporate-gifting",
     "Premium", "Brass diya suitable for corporate gifting programmes.",
     ["corporate", "gifting", "diya"]),
]


def seed(db: Session):
    if not db.query(User).filter(User.email == settings.ADMIN_EMAIL).first():
        db.add(User(email=settings.ADMIN_EMAIL, password_hash=hash_pw(settings.ADMIN_PASSWORD), role="admin"))
    if not db.query(WebsiteProperty).first():
        db.add(WebsiteProperty(domain="newlookimpex.example", site_url="https://newlookimpex.example/"))
    if db.query(WebsitePage).count() == 0:
        for url, title, meta in SAMPLE_PAGES:
            db.add(WebsitePage(url=url, title=title, meta_description=meta, h1=title.split("|")[0].strip(),
                               word_count=350, status_code=200, is_indexable=True))
    # categories
    cat_id_by_slug = {}
    for name, slug, desc in SEED_CATEGORIES:
        existing = db.query(Category).filter(Category.slug == slug).first()
        if existing:
            cat_id_by_slug[slug] = existing.id
            continue
        c = Category(name=name, slug=slug, description=desc,
                         status="published", featured=name in
                         ("Brass Urlis", "Brass Diyas", "Decorative Bowls"))
        db.add(c); db.flush()
        cat_id_by_slug[slug] = c.id
    # collections
    coll_id_by_slug = {}
    for name, slug, desc, featured in SEED_COLLECTIONS:
        existing = db.query(Collection).filter(Collection.slug == slug).first()
        if existing:
            coll_id_by_slug[slug] = existing.id
            continue
        c = Collection(name=name, slug=slug, description=desc,
                         status="published", featured=featured)
        db.add(c); db.flush()
        coll_id_by_slug[slug] = c.id
    # products
    for name, slug, material, cat_slug, finish, desc, tags in SEED_PRODUCTS:
        existing = db.query(Product).filter(Product.slug == slug).first()
        if existing:
            continue
        p = Product(
            name=name, slug=slug,
            short_description=desc, description=desc + " " +
            "Suitable for wholesale, retail and export enquiries. "
            "Contact New Look Impex for bulk requirements, customisation "
            "and a quotation.",
            category_id=cat_id_by_slug.get(cat_slug),
            material=material, finish=finish,
            sku=("NLI-" + slug.upper().replace("-", "")[:14]),
            tags=json.dumps(tags),
            price=None, currency="USD", price_on_request=True,
            status="published",
            featured=slug in ("handcrafted-brass-urli", "brass-diya-set-style",
                                "copper-decorative-bowl", "brass-lantern"),
            seo_title=f"{name} — Wholesale | New Look Impex",
            seo_description=f"Wholesale {name.lower()} from Moradabad, India. "
            "Bulk supply for retailers, importers and corporate gifting. "
            "Enquire for a quotation.")
        db.add(p); db.flush()
        # basic specifications
        db.add(ProductSpec(product_id=p.id, key="Material", value=material))
        db.add(ProductSpec(product_id=p.id, key="Finish", value=finish))
        db.add(ProductSpec(product_id=p.id, key="Origin",
                             value="Moradabad, India"))
    db.commit()
    # sample analytics clearly labelled source=sample (last 28 days totals only)
    if db.query(AnalyticsDaily).count() == 0:
        today = date.today()
        for i in range(28):
            d = today - timedelta(days=27 - i)
            db.add(AnalyticsDaily(date=d, source="sample", url="https://newlookimpex.example/",
                                  query="", clicks=2 + (i % 5), impressions=60 + (i * 3) % 80,
                                  ctr=0.03, position=18.0 - (i % 7) * 0.3, sessions=5 + (i % 4)))
        db.commit()
