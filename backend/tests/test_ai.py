"""AI Product Import + AI SEO + image-rights tests. AI/HTTP mocked — no keys needed."""
import io
import json
import struct
import zlib

import pytest
from fastapi.testclient import TestClient

import app.ai_import as ai_mod
import app.ai_seo as seo_mod
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


@pytest.fixture(autouse=True)
def _clear_rate_limits():
    from app import auth as auth_mod
    auth_mod._hits.clear()
    yield
    auth_mod._hits.clear()


def tiny_png():
    sig = b"\x89PNG\r\n\x1a\n"

    def chunk(t, d):
        cc = t + d
        return struct.pack(">I", len(d)) + cc + struct.pack(">I", zlib.crc32(cc) & 0xffffffff)
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", 4, 4, 8, 2, 0, 0, 0))
    idat = chunk(b"IDAT", zlib.compress(b"\x00" + b"\xff\x00\x00" * 4))
    return sig + ihdr + idat + chunk(b"IEND", b"")


AI_VISION = {"text": json.dumps({
    "name": "Brass Lotus Urli", "description": "A handcrafted brass urli.",
    "material": "Brass", "finish": "Polished", "color": "Gold",
    "dimensions": None, "tags": ["brass", "urli"],
    "seo_title": "Brass Lotus Urli Wholesale", "seo_description": "Wholesale brass urli.",
    "slug": "brass-lotus-urli", "alt_text": "Brass lotus urli",
    "keywords": ["brass urli wholesale"]})}


def _mock_vision(monkeypatch):
    monkeypatch.setattr(ai_mod, "analyze_image",
                        lambda *a, **k: {"text": AI_VISION["text"], "configured": True})
    monkeypatch.setattr(ai_mod, "llm_configured", lambda: True)


# ---------- rights enforcement ----------

def test_preview_rejects_missing_rights():
    r = c.post("/api/products/ai-preview",
               files={"file": ("u.png", tiny_png(), "image/png")},
               data={"mode": "image", "rights_source": ""}, headers=H)
    assert r.status_code == 400
    r2 = c.post("/api/products/ai-preview",
                files={"file": ("u.png", tiny_png(), "image/png")},
                data={"mode": "image", "rights_source": "scraped"}, headers=H)
    assert r2.status_code == 400


def test_image_preview_with_rights(monkeypatch):
    _mock_vision(monkeypatch)
    r = c.post("/api/products/ai-preview",
               files={"file": ("urli.png", tiny_png(), "image/png")},
               data={"mode": "image", "rights_source": "own",
                     "permission": "studio shoot"}, headers=H)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["source"].startswith("ai:")
    item = body["items"][0]
    assert item["name"] == "Brass Lotus Urli"
    assert item["material"] == "Brass"
    assert item["dimensions"] is None
    assert "dimensions" in item["needs_verification"]
    assert len(item["media_filenames"]) == 1
    # media row carries rights provenance
    db = SessionLocal()
    m = db.query(models.MediaFile).filter(
        models.MediaFile.filename == item["media_filenames"][0]).first()
    assert m is not None and m.source == "own" and m.permission == "studio shoot"
    assert m.has_thumb is True
    db.close()
    # thumbnail served
    t = c.get(f"/api/media/files/{item['media_filenames'][0]}?variant=thumb")
    assert t.status_code == 200
    assert t.headers["Content-Type"] == "image/jpeg"


def test_image_preview_rule_based_without_ai():
    r = c.post("/api/products/ai-preview",
               files={"file": ("mystery-bowl.png", tiny_png(), "image/png")},
               data={"mode": "image", "rights_source": "licensed",
                     "permission": "lic-123", "enrich": "false"}, headers=H)
    assert r.status_code == 201
    body = r.json()
    assert body["source"].startswith("rule-based")
    item = body["items"][0]
    assert item["material"] is None
    assert "material" in item["needs_verification"]


# ---------- CSV ----------

def test_csv_preview_and_cap():
    rows = ["name,material,finish,sku"] + \
           [f"CSV Item {i},Brass,Polished,NLI-CSV-{i}" for i in range(30)]
    r = c.post("/api/products/ai-preview",
               files={"file": ("items.csv", "\n".join(rows).encode(), "text/csv")},
               data={"mode": "csv", "rights_source": "supplier_authorised",
                     "permission": "Supplier Co", "enrich": "false"}, headers=H)
    assert r.status_code == 201
    body = r.json()
    assert len(body["items"]) == 25
    assert body["capped"] is True
    assert body["items"][0]["sku"] == "NLI-CSV-0"


