"""Phase-2 tests: lead (enquiry) admin filtering/search/detail/PATCH/export,
admin analytics endpoint, and non-blocking email notification on lead creation."""
from fastapi.testclient import TestClient
import pytest

from app.main import app
from app.database import Base, engine, SessionLocal
from app import models
from app.auth import hash_pw, _hits as _rate_hits

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
db = SessionLocal()
db.add(models.User(email="admin@test.example", password_hash=hash_pw("Secret123!"), role="admin"))
db.commit()
db.close()

c = TestClient(app)
H: dict = {}  # auth removed


@pytest.fixture(autouse=True)
def _reset_rate_limit():
    """The public enquiry endpoint rate-limits per IP (10/hour). Other test
    modules share that budget, so clear it before each test to keep these
    tests independent of execution order."""
    _rate_hits.clear()
    yield
    _rate_hits.clear()


def _enquiry(**over):
    base = {"name": " Buyer ", "email": "buyer@shop.com", "company": "Shop Pty",
            "phone": "+61 400 111 222", "country": "Australia", "quantity": "50",
            "message": "Please share wholesale pricing and specifications.",
            "consent": True, "landing_page": "/wholesale", "campaign": "q3"}
    base.update(over)
    return base


def test_lead_saved_with_reference_even_without_smtp():
    # SMTP is not configured in tests -> lead must still be saved, email_notified False.
    r = c.post("/api/public/enquiries", json=_enquiry())
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["reference"].startswith("NLI-")
    assert body["email_notified"] is False  # honest: no SMTP configured


def test_lead_admin_detail_and_patch():
    ref = c.post("/api/public/enquiries", json=_enquiry(email="detail@x.com")).json()["reference"]
    items = c.get("/api/enquiries", headers=H).json()["items"]
    e = [x for x in items if x["reference"] == ref][0]
    # detail includes phone, notes, source
    det = c.get(f"/api/enquiries/{e['id']}", headers=H).json()
    assert det["phone"] == "+61 400 111 222"
    assert det["source"] == "website"
    # PATCH status + internal notes
    r = c.patch(f"/api/enquiries/{e['id']}",
                json={"status": "qualified", "notes": "Called; wants 50 units."},
                headers=H)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "qualified"
    assert "Called" in c.get(f"/api/enquiries/{e['id']}", headers=H).json()["notes"]


def test_lead_filter_by_country_status_and_search():
    c.post("/api/public/enquiries", json=_enquiry(email="aus1@x.com", country="Australia"))
    c.post("/api/public/enquiries", json=_enquiry(email="uk1@x.com", country="United Kingdom"))
    # country filter
    aus = c.get("/api/enquiries?country=Australia", headers=H).json()
    assert aus["total"] >= 1
    assert all(i["country"] == "Australia" for i in aus["items"])
    # search by email substring
    sr = c.get("/api/enquiries?q=uk1@x.com", headers=H).json()
    assert sr["total"] >= 1 and all("uk1@x.com" in i["email"] for i in sr["items"])
    # status filter after patching one
    eid = sr["items"][0]["id"]
    c.patch(f"/api/enquiries/{eid}", json={"status": "won"}, headers=H)
    won = c.get("/api/enquiries?status=won", headers=H).json()
    assert all(i["status"] == "won" for i in won["items"])


def test_lead_export_csv_includes_reference_and_phone():
    c.post("/api/public/enquiries", json=_enquiry(email="export@x.com"))
    r = c.get("/api/enquiries/export", headers=H)
    assert r.status_code == 200
    assert "reference" in r.text and "phone" in r.text
    assert "export@x.com" in r.text


def test_lead_endpoints_open():
    # Auth removed: admin lead/analytics endpoints no longer require a token.
    assert c.get("/api/enquiries").status_code == 200


def test_admin_analytics_shape():
    # record a couple of first-party events
    c.post("/api/public/events", json={"event_type": "product_view", "url": "/products/x", "product_id": 1})
    c.post("/api/public/events", json={"event_type": "whatsapp_click", "url": "/products/x"})
    c.post("/api/public/enquiries", json=_enquiry(email="conv@x.com"))
    r = c.get("/api/admin/analytics", headers=H)
    assert r.status_code == 200, r.text
    body = r.json()
    for key in ("product_views", "whatsapp_clicks", "most_viewed_products",
                "popular_categories", "enquiries_by_country", "enquiries_by_source",
                "enquiry_count", "conversion_rate"):
        assert key in body, f"missing {key}"
    assert body["whatsapp_clicks"] >= 1
    assert body["product_views"] >= 1
    assert body["enquiry_count"] >= 1
