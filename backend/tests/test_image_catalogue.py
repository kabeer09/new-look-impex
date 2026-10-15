"""Merchant image-catalogue tests: import, image resolution, alt text, slugs,
sitemap scope, redirects, and no-unsupported-claims scan."""
from fastapi.testclient import TestClient

from app.main import app
from app.database import Base, engine, SessionLocal
from app import models
from app.auth import hash_pw
from app.image_catalogue import import_catalogue

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
db = SessionLocal()
db.add(models.User(email="admin@test.example", password_hash=hash_pw("Secret123!"), role="admin"))
db.commit()
db.close()

import pytest


@pytest.fixture(scope="module", autouse=True)
def _fresh_catalogue():
    """Self-contained dataset: other test modules wipe the shared dev DB at
    import time, so (re)build our catalogue right before our tests run."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    db.add(models.User(email="admin@test.example", password_hash=hash_pw("Secret123!"), role="admin"))
    db.commit()
    db.close()
    rep = import_catalogue(SessionLocal(), images_dir="images")
    assert rep["products"] == 14, rep
    assert rep["categories"] == 5, rep
    assert rep["collections"] == 2, rep
    assert rep["banner"] == "created", rep
    assert rep["errors"] == [], rep["errors"]
    yield


c = TestClient(app)
tok = c.post("/api/auth/login", json={"email": "admin@test.example", "password": "Secret123!"}).json()["access_token"]
H = {"Authorization": f"Bearer {tok}"}

BANNED = ["certified", "certification", "FDA", "food-safe", "food safe",
          "lead-free", "lead free", "bpa", "99.9%", "pure copper", "100% copper",
          "dishwasher safe", "microwave safe", "guarantee", "made in india",
          "ISO", "export house", "star export"]


def _published():
    db = SessionLocal()
    try:
        return db.query(models.Product).filter(models.Product.status == "published").all()
    finally:
        db.close()


def test_import_counts_and_idempotent():
    rep2 = import_catalogue(SessionLocal(), images_dir="images")
    assert rep2["products"] == 0
    assert len(rep2["skipped"]) == 14
    assert rep2["errors"] == []


def test_all_published_product_images_resolve():
    db = SessionLocal()
    imgs = db.query(models.ProductImage).join(
        models.Product, models.Product.id == models.ProductImage.product_id).filter(
        models.Product.status == "published").all()
    db.close()
    assert len(imgs) >= 14  # every product has at least a main image
    for im in imgs:
        fn = im.url.rsplit("/", 1)[-1]
        assert c.get(f"/api/media/files/{fn}").status_code == 200, fn
        w = c.get(f"/api/media/files/{fn}?variant=webp")
        assert w.status_code == 200 and w.headers["Content-Type"] == "image/webp", fn
        t = c.get(f"/api/media/files/{fn}?variant=thumb")
        assert t.status_code == 200, fn


def test_all_published_images_have_alt():
    for p in _published():
        db = SessionLocal()
        imgs = db.query(models.ProductImage).filter(
            models.ProductImage.product_id == p.id).all()
        db.close()
        assert imgs, p.slug
        for im in imgs:
            assert (im.alt_text or "").strip(), f"{p.slug} image {im.id} missing alt"


def test_slugs_unique_and_canonical():
    db = SessionLocal()
    slugs = [p.slug for p in db.query(models.Product).all()]
    db.close()
    assert len(slugs) == len(set(s.lower() for s in slugs))
    r = c.get("/api/public/products/hammered-copper-water-bottle")
    assert r.status_code == 200
    assert r.json()["canonical_slug"] == "hammered-copper-water-bottle"


def test_unpublished_hidden_and_sitemap_scope():
    db = SessionLocal()
    p = db.query(models.Product).filter(
        models.Product.slug == "brass-kadai-with-lid").first()
    pid = p.id
    db.close()
    c.post(f"/api/products/{pid}/unpublish", headers=H)
    try:
        assert c.get("/api/public/products/brass-kadai-with-lid").status_code == 404
        sm = c.get("/sitemap.xml").text
        assert "brass-kadai-with-lid" not in sm
        assert "hammered-copper-water-bottle" in sm
    finally:
        c.post(f"/api/products/{pid}/publish", headers=H)


def test_slug_rename_redirects():
    db = SessionLocal()
    p = db.query(models.Product).filter(
        models.Product.slug == "brass-mortar-pestle").first()
    pid = p.id
    db.close()
    body = c.get(f"/api/products/{pid}", headers=H).json()
    body["slug"] = "brass-mortar-and-pestle"
    body["tags"] = body.get("tags", [])
    r = c.put(f"/api/products/{pid}", json=body, headers=H)
    assert r.status_code == 200
    assert r.json()["slug"] == "brass-mortar-and-pestle"
    # old URL follows the permanent redirect to the renamed product
    old = c.get("/api/public/products/brass-mortar-pestle")
    assert old.status_code == 200
    assert old.json()["slug"] == "brass-mortar-and-pestle"
    assert old.json()["canonical_slug"] == "brass-mortar-and-pestle"
    # restore original slug for other tests / the live site
    body["slug"] = "brass-mortar-pestle"
    c.put(f"/api/products/{pid}", json=body, headers=H)


def test_no_unsupported_claims_in_published_copy():
    violations = []
    for p in _published():
        db = SessionLocal()
        alts = " ".join(im.alt_text or "" for im in db.query(models.ProductImage).filter(
            models.ProductImage.product_id == p.id).all())
        db.close()
        blob = " ".join([p.name or "", p.short_description or "", p.description or "",
                         p.seo_title or "", p.seo_description or "", alts]).lower()
        for phrase in BANNED:
            if phrase.lower() in blob:
                violations.append(f"{p.slug}: {phrase}")
    assert violations == [], violations


def test_public_catalogue_serves_real_images():
    r = c.get("/api/public/products?material=copper&page_size=50")
    assert r.status_code == 200
    assert r.json()["total"] >= 10
    for item in r.json()["items"][:5]:
        assert item["image"] and item["image"]["url"]
        assert item["image"]["alt_text"]