# ---------- URL ----------

def test_url_requires_confirmation():
    r = c.post("/api/products/ai-preview",
               data={"mode": "url", "url": "https://example.com/x.png",
                     "rights_source": "own"}, headers=H)
    assert r.status_code == 400


def test_url_bad_content_type(monkeypatch):
    class FakeResp:
        content = b"<html></html>"
        headers = {"content-type": "text/html"}

        def raise_for_status(self):
            pass

    monkeypatch.setattr(ai_mod.httpx, "get", lambda *a, **k: FakeResp())
    r = c.post("/api/products/ai-preview",
               data={"mode": "url", "url": "https://example.com/page",
                     "rights_source": "own", "confirm_rights": "true"}, headers=H)
    assert r.status_code == 400


def test_url_image_import(monkeypatch):
    _mock_vision(monkeypatch)

    class FakeResp:
        content = tiny_png()
        headers = {"content-type": "image/png"}

        def raise_for_status(self):
            pass

    monkeypatch.setattr(ai_mod.httpx, "get", lambda *a, **k: FakeResp())
    r = c.post("/api/products/ai-preview",
               data={"mode": "url", "url": "https://supplier.example/bowl.png",
                     "rights_source": "supplier_authorised",
                     "permission": "Supplier Co",
                     "confirm_rights": "true"}, headers=H)
    assert r.status_code == 201, r.text
    assert r.json()["items"][0]["name"] == "Brass Lotus Urli"


# ---------- save ----------

def test_save_draft_then_duplicate_blocked(monkeypatch):
    _mock_vision(monkeypatch)
    prev = c.post("/api/products/ai-preview",
                  files={"file": ("save-me.png", tiny_png(), "image/png")},
                  data={"mode": "image", "rights_source": "own"}, headers=H).json()
    iid = prev["import_id"]
    r = c.post("/api/products/ai-save",
               json={"import_id": iid, "status": "draft"}, headers=H)
    assert r.status_code == 201, r.text
    assert r.json()["status"] == "saved"
    pid = r.json()["product_ids"][0]
    # draft not public
    assert c.get("/api/public/products/brass-lotus-urli").status_code == 404
    # product image carries rights
    prod = c.get(f"/api/products/{pid}", headers=H).json()
    assert prod["images"][0]["source"] == "own"
    # duplicate save blocked
    r2 = c.post("/api/products/ai-save",
                json={"import_id": iid, "status": "draft"}, headers=H)
    assert r2.status_code == 409


def test_save_published_with_overrides(monkeypatch):
    _mock_vision(monkeypatch)
    prev = c.post("/api/products/ai-preview",
                  files={"file": ("pub-me.png", tiny_png(), "image/png")},
                  data={"mode": "image", "rights_source": "own"}, headers=H).json()
    r = c.post("/api/products/ai-save",
               json={"import_id": prev["import_id"], "status": "published",
                     "overrides": {"0": {"name": "Published Test Urli",
                                         "slug": "published-test-urli"}}}, headers=H)
    assert r.status_code == 201
    pub = c.get("/api/public/products/published-test-urli")
    assert pub.status_code == 200
    assert pub.json()["name"] == "Published Test Urli"


# ---------- regenerate ----------

def test_regenerate_needs_ai():
    prev = c.post("/api/products/ai-preview",
                  files={"file": ("regen.png", tiny_png(), "image/png")},
                  data={"mode": "image", "rights_source": "own",
                        "enrich": "false"}, headers=H).json()
    r = c.post("/api/products/ai-regenerate",
               json={"import_id": prev["import_id"], "index": 0,
                     "fields": ["description"]}, headers=H)
    assert r.status_code == 400  # no AI provider configured


# ---------- concept imagery ----------

def test_generate_image_unconfigured():
    r = c.post("/api/products/ai-generate-image",
               json={"prompt": "a brass urli concept"}, headers=H)
    assert r.status_code == 400
    body = r.json()
    msg = (body.get("error") or body.get("detail") or "")
    assert "configured" in msg.lower()


