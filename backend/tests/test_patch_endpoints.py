"""Phase-1 PATCH endpoints: partial updates must not touch variants/specs/images,
and slug renames must create permanent redirects.

Setup runs inside the test function (not at import): sibling test modules call
drop_all/create_all at import time, and the shared scratch SQLite file persists
between pytest runs — so module-level state would be wiped or go stale.
"""
import os

os.environ.setdefault("SECRET_KEY", "test-secret-key-for-local-pytest-run-0123456789abcdef")
os.environ.setdefault("ADMIN_EMAIL", "newlookimpex130@gmail.com")

from fastapi.testclient import TestClient  # noqa: E402

from app import models  # noqa: E402
from app.auth import create_access_token  # noqa: E402
from app.database import SessionLocal, engine, Base  # noqa: E402
from app.main import app  # noqa: E402


def test_patch_endpoints():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    TOKEN = create_access_token("newlookimpex130@gmail.com", "admin", 1)
    H = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}
    client = TestClient(app)
    failures = []

    def check(cond, msg):
        print(("PASS  " if cond else "FAIL  ") + msg)
        if not cond:
            failures.append(msg)

    try:
        # Admin user required by require_role
        if not db.query(models.User).filter(
                models.User.email == "newlookimpex130@gmail.com").first():
            db.add(models.User(email="newlookimpex130@gmail.com", password_hash="",
                               role="admin", is_active=True))
            db.commit()

        # Purge leftovers from a previous run of this same test
        stale = db.query(models.Product).filter(
            models.Product.slug.in_(
                ("patch-test-product", "renamed-patch-product",
                 "renamed-patch-product-2", "renamed-patch-product-3",
                 "renamed-patch-product-4", "slug-collision-probe"))).all()
        for sp in stale:
            db.query(models.ProductSlugRedirect).filter(
                models.ProductSlugRedirect.product_id == sp.id).delete()
            db.query(models.ProductImage).filter(
                models.ProductImage.product_id == sp.id).delete()
            db.query(models.ProductVariant).filter(
                models.ProductVariant.product_id == sp.id).delete()
            db.query(models.ProductSpec).filter(
                models.ProductSpec.product_id == sp.id).delete()
            db.delete(sp)
        db.commit()

        # One product with a variant, a spec and an image
        p = models.Product(name="Patch Test Product", slug="patch-test-product",
                           status="published", material="Copper",
                           seo_title="Old SEO Title", seo_description="Old SEO desc",
                           short_description="Old short", description="Old description")
        db.add(p)
        db.flush()
        db.add(models.ProductVariant(product_id=p.id, name="1 litre", sku="PT-1", price=10.0))
        db.add(models.ProductSpec(product_id=p.id, key="Material", value="Copper"))
        db.add(models.ProductImage(product_id=p.id, url="https://x.test/a.jpg",
                                   alt_text="Old alt", is_primary=True))
        db.commit()
        pid = p.id

        # 1. Partial PATCH changes only what is sent
        r = client.patch(f"/api/products/{pid}", headers=H,
                         json={"seo_title": "New SEO Title", "description": "New description"})
        check(r.status_code == 200, f"PATCH product returns 200 (got {r.status_code})")
        d = r.json()
        check(d["seo_title"] == "New SEO Title", "seo_title updated")
        check(d["description"] == "New description", "description updated")
        check(d["short_description"] == "Old short", "untouched short_description preserved")
        check(d["seo_description"] == "Old SEO desc", "untouched seo_description preserved")
        check(d["name"] == "Patch Test Product", "name preserved when not sent")

        # 2. Variants / specs / images untouched by PATCH
        v = db.query(models.ProductVariant).filter(
            models.ProductVariant.product_id == pid).all()
        s = db.query(models.ProductSpec).filter(
            models.ProductSpec.product_id == pid).all()
        i = db.query(models.ProductImage).filter(
            models.ProductImage.product_id == pid).all()
        db.refresh(p)
        check(len(v) == 1, f"variant survives PATCH (count={len(v)})")
        check(len(s) == 1, f"spec survives PATCH (count={len(s)})")
        check(len(i) == 1 and i[0].alt_text == "Old alt", "image + alt survive PATCH")

        # 3. Slug rename creates a permanent redirect, old URL 308s
        old_slug = p.slug
        r = client.patch(f"/api/products/{pid}", headers=H,
                         json={"slug": "renamed-patch-product"})
        check(r.status_code == 200, f"slug PATCH returns 200 (got {r.status_code})")
        check(r.json().get("slug") == "renamed-patch-product",
              f"slug renamed (got {r.json().get('slug')})")
        red = db.query(models.ProductSlugRedirect).filter(
            models.ProductSlugRedirect.old_slug == old_slug).first()
        check(red is not None and red.product_id == pid,
              "ProductSlugRedirect row created")
        old_page = client.get(f"/api/public/products/{old_slug}",
                              follow_redirects=False)
        check(old_page.status_code == 308,
              f"old slug 308s (got {old_page.status_code})")
        check(old_page.headers.get("location", "").endswith("/renamed-patch-product"),
              f"redirect points at new slug (got {old_page.headers.get('location')})")
        # Following the redirect lands on the renamed product
        followed = client.get(f"/api/public/products/{old_slug}")
        check(followed.status_code == 200
              and followed.json().get("canonical_slug") == "renamed-patch-product",
              "followed redirect reaches renamed product")

        # 4. Duplicate slug gets a -2 suffix instead of blowing up
        r = client.patch(f"/api/products/{pid}", headers=H,
                         json={"slug": "renamed-patch-product"})
        check(r.status_code == 200, "re-PATCH with same slug is idempotent")
        other = models.Product(name="Other", slug="slug-collision-probe",
                               status="published")
        db.add(other)
        db.commit()
        r = client.patch(f"/api/products/{other.id}", headers=H,
                         json={"slug": "renamed-patch-product"})
        check(r.status_code == 200 and r.json().get("slug") == "renamed-patch-product-2",
              f"collision suffixed -2 (got {r.json().get('slug')})")

        # 5. Image alt-text PATCH
        img_id = i[0].id
        r = client.patch(f"/api/products/{pid}/images/{img_id}", headers=H,
                         json={"alt_text": "Copper Patch Test Product — handcrafted "
                                           "copper product photo"})
        check(r.status_code == 200, f"image PATCH returns 200 (got {r.status_code})")
        check(r.json()["alt_text"].startswith("Copper Patch"), "alt_text updated")
        r = client.patch(f"/api/products/{pid}/images/{img_id}", headers=H,
                         json={"alt_text": None})
        check(r.status_code == 200 and r.json()["alt_text"].startswith("Copper Patch"),
              "null alt_text keeps current value")

        # 6. Auth required
        r = client.patch(f"/api/products/{pid}", json={"seo_title": "x"})
        check(r.status_code == 401,
              f"unauthenticated PATCH rejected (got {r.status_code})")

        # 7. Validation
        r = client.patch(f"/api/products/{pid}", headers=H, json={"name": "   "})
        check(r.status_code == 422, f"blank name rejected (got {r.status_code})")
        r = client.patch("/api/products/999999", headers=H, json={"seo_title": "x"})
        check(r.status_code == 404, f"unknown product 404 (got {r.status_code})")

        if failures:
            raise AssertionError(f"{len(failures)} failures: {failures}")
    finally:
        db.close()
