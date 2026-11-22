"""Seed data: admin user + seed keywords + sample pages + catalogue seed.
Sample data is clearly labelled (source=sample analytics; products are real seed
records the merchant edits — no invented stock/price/capacity claims)."""
from datetime import date, timedelta
from sqlalchemy.orm import Session
from .auth import hash_pw
from .config import settings
from .models import (User, WebsiteProperty, WebsitePage, AnalyticsDaily,
                       Category, Collection)

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

# Only the six real product families that exist in the live catalogue.
# The old catch-all buckets (Metal Home Décor, Copper/Brass Handicrafts and the
# empty Urli/Diya/Lantern/Gifting buckets) were removed from the live site — do
# not re-create them here.
SEED_CATEGORIES = [
    ("Copper Bottles", "copper-bottles", "Copper water bottles in hammered, smooth matte and diamond-cut finishes."),
    ("Copper Jugs & Pitchers", "copper-jugs-pitchers", "Copper jugs, pitchers and drinkware sets for tabletop and gifting."),
    ("Copper Mugs & Tumblers", "copper-mugs-tumblers", "Copper tumblers, mugs and barware for retail and hospitality."),
    ("Copper Kitchenware", "copper-kitchenware", "Copper cookware, cutlery, storage and serveware for wholesale buyers."),
    ("Brass Kitchenware", "brass-kitchenware", "Brass cookware, spice boxes, canisters and dinnerware for wholesale buyers."),
    ("Decorative Bowls", "decorative-bowls", "Copper and brass decorative bowls."),
]

SEED_COLLECTIONS = [
    ("Brass Collection", "brass-collection", "Our brass handicraft range.", True),
    ("Copper Collection", "copper-collection", "Our copper handicraft range.", True),
    ("Metal Home Décor", "metal-home-decor", "Metal home décor collection.", True),
    ("Urlis", "urlis", "Brass and copper urlis.", False),
    ("Diyas & Lanterns", "diyas-lanterns", "Diyas and lanterns for festivals.", False),
    ("Corporate & Festival Gifting", "gifting", "Corporate and festival gifting.", True),
]

# No seed products: the live catalogue is image-driven and every published
# product must have at least one photo. Imageless sample products were removed
# from production; re-adding them here would reintroduce the same problem.


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
