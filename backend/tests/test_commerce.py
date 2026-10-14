"""Commerce API tests: products, RFQ, buyers, catalogue. No real credentials needed."""
import io
import json

from fastapi.testclient import TestClient

from app.main import app
from app.database import Base, engine, SessionLocal
from app import models
from app.auth import hash_pw

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
db = SessionLocal()
db.add(models.User(email="admin@test.example", password_hash=hash_pw("Secret123!"), role="admin"))
db.add(models.User(email="editor@test.example", password_hash=hash_pw("Secret123!"), role="editor"))
db.commit()
db.close()

c = TestClient(app)
tok = c.post("/api/auth/login", json={"email": "admin@test.example", "password": "Secret123!"}).json()["access_token"]
H = {"Authorization": f"Bearer {tok}"}
etok = c.post("/api/auth/login", json={"email": "editor@test.example", "password": "Secret123!"}).json()["access_token"]
EH = {"Authorization": f"Bearer {etok}"}


def _make_product(name="Test Product", slug="test-product", status="published", **kw):
    body = {"name": name, "slug": slug, "material": "Brass", "finish": "Polished",
            "sku": "NLI-TEST-001", "tags": ["brass"], "price_on_request": True,
            "status": status, "spec_data": [{"key": "Material", "value": "Brass"}],
            "collection_ids": []}
    body.update(kw)
    return body


# ---------- products ----------

def test_product_crud_and_publication():
    # create as draft
    r = c.post("/api/products", json=_make_product(status="draft"), headers=H)
    assert r.status_code == 201, r.text
    pid = r.json()["id"]
    assert r.json()["status"] == "draft"
    # draft not visible publicly
    assert c.get(f"/api/public/products/{r.json()['slug']}").status_code == 404
    # publish
    assert c.post(f"/api/products/{pid}/publish", headers=H).status_code == 200
    pub = c.get(f"/api/public/products/{r.json()['slug']}")
    assert pub.status_code == 200
    assert pub.json()["name"] == "Test Product"
    # unpublish
    assert c.post(f"/api/products/{pid}/unpublish", headers=H).status_code == 200
    assert c.get(f"/api/public/products/{r.json()['slug']}").status_code == 404


def test_product_slug_uniqueness():
    c.post("/api/products", json=_make_product(name="Alpha", slug="alpha"), headers=H)
    r = c.post("/api/products", json=_make_product(name="Alpha", slug="alpha"), headers=H)
    assert r.status_code == 201
    assert r.json()["slug"] == "alpha-2"


def test_product_delete_blocked_when_in_rfq():
    r = c.post("/api/products", json=_make_product(name="RFQ Product", slug="rfq-product"), headers=H)
    pid = r.json()["id"]
    rfq = {"full_name": "BX", "business_email": "b@x.com", "company_name": "C",
           "country": "Australia", "consent": True,
           "items": [{"product_id": pid, "product_name": "RFQ Product", "quantity": "10"}]}
    assert c.post("/api/public/rfqs", json=rfq).status_code == 201
    # delete should be blocked
    assert c.delete(f"/api/products/{pid}", headers=H).status_code == 409
    # archive works
    assert c.post(f"/api/products/{pid}/archive", headers=H).status_code == 200


def test_product_csv_import_export():
    csv_text = "name,slug,material,finish,sku,status\nCSV Item,csv-item,Brass,Gold,NLI-CSV-001,published"
    r = c.post("/api/products/import", json={"csv": csv_text}, headers=H)
    assert r.status_code == 201
    assert r.json()["created"] == 1
    # duplicate import updates
    r2 = c.post("/api/products/import", json={"csv": csv_text}, headers=H)
    assert r2.json()["updated"] == 1
    # export
    r3 = c.get("/api/products/export", headers=H)
    assert r3.status_code == 200
    assert "csv-item" in r3.text


def test_product_search_and_filters():
    c.post("/api/products", json=_make_product(name="Copper Bowl", slug="copper-bowl", material="Copper"), headers=H)
    c.post("/api/products", json=_make_product(name="Brass Diya", slug="brass-diya", material="Brass"), headers=H)
    r = c.get("/api/public/products?q=copper")
    assert r.status_code == 200
    assert r.json()["total"] >= 1
    r2 = c.get("/api/public/products?material=brass")
    assert r2.json()["total"] >= 1
    r3 = c.get("/api/public/products?sort=name")
    assert r3.status_code == 200


def test_product_image_upload():
    r = c.post("/api/products", json=_make_product(name="Img Product", slug="img-product"), headers=H)
    pid = r.json()["id"]
    # create a tiny valid PNG
    import struct, zlib
    def tiny_png():
        sig = b"\x89PNG\r\n\x1a\n"
        def chunk(t, d):
            c = t + d
            return struct.pack(">I", len(d)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)
        ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
        idat = chunk(b"IDAT", zlib.compress(b"\x00\xff\x00\x00"))
        iend = chunk(b"IEND", b"")
        return sig + ihdr + idat + iend
    r2 = c.post(f"/api/products/{pid}/images",
                files={"files": ("test.png", tiny_png(), "image/png")}, headers=H)
    assert r2.status_code == 201, r2.text
    assert len(r2.json()["images"]) == 1
    # invalid file type
    r3 = c.post(f"/api/products/{pid}/images",
                files={"files": ("test.txt", b"hello", "text/plain")}, headers=H)
    assert r3.status_code == 400


