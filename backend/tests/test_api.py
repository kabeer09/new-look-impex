"""API + scoring + audit + CRM tests. No real credentials needed (all externals mocked)."""
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
db.commit(); db.close()

c = TestClient(app)
tok = c.post("/api/auth/login", json={"email": "admin@test.example", "password": "Secret123!"}).json()["access_token"]
H = {"Authorization": f"Bearer {tok}"}


def test_auth_required():
    assert c.get("/api/keywords").status_code in (401, 403)


def test_keyword_create_dedupe_score():
    r = c.post("/api/keywords", json={"keyword": "Brass urli wholesale", "country": "Australia"}, headers=H)
    assert r.status_code == 201, r.text
    assert r.json()["opportunity_score"] > 0
    r2 = c.post("/api/keywords", json={"keyword": "brass urli WHOLESALE", "country": "Australia"}, headers=H)
    assert r2.status_code == 409  # dedupe case-insensitive


def test_null_metrics_ok():
    r = c.post("/api/keywords", json={"keyword": "Copper diya test null metrics xyz", "country": ""}, headers=H)
    assert r.status_code == 201
    assert r.json()["impressions"] is None


def test_audit_and_recommendation_flow():
    html = "<html><head></head><body><p>short</p><img src='x.jpg'></body></html>"
    from app.audit_engine import audit_url
    res = audit_url("https://newlookimpex.example/x", html, 200)
    assert res["score"] is not None and any(i["check"] == "title" for i in res["issues"])
    r = c.post("/api/seo/audits/run", json={"url": "https://example.com"}, headers=H)
    assert r.status_code in (201, 200)


def test_approval_publish_rollback_permissions():
    kws = c.get("/api/keywords", headers=H).json()
    recs = c.get("/api/seo/recommendations", headers=H).json()
    assert recs["total"] >= 1
    rid = recs["items"][0]["id"]
    assert c.post(f"/api/seo/recommendations/{rid}/approve", headers=H).status_code == 200
    assert c.post(f"/api/seo/recommendations/{rid}/publish", headers=H).status_code == 200
    assert c.post(f"/api/seo/recommendations/{rid}/rollback", headers=H).status_code == 200


def test_enquiry_validation_dedupe_privacy():
    bad = c.post("/api/public/enquiries", json={"name": "A", "email": "not-an-email", "message": "hi"})
    assert bad.status_code == 422
    good = {"name": "Buyer One", "email": "buyer1@example.com", "company": "Retail Co",
            "country": "Australia", "product_interest": "Brass urli", "quantity": "500 pcs",
            "message": "Need wholesale quote for brass urlis for retail chain.", "consent": True}
    assert c.post("/api/public/enquiries", json=good).status_code == 201
    assert c.post("/api/public/enquiries", json=good).status_code == 409  # 24h dupe
    pub = c.post("/api/public/enquiries", json={**good, "email": "buyer2@example.com"})
    assert pub.status_code == 201
    # public must not leak leads; unauth list blocked
    assert c.get("/api/enquiries").status_code in (401, 403)


def test_search_to_page_prefers_existing():
    r = c.post("/api/seo/search-to-page", json={"keyword": "brass urli wholesale"}, headers=H)
    assert r.status_code == 200
    assert "seo_title" in r.json()


def test_n8n_webhook_auth():
    assert c.post("/api/n8n/approval-webhook", json={"token": "wrong"}).status_code == 401