def test_generate_image_mocked(monkeypatch):
    monkeypatch.setattr(ai_mod, "generate_image_bytes",
                        lambda p: {"image_bytes": tiny_png(), "mime": "image/png"})
    r = c.post("/api/products/ai-generate-image",
               json={"prompt": "a brass urli concept for catalogue"}, headers=H)
    assert r.status_code == 201, r.text
    fn = r.json()["file"]["filename"]
    assert "concept" in fn
    db = SessionLocal()
    m = db.query(models.MediaFile).filter(models.MediaFile.filename == fn).first()
    assert m.source == "ai_generated"
    assert "concept" in (m.permission or "").lower()
    db.close()


# ---------- history ----------

def test_import_history():
    r = c.get("/api/products/imports", headers=H)
    assert r.status_code == 200
    assert r.json()["total"] >= 1
    assert r.json()["items"][0]["status"] in ("previewed", "saved", "partial",
                                              "failed", "concept")


# ---------- AI SEO ----------

def test_ai_seo_rule_based_and_no_write():
    p = c.post("/api/products", json={"name": "SEO Probe Bowl",
                                      "slug": "seo-probe-bowl",
                                      "material": "Copper",
                                      "status": "draft"}, headers=H).json()
    r = c.post("/api/seo/ai-generate",
               json={"entity_type": "product", "entity_id": p["id"]}, headers=H)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["source"] == "rule-based"
    assert "Copper" in body["suggestions"]["seo_description"]
    assert "seo_title" in body["warnings"]["missing"]
    # nothing was written
    after = c.get(f"/api/products/{p['id']}", headers=H).json()
    assert after["seo_title"] == ""


def test_ai_seo_duplicate_warning():
    a = c.post("/api/products", json={"name": "Dup A", "slug": "dup-a",
                                      "status": "draft",
                                      "seo_title": "Shared SEO Title"}, headers=H).json()
    b = c.post("/api/products", json={"name": "Dup B", "slug": "dup-b",
                                      "status": "draft",
                                      "seo_title": "Shared SEO Title"}, headers=H).json()
    r = c.post("/api/seo/ai-generate",
               json={"entity_type": "product", "entity_id": b["id"],
                     "fields": ["seo_title"]}, headers=H)
    assert any("Dup A" in d for d in r.json()["warnings"]["duplicates"])
    assert c.post("/api/seo/ai-generate",
                  json={"entity_type": "product", "entity_id": 999999},
                  headers=H).status_code == 404
    assert c.post("/api/seo/ai-generate",
                  json={"entity_type": "widget", "entity_id": a["id"]},
                  headers=H).status_code == 400


def test_ai_seo_mocked_ai(monkeypatch):
    p = c.post("/api/products", json={"name": "AI SEO Bowl",
                                      "slug": "ai-seo-bowl",
                                      "material": "Brass",
                                      "status": "draft"}, headers=H).json()
    monkeypatch.setattr(seo_mod, "generate", lambda *a, **k: {"text": json.dumps({
        "seo_title": "AI Crafted Title Here", "primary_keyword": "brass bowl wholesale",
        "related_keywords": ["brass bowl supplier"]})})
    # force configured flag
    monkeypatch.setattr(seo_mod, "llm_configured", lambda: True)
    r = c.post("/api/seo/ai-generate",
               json={"entity_type": "product", "entity_id": p["id"]}, headers=H)
    assert r.json()["suggestions"]["seo_title"] == "AI Crafted Title Here"
    assert r.json()["source"].startswith("ai:")


def test_ai_seo_single_field_and_draft_facts(monkeypatch):    # single-field request returns only that field
    p = c.post("/api/products", json={"name": "Single Field Prod",
                                      "slug": "single-field-prod",
                                      "material": "Copper",
                                      "status": "draft"}, headers=H).json()
    r = c.post("/api/seo/ai-generate",
               json={"entity_type": "product", "entity_id": p["id"],
                     "fields": ["seo_description"]}, headers=H)
    assert r.status_code == 200
    assert set(r.json()["suggestions"]) == {"seo_description"}
    # unsaved draft: caller-supplied facts, no DB row
    r2 = c.post("/api/seo/ai-generate",
                json={"entity_type": "product", "entity_id": 0,
                      "fields": ["seo_title", "seo_description"],
                      "facts": {"material": "Brass", "category": "Urlis",
                                "description": "A polished brass urli."}}, headers=H)
    assert r2.status_code == 200, r2.text
    assert "Brass" in r2.json()["suggestions"]["seo_description"]
    # draft without facts rejected
    r3 = c.post("/api/seo/ai-generate",
                json={"entity_type": "product", "entity_id": 0,
                      "fields": ["seo_title"]}, headers=H)
    assert r3.status_code == 400
    # invalid fields rejected
    r4 = c.post("/api/seo/ai-generate",
                json={"entity_type": "product", "entity_id": p["id"],
                      "fields": ["price"]}, headers=H)
    assert r4.status_code == 400