# ---------- categories & collections ----------

def test_category_crud():
    r = c.post("/api/categories", json={"name": "Test Cat", "slug": "test-cat"}, headers=H)
    assert r.status_code == 201
    cid = r.json()["id"]
    assert c.put(f"/api/categories/{cid}", json={"name": "Test Cat 2", "slug": "test-cat"}, headers=H).status_code == 200
    assert c.delete(f"/api/categories/{cid}", headers=H).status_code == 200


def test_collection_product_link():
    cat = c.post("/api/categories", json={"name": "Coll Cat", "slug": "coll-cat"}, headers=H).json()
    p = c.post("/api/products", json=_make_product(name="Coll Prod", slug="coll-prod", category_id=cat["id"]), headers=H).json()
    col = c.post("/api/collections", json={"name": "Test Coll", "slug": "test-coll"}, headers=H).json()
    r = c.post(f"/api/collections/{col['id']}/products", json={"product_ids": [p["id"]]}, headers=H)
    assert r.status_code == 201
    assert r.json()["added"] == 1
    # public collection shows product
    pub = c.get("/api/public/collections/test-coll")
    assert pub.status_code == 200
    assert pub.json()["total"] == 1


# ---------- RFQ ----------

def test_rfq_submit_duplicate_and_admin_view():
    p = c.post("/api/products", json=_make_product(name="RFQ Item", slug="rfq-item"), headers=H).json()
    rfq = {"full_name": "Buyer X", "business_email": "buyerx@example.com", "company_name": "X Co",
           "country": "Australia", "phone": "+61 1", "target_price": "1000",
           "delivery_timeframe": "4 weeks", "additional_requirements": "Need quote",
           "consent": True,
           "items": [{"product_id": p["id"], "product_name": "RFQ Item", "quantity": "500", "unit": "pcs", "notes": "gift"}]}
    r = c.post("/api/public/rfqs", json=rfq)
    assert r.status_code == 201, r.text
    assert r.json()["reference_number"].startswith("RFQ-")
    assert r.json()["email_sent"] is False  # SMTP not configured — honest
    # duplicate within 24h
    r2 = c.post("/api/public/rfqs", json=rfq)
    assert r2.status_code == 409
    # admin sees it
    lst = c.get("/api/rfqs", headers=H)
    assert lst.status_code == 200
    assert lst.json()["total"] >= 1
    rid = lst.json()["items"][0]["id"]
    det = c.get(f"/api/rfqs/{rid}", headers=H)
    assert det.status_code == 200
    assert det.json()["items"][0]["product_name"] == "RFQ Item"
    # status update
    assert c.post(f"/api/rfqs/{rid}/status", json={"status": "quoted"}, headers=H).status_code == 200


def test_rfq_validation():
    bad = {"full_name": "A", "business_email": "not-an-email", "consent": True,
           "items": [{"product_name": "X", "quantity": "1"}]}
    assert c.post("/api/public/rfqs", json=bad).status_code == 422
    no_items = {"full_name": "A B", "business_email": "a@b.com", "consent": True, "items": []}
    assert c.post("/api/public/rfqs", json=no_items).status_code == 422


# ---------- buyers ----------

def test_buyer_crud_qualify_outreach():
    b = {"company_name": "Test Buyer Co", "website": "https://testbuyer.example",
         "country": "Australia", "buyer_category": "Home décor retailer",
         "product_relevance": "brass diyas, copper bowls", "source_url": "https://example.com/dir/1"}
    r = c.post("/api/buyers", json=b, headers=H)
    assert r.status_code == 201, r.text
    bid = r.json()["id"]
    assert r.json()["lead_score"] > 0
    # duplicate company blocked
    r2 = c.post("/api/buyers", json=b, headers=H)
    assert r2.status_code == 409
    # qualify
    q = c.post(f"/api/buyers/{bid}/qualify", headers=H)
    assert q.status_code == 200
    assert q.json()["qualification"]["score"] > 0
    # outreach draft
    d = c.post(f"/api/buyers/{bid}/outreach-draft", headers=H)
    assert d.status_code == 201
    assert d.json()["draft_id"] > 0
    # approve then send without email -> 400
    c.post(f"/api/outreach/{d.json()['draft_id']}/approve", headers=H)
    r3 = c.post(f"/api/outreach/{d.json()['draft_id']}/send", headers=H)
    assert r3.status_code == 400  # no contact email
    # suppression
    c.post(f"/api/buyers/{bid}/outreach-status", json={"outreach_status": "unsubscribed"}, headers=H)
    d2 = c.post(f"/api/buyers/{bid}/outreach-draft", headers=H)
    assert d2.status_code == 409  # suppressed


def test_buyer_csv_import():
    csv_text = "company_name,website,country,buyer_category,product_relevance\nCSV Buyer,https://csvbuyer.example,USA,Importer,brass urlis"
    r = c.post("/api/buyers/import", json={"csv": csv_text}, headers=H)
    assert r.status_code == 201
    assert r.json()["created"] == 1


