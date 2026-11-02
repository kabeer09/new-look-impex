"""Phase-1 schema tests: B2B product fields, lead (enquiry) reference/phone,
CSV import/export round-trip with external ids, and admin SEO pages."""
from fastapi.testclient import TestClient

from app.main import app
from app.database import Base, engine, SessionLocal
from app import models
from app.auth import hash_pw

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
db = SessionLocal()
db.add(models.User(email="admin@test.example", password_hash=hash_pw("Secret123!"), role="admin"))
db.commit()
db.close()

c = TestClient(app)
H: dict = {}  # auth removed


# ---------- B2B product fields ----------

def test_product_b2b_fields_roundtrip():
    body = {"name": "Copper Bottle 1L", "slug": "copper-bottle-1l",
            "external_product_id": "LS-1001", "material": "Copper",
            "capacity": "1000 ml", "dimensions": "26 cm x 8 cm",
            "finish": "Hammered", "moq": "50 pcs",
            "price_visibility": "on_request", "stock_status": "in_stock",
            "status": "published", "tags": ["copper", "bottle"]}
    r = c.post("/api/products", json=body, headers=H)
    assert r.status_code == 201, r.text
    got = r.json()
    assert got["external_product_id"] == "LS-1001"
    assert got["capacity"] == "1000 ml"
    assert got["stock_status"] == "in_stock"
    assert got["price_visibility"] == "on_request"
    assert got["price_on_request"] is True  # on_request keeps legacy bool in sync
    # public detail exposes the same fields
    pub = c.get(f"/api/public/products/{got['slug']}").json()
    assert pub["capacity"] == "1000 ml"
    assert pub["external_product_id"] == "LS-1001"


def test_price_visibility_public_syncs_legacy_bool():
    body = {"name": "Public Price Item", "slug": "public-price-item",
            "price": 12.5, "price_visibility": "public", "status": "draft"}
    r = c.post("/api/products", json=body, headers=H)
    assert r.status_code == 201, r.text
    assert r.json()["price_visibility"] == "public"
    assert r.json()["price_on_request"] is False


def test_legacy_price_on_request_false_maps_to_public():
    # Old clients only send price_on_request=false -> treated as public.
    body = {"name": "Legacy Public", "slug": "legacy-public",
            "price": 9.99, "price_on_request": False, "status": "draft"}
    r = c.post("/api/products", json=body, headers=H)
    assert r.status_code == 201, r.text
    assert r.json()["price_visibility"] == "public"


# ---------- CSV import / export round-trip ----------

def test_csv_import_external_id_dedupe_and_update():
    csv_one = ("external_product_id,name,slug,material,capacity,stock_status,"
               "price_visibility,status\n"
               "EXT-900,Hammered Bottle,hammered-bottle,Copper,750 ml,in_stock,"
               "on_request,draft\n")
    r = c.post("/api/products/import", json={"csv": csv_one}, headers=H)
    assert r.status_code == 201, r.text
    assert r.json()["created"] == 1
    # re-import same external id -> updates, does not duplicate
    csv_two = ("external_product_id,name,slug,material,capacity,stock_status,"
               "price_visibility,status\n"
               "EXT-900,Hammered Bottle Renamed,hammered-bottle,Copper,750 ml,"
               "out_of_stock,on_request,draft\n")
    r2 = c.post("/api/products/import", json={"csv": csv_two}, headers=H)
    assert r2.json()["updated"] == 1 and r2.json()["created"] == 0
    # product carries the external id and updated stock status
    lst = c.get("/api/products?q=Hammered Bottle", headers=H).json()["items"]
    assert len(lst) == 1
    assert lst[0]["external_product_id"] == "EXT-900"
    assert lst[0]["stock_status"] == "out_of_stock"


def test_csv_export_includes_b2b_columns():
    c.post("/api/products", json={"name": "Export Me", "slug": "export-me",
                                  "external_product_id": "EXT-777",
                                  "capacity": "500 ml", "status": "draft"},
           headers=H)
    r = c.get("/api/products/export", headers=H)
    assert r.status_code == 200
    assert "external_product_id" in r.text
    assert "capacity" in r.text
    assert "price_visibility" in r.text
    assert "EXT-777" in r.text


# ---------- Lead / enquiry reference + phone ----------

def test_enquiry_generates_reference_and_stores_phone():
    payload = {"name": "Jane Buyer", "email": "jane@retailer.com",
               "company": "Retail Co", "phone": "+61 400 000 000",
               "country": "Australia", "quantity": "100",
               "message": "Please share wholesale pricing for copper bottles.",
               "consent": True, "landing_page": "/products",
               "campaign": "au-summer"}
    r = c.post("/api/public/enquiries", json=payload)
    assert r.status_code == 201, r.text
    ref = r.json()["reference"]
    assert ref and ref.startswith("NLI-")
    # stored with phone
    admin = c.get("/api/enquiries", headers=H).json()["items"]
    match = [e for e in admin if e["reference"] == ref]
    assert match and match[0]["phone"] == "+61 400 000 000"


def test_enquiry_links_existing_product():
    prod = c.post("/api/products", json={"name": "Linked Bottle", "slug": "linked-bottle",
                                         "status": "published"}, headers=H).json()
    payload = {"name": "Buyer2", "email": "b2@x.com", "product_id": prod["id"],
               "quantity": "10", "message": "Interested in the linked bottle.",
               "consent": True}
    r = c.post("/api/public/enquiries", json=payload)
    assert r.status_code == 201, r.text
    admin = c.get("/api/enquiries", headers=H).json()["items"]
    match = [e for e in admin if e["reference"] == r.json()["reference"]]
    assert match and match[0]["product_id"] == prod["id"]
    assert match[0]["product_interest"] == "Linked Bottle"


def test_enquiry_rate_limit_or_validation():
    # missing phone is allowed (optional); invalid email rejected
    bad = {"name": "X", "email": "not-an-email", "message": "hello there", "consent": True}
    assert c.post("/api/public/enquiries", json=bad).status_code == 422


# ---------- Admin SEO pages ----------

def test_seo_page_crud_and_public_read():
    body = {"path": "wholesale", "title": "Wholesale Copper & Brass | New Look Impex",
            "meta_description": "Wholesale copper and brass handicrafts from Moradabad, India.",
            "canonical_url": "https://newlookimpex.example/wholesale", "published": True}
    r = c.post("/api/seo-pages", json=body, headers=H)
    assert r.status_code == 201, r.text
    pid = r.json()["id"]
    # public read by path
    pub = c.get("/api/public/seo-pages/wholesale")
    assert pub.status_code == 200
    assert pub.json()["title"].startswith("Wholesale")
    # duplicate path rejected
    assert c.post("/api/seo-pages", json=body, headers=H).status_code == 409
    # update
    body2 = dict(body, title="Wholesale Handicrafts — New Look Impex")
    assert c.put(f"/api/seo-pages/{pid}", json=body2, headers=H).status_code == 200
    assert c.get("/api/public/seo-pages/wholesale").json()["title"].startswith("Wholesale Handicrafts")
    # delete + now 404 publicly
    assert c.delete(f"/api/seo-pages/{pid}", headers=H).status_code == 200
    assert c.get("/api/public/seo-pages/wholesale").status_code == 404


def test_seo_page_endpoints_open():
    # Auth removed: admin SEO-page endpoints no longer require a token.
    assert c.get("/api/seo-pages").status_code == 200