# ---------- media / image rights editing ----------

def test_media_rights_edit():
    lst = c.get("/api/media", headers=H).json()
    mid = lst["items"][0]["id"]
    r = c.put(f"/api/media/{mid}",
              json={"alt_text": "Edited alt", "rights_source": "licensed",
                    "permission": "lic-999"}, headers=H)
    assert r.status_code == 200
    assert r.json()["alt_text"] == "Edited alt"
    assert r.json()["source"] == "licensed"
    assert c.put(f"/api/media/{mid}", json={"rights_source": "stolen"},
                headers=H).status_code == 400


def test_product_image_primary_switch():
    p = c.post("/api/products", json={"name": "Two Pic Prod",
                                      "slug": "two-pic-prod",
                                      "status": "draft",
                                      "image_urls": ["https://img.example/1.jpg",
                                                     "https://img.example/2.jpg"]},
               headers=H).json()
    imgs = p["images"]
    assert len(imgs) == 2
    second = imgs[1]["id"]
    r = c.put(f"/api/products/images/{second}",
              json={"is_primary": True, "alt_text": "Second view",
                    "rights_source": "own"}, headers=H)
    assert r.status_code == 200
    assert r.json()["is_primary"] is True
    prod = c.get(f"/api/products/{p['id']}", headers=H).json()
    primaries = [i for i in prod["images"] if i["url"].endswith("2.jpg")]
    assert primaries and prod["image"]["url"].endswith("2.jpg")


# ---------- catalogue filters ----------

def test_finish_and_moq_filters():
    c.post("/api/products", json={"name": "MOQ Filter Prod",
                                  "slug": "moq-filter-prod", "material": "Brass",
                                  "finish": "Antique Gold", "moq": "100 pcs",
                                  "status": "published"}, headers=H)
    r = c.get("/api/public/products?finish=antique")
    assert r.status_code == 200
    assert any(p["slug"] == "moq-filter-prod" for p in r.json()["items"])
    r2 = c.get("/api/public/products?has_moq=true")
    assert any(p["slug"] == "moq-filter-prod" for p in r2.json()["items"])


# ---------- rule-based name + description (no LLM needed) ----------

def test_rule_based_name_and_description():
    facts = {"material": "Brass", "finish": "Polished", "category": "Brass Diyas",
             "color": "Gold", "dimensions": "10 cm"}
    r = c.post("/api/seo/ai-generate",
               json={"entity_type": "product", "entity_id": 0,
                     "fields": ["name", "description"], "facts": facts}, headers=H)
    assert r.status_code == 200, r.text
    s = r.json()["suggestions"]
    assert s["name"] == "Polished Brass Diya"
    assert "brass" in s["description"].lower() and "Moradabad" in s["description"]
    assert "Gold" in s["description"] and "10 cm" in s["description"]
    # never invents: no dimensions given -> no dimensions claim
    r2 = c.post("/api/seo/ai-generate",
                json={"entity_type": "product", "entity_id": 0,
                      "fields": ["description"],
                      "facts": {"material": "Copper", "category": "Bowls"}}, headers=H)
    d2 = r2.json()["suggestions"]["description"]
    assert "Dimensions" not in d2 and "Minimum order" not in d2


def test_rule_based_name_guards():
    from app.ai_seo import _singularize, _rule_based_name
    assert _singularize("Brass") == "Brass"  # must not mangle
    assert _singularize("Brass Diyas") == "Brass Diya"
    assert _singularize("Urlis") == "Urli"
    assert _rule_based_name({}) is None
    assert _rule_based_name({"category": "Copper Bowls"}) == "Copper Bowl"
    # material already in category is not duplicated
    assert _rule_based_name({"material": "Brass", "category": "Brass Urlis"}) == "Brass Urli"