# ---------- catalogue PDF ----------

def test_catalogue_pdf():
    r = c.get("/api/public/catalogue.pdf")
    assert r.status_code == 200
    assert r.headers["Content-Type"] == "application/pdf"
    assert r.content[:5] == b"%PDF-"
    meta = c.get("/api/public/catalogue/meta")
    assert meta.status_code == 200
    assert meta.json()["product_count"] >= 1


# ---------- settings ----------

def test_settings_update_and_public():
    r = c.put("/api/settings", json={"announcement_text": "Welcome!", "announcement_enabled": "true"}, headers=H)
    assert r.status_code == 200
    pub = c.get("/api/public/settings")
    assert pub.status_code == 200
    assert pub.json()["announcement"]["text"] == "Welcome!"
    # reset
    c.put("/api/settings", json={"announcement_enabled": "false"}, headers=H)


# ---------- events ----------

def test_events_beacon_and_summary():
    r = c.post("/api/public/events", json={"event_type": "product_view", "product_id": 1, "country": "Australia"})
    assert r.status_code == 202
    assert r.json()["recorded"] is True
    # invalid event type
    r2 = c.post("/api/public/events", json={"event_type": "hack"})
    assert r2.json()["recorded"] is False
    s = c.get("/api/events/summary", headers=H)
    assert s.status_code == 200
    assert s.json()["totals"]["product_view"] >= 1


# ---------- media ----------

def test_media_upload_list_delete():
    import struct, zlib
    def tiny_png():
        sig = b"\x89PNG\r\n\x1a\n"
        def chunk(t, d):
            c = t + d
            return struct.pack(">I", len(d)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)
        ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
        idat = chunk(b"IDAT", zlib.compress(b"\x00\xff\x00\x00"))
        iend = chunk(b"IEND", b"")
        return sig + ihdr + idat + iend
    r = c.post("/api/media", files={"files": ("m.png", tiny_png(), "image/png")}, headers=H)
    assert r.status_code == 201, r.text
    mid = r.json()["files"][0]["filename"]
    # list
    lst = c.get("/api/media", headers=H)
    assert lst.status_code == 200
    assert lst.json()["total"] >= 1
    # serve
    srv = c.get(f"/api/media/files/{mid}")
    assert srv.status_code == 200
    assert srv.headers["Content-Type"] == "image/png"
    # delete
    # find the media id
    media_id = lst.json()["items"][0]["id"]
    assert c.delete(f"/api/media/{media_id}", headers=H).status_code == 200


# ---------- roles ----------

def test_editor_cannot_delete_product():
    r = c.post("/api/products", json=_make_product(name="Editor Del", slug="editor-del"), headers=EH)
    pid = r.json()["id"]
    assert c.delete(f"/api/products/{pid}", headers=EH).status_code == 403
    # editor can create
    assert c.post("/api/products", json=_make_product(name="Editor OK", slug="editor-ok"), headers=EH).status_code == 201


def test_unauthenticated_blocked():
    assert c.get("/api/products").status_code in (401, 403)
    assert c.get("/api/buyers").status_code in (401, 403)
    assert c.get("/api/rfqs").status_code in (401, 403)


# ---------- null tolerance (explicit JSON nulls must not 422) ----------

def test_product_accepts_null_optionals():
    body = _make_product(name="Null Opts", slug="null-opts", moq=None,
                         lead_time=None, description=None, material=None,
                         tags=None, price=None, category_id=None,
                         seo_title=None, weight=None, sku=None)
    r = c.post("/api/products", json=body, headers=H)
    assert r.status_code == 201, r.text
    assert r.json()["moq"] == ""
    assert r.json()["price"] is None


def test_rfq_accepts_null_optionals():
    rfq = {"full_name": "Null Buyer", "business_email": "nullbuyer@example.com",
           "company_name": None, "country": None, "phone": None,
           "target_price": None, "delivery_timeframe": None,
           "additional_requirements": None, "consent": True,
           "items": [{"product_name": "Null Item", "quantity": "5",
                      "unit": None, "notes": None}]}
    r = c.post("/api/public/rfqs", json=rfq)
    assert r.status_code == 201, r.text


def test_buyer_and_enquiry_accept_null_optionals():
    b = {"company_name": "Null Buyer Co", "website": None, "country": None,
         "contact_email": None, "notes": None}
    assert c.post("/api/buyers", json=b, headers=H).status_code == 201
    e = {"name": "Null Enq", "email": "nullenq@example.com",
         "company": None, "message": "A real message here.", "consent": True}
    assert c.post("/api/public/enquiries", json=e).status_code == 201


def test_required_fields_still_rejected():
    # null name coerces to "" which still violates min_length
    bad = _make_product(name=None, slug="null-name")
    assert c.post("/api/products", json=bad, headers=H).status_code == 422
    # invalid types still rejected
    bad2 = _make_product(name="Bad Price", slug="bad-price", price="not-a-number")
    assert c.post("/api/products", json=bad2, headers=H).status_code == 422
