"""AI Catalogue pipeline tests (spec §3-§17).

Covers: content generators (no hard claims, no fabricated specs), folder
scanner (dedupe, near-dup attach, originals preserved, idempotency) and the
admin API pipeline (analyze -> review -> approve -> publish, plus the
never-auto-publish guards). AI vision is mocked — no keys needed.
"""
import json
import struct
import zlib

import pytest
from fastapi.testclient import TestClient

import app.llm as llm_mod
import app.catalogue_ai as ca
import app.catalogue_api as capi
from app import config as cfg
from app import models
from app import product_scanner
from app.database import Base, engine, SessionLocal
from app.main import app
from app.auth import hash_pw

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
db = SessionLocal()
db.add(models.User(email="admin@test.example", password_hash=hash_pw("Secret123!"), role="admin"))
db.commit()
db.close()

c = TestClient(app)
H: dict = {}  # auth removed

FACTS = {"product_type": "water bottle", "category": "Copper Bottles",
         "material": "Copper", "finish": "hammered", "colour": "copper",
         "design": "hand hammered body with screw cap", "usage": "drinking water",
         "style": "traditional"}


def tiny_png(tail: bytes = b"", red: int = 255):
    """32x32 RGB PNG with pseudo-random pixels seeded by `red`.

    Distinct `red` => distinct pixels, sha256 AND perceptual hash (a 4x4
    image would hash degenerately and near-duplicate everything).
    `tail` appends bytes after IEND (Pillow ignores them) — used to produce a
    byte-different but pixel-identical near-duplicate."""
    import random
    rng = random.Random(red)
    raw = b"".join(b"\x00" + bytes(rng.randrange(256) for _ in range(32 * 3))
                   for _ in range(32))
    sig = b"\x89PNG\r\n\x1a\n"

    def chunk(t, d):
        cc = t + d
        return struct.pack(">I", len(d)) + cc + struct.pack(">I", zlib.crc32(cc) & 0xffffffff)
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", 32, 32, 8, 2, 0, 0, 0))
    idat = chunk(b"IDAT", zlib.compress(raw))
    return sig + ihdr + idat + chunk(b"IEND", b"") + tail


@pytest.fixture(autouse=True)
def _reset_scan_registry():
    """The sha256/phash registry persists across tests in the shared DB;
    clear it before each test so dedupe starts from a clean slate."""
    db = SessionLocal()
    db.query(models.ProductScanFile).delete()
    db.commit()
    db.close()
    yield


def use_tmp_scan(tmp_path, monkeypatch):
    root = tmp_path / "scan"
    root.mkdir(exist_ok=True)
    monkeypatch.setattr(cfg.settings, "PRODUCT_SCAN_DIR", str(root))
    monkeypatch.setattr(cfg.settings, "PRODUCT_SCAN_RIGHTS", "own")
    return root


# ---------------------------------------------------------------------------
# Content generators (spec §5-§9): claims-free, spec-free, complete
# ---------------------------------------------------------------------------

def test_descriptions_six_variants_no_hard_claims():
    d = ca.build_descriptions("Copper Water Bottle", FACTS)
    assert set(d) == {"short", "detailed", "b2b", "manufacturer", "indiamart", "buyer"}
    for key, text in d.items():
        assert text and len(text) > 50, key
        assert not ca.has_hard_claim(text), f"{key} contains a hard claim"
        assert ca.COMPANY in text or ca.BRAND in text, key
    # Unknowns are offered on request, never invented.
    assert "on request" in d["short"] or "on request" in d["b2b"]


def test_keywords_grouped_and_product_specific():
    kw = ca.build_keywords("Copper Water Bottle", FACTS)
    for group in ("primary", "secondary", "long_tail", "buyer_intent",
                  "manufacturer", "supplier", "exporter", "wholesale",
                  "bulk_order", "country_specific"):
        assert group in kw, group
    assert kw["primary"]
    assert "copper water bottle" in kw["primary"]
    assert any("manufacturer" in k for k in kw["secondary"])
    assert any("exporter" in k for k in kw["exporter"])
    assert any("USA" in k for k in kw["country_specific"])
    flat = " ".join(v for g in kw.values() for v in (g if isinstance(g, list) else [g]))
    assert not ca.has_hard_claim(flat)


def test_seo_metadata_limits_and_canonical():
    kw = ca.build_keywords("Copper Water Bottle", FACTS)
    seo = ca.build_seo("Copper Water Bottle", FACTS, kw,
                       canonical_base="https://newlookimpex.store")
    assert len(seo["title"]) <= ca.TITLE_MAX
    assert len(seo["meta_description"]) <= ca.META_MAX
    assert seo["slug"] and seo["focus_keyword"]
    assert seo["canonical_url"].endswith(f"/products/{seo['slug']}")
    assert ca.COMPANY in seo["title"]


def test_schema_has_no_offers_ratings_or_prices():
    kw = ca.build_keywords("Copper Water Bottle", FACTS)
    seo = ca.build_seo("Copper Water Bottle", FACTS, kw,
                       canonical_base="https://newlookimpex.store")
    desc = ca.build_descriptions("Copper Water Bottle", FACTS)
    schema = ca.build_schema("Copper Water Bottle", seo["slug"], desc, FACTS,
                             ["/api/media/files/x.jpg"],
                             canonical_url=seo["canonical_url"],
                             category_name="Copper Bottles")
    assert {"product", "organization", "website", "breadcrumb"} <= set(schema)
    p = schema["product"]
    assert p["@type"] == "Product"
    for banned in ("offers", "aggregateRating", "review", "price", "priceCurrency"):
        assert banned not in p, banned
    assert p["brand"]["name"] == ca.BRAND
    assert p["manufacturer"]["name"] == ca.COMPANY
    assert p["countryOfOrigin"]["name"] == "India"


def test_validate_observed_scrubs_claims_and_nulls_unknowns():
    out = ca.validate_observed({
        "product_type": "water bottle",
        "material": "100% pure copper",   # hard claim -> sentence dropped
        "finish": None,
        "features": ["leak proof cap", "keeps water healthy"],
        "observed_facts": ["copper bottle body visible"]})
    assert out["material"] != "100% pure copper"
    assert not out.get("finish")
    assert not any("leak" in f.lower() for f in out["features"])


def test_parse_ai_json_tolerates_fences():
    raw = '```json\n{"name": "Brass Diya"}\n```'
    assert ca.parse_ai_json(raw) == {"name": "Brass Diya"}
    assert ca.parse_ai_json("no json here") is None


def test_generate_payload_rule_based_flags_unknowns():
    payload = ca.generate_payload("Copper Water Bottle", {}, ["a.jpg"],
                                  ["/api/media/files/a.jpg"], slug="copper-bottle",
                                  canonical_base="https://newlookimpex.store",
                                  category_name="Copper Bottles")
    assert payload["source"].startswith("rule-based")
    for key in ("descriptions", "keywords", "seo", "image_seo", "schema", "b2b"):
        assert payload[key], key
    # Specs we cannot know are always flagged for verification.
    for unknown in ("dimensions", "weight", "moq", "price"):
        assert unknown in payload["needs_verification"]


def test_b2b_copy_has_no_certifications_or_stats():
    b2b = ca.build_b2b("Copper Water Bottle", FACTS)
    flat = " ".join(b2b.values()).lower()
    for banned in ("certified", "iso ", "fssai", "exported to ", "tons", "units per"):
        assert banned not in flat, banned


def test_image_hash_helpers():
    from app.image_hash import hamming_distance, perceptual_hash, sha256_hex
    a, b = tiny_png(), tiny_png()
    assert sha256_hex(a) == sha256_hex(b)
    assert sha256_hex(a) != sha256_hex(tiny_png(b"\x00extra"))
    pa, pb = perceptual_hash(a), perceptual_hash(b)
    assert pa and len(pa) == 16
    assert hamming_distance(pa, pb) == 0
    assert hamming_distance(pa, "") == 128


# ---------------------------------------------------------------------------
# Scanner (spec §3/§14)
# ---------------------------------------------------------------------------

def test_scan_creates_draft_with_pending_profile(tmp_path, monkeypatch):
    root = use_tmp_scan(tmp_path, monkeypatch)
    (root / "copper-bottle.png").write_bytes(tiny_png(red=11))
    counts = product_scanner.scan_once()
    assert counts["created"] == 1 and counts["failed"] == 0
    # ORIGINAL PRESERVED — the scanner never moves or deletes source files.
    assert (root / "copper-bottle.png").exists()
    db = SessionLocal()
    p = db.query(models.Product).filter(models.Product.slug == "copper-bottle").first()
    assert p is not None
    assert p.status == "draft"  # never auto-published
    prof = db.query(models.ProductSeoProfile).filter(
        models.ProductSeoProfile.product_id == p.id).first()
    assert prof is not None and prof.status == "pending"
    reg = db.query(models.ProductScanFile).filter(
        models.ProductScanFile.rel_path == "copper-bottle.png").first()
    assert reg is not None and reg.status == "ingested" and reg.sha256
    db.close()
    # Idempotent: re-scan skips the registered path.
    assert product_scanner.scan_once()["created"] == 0


def test_scan_exact_duplicate_not_new_product(tmp_path, monkeypatch):
    root = use_tmp_scan(tmp_path, monkeypatch)
    (root / "bottle-a.png").write_bytes(tiny_png(red=22))
    (root / "bottle-b-copy.png").write_bytes(tiny_png(red=22))  # identical bytes
    counts = product_scanner.scan_once()
    assert counts["created"] == 1 and counts["duplicates"] == 1
    db = SessionLocal()
    assert db.query(models.Product).filter(
        models.Product.slug == "bottle-a").count() == 1
    assert db.query(models.Product).filter(
        models.Product.slug == "bottle-b-copy").count() == 0
    dup = db.query(models.ProductScanFile).filter(
        models.ProductScanFile.rel_path == "bottle-b-copy.png").first()
    assert dup is not None and dup.status == "duplicate"
    db.close()


def test_scan_near_duplicate_attaches_extra_image(tmp_path, monkeypatch):
    root = use_tmp_scan(tmp_path, monkeypatch)
    (root / "front.png").write_bytes(tiny_png(red=33))
    # Same photo re-saved: different bytes, identical pixels -> extra image.
    # (Name must sort AFTER front.png — the scanner processes files in order.)
    (root / "front2.png").write_bytes(tiny_png(b"\x00resaved", red=33))
    counts = product_scanner.scan_once()
    assert counts["created"] == 1 and counts["attached"] == 1
    db = SessionLocal()
    p = db.query(models.Product).filter(models.Product.slug == "front").first()
    assert p is not None
    imgs = db.query(models.ProductImage).filter(
        models.ProductImage.product_id == p.id).order_by(
        models.ProductImage.sort_order).all()
    assert len(imgs) == 2
    assert imgs[0].is_primary and not imgs[1].is_primary
    db.close()


def test_scan_ignores_non_images_and_hidden(tmp_path, monkeypatch):
    root = use_tmp_scan(tmp_path, monkeypatch)
    (root / "notes.txt").write_bytes(b"not an image")
    (root / ".hidden.png").write_bytes(tiny_png(red=44))
    counts = product_scanner.scan_once()
    assert counts["scanned"] == 0


def test_pretty_name_from_camera_filenames():
    assert product_scanner._pretty_name("copper-bottle-hammered") == "Copper Bottle Hammered"
    assert "pending analysis" in product_scanner._pretty_name(
        "WhatsApp Image 2026-11-01 at 3.27.24 PM (1)").lower()


def test_scan_status_endpoint():
    r = c.get("/api/catalogue/status", headers=H)
    assert r.status_code == 200
    body = r.json()
    assert "scan_dir" in body and "last_run" in body and "llm_configured" in body


# ---------------------------------------------------------------------------
# Admin API pipeline (spec §10-§11)
# ---------------------------------------------------------------------------

MOCK_VISION = json.dumps({
    "product_type": "water bottle", "category": "Copper Bottles",
    "material": "Copper", "finish": "hammered", "colour": "copper",
    "design": "hand hammered body", "usage": "drinking water",
    "style": "traditional", "features": ["screw cap"],
    "observed_facts": ["copper bottle body visible", "screw cap visible"],
    "assumptions": [], "name": "Hammered Copper Water Bottle"})


def _mock_llm(monkeypatch):
    """Configure a fake vision+text provider (all core facts confident)."""
    monkeypatch.setattr(llm_mod, "llm_configured", lambda: True)
    monkeypatch.setattr(ca, "llm_configured", lambda: True)
    monkeypatch.setattr(capi, "llm_configured", lambda: True)
    monkeypatch.setattr(llm_mod, "analyze_image",
                        lambda *a, **k: {"text": MOCK_VISION, "configured": True})
    # ca imported `generate` at module level — patch where it's used.
    monkeypatch.setattr(ca, "generate",
                        lambda *a, **k: {"text": "", "configured": True})


def _scanned_product(root):
    db = SessionLocal()
    p = db.query(models.Product).filter(
        models.Product.source_url == "scan:api-flow.png").first()
    db.close()
    return p


def _scan_one(tmp_path, monkeypatch, name="api-flow.png", red=None):
    root = use_tmp_scan(tmp_path, monkeypatch)
    # Unique pixels per filename: sha256/phash registry persists across tests.
    if red is None:
        red = 1 + (sum(name.encode()) % 200)
    (root / name).write_bytes(tiny_png(red=red))
    product_scanner.scan_once()
    return root


def test_analyze_needs_review_without_llm(tmp_path, monkeypatch):
    _scan_one(tmp_path, monkeypatch)
    db = SessionLocal()
    p = db.query(models.Product).filter(
        models.Product.source_url == "scan:api-flow.png").first()
    pid = p.id
    db.close()
    r = c.post(f"/api/catalogue/products/{pid}/analyze", headers=H)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["profile"]["status"] == "needs_review"  # rule-based => review
    assert body["profile"]["descriptions"].get("detailed")
    assert body["profile"]["keywords"].get("primary")
    assert body["profile"]["seo"].get("title")
    assert body["product"]["has_description"]
    assert body["profile"]["source"].startswith("rule-based")


def test_full_flow_analyze_approve_publish(tmp_path, monkeypatch):
    _scan_one(tmp_path, monkeypatch, "flow-two.png")
    _mock_llm(monkeypatch)
    db = SessionLocal()
    p = db.query(models.Product).filter(
        models.Product.source_url == "scan:flow-two.png").first()
    pid = p.id
    db.close()

    r = c.post(f"/api/catalogue/products/{pid}/analyze", headers=H)
    assert r.status_code == 200, r.text
    body = r.json()
    # All core vision facts confident + LLM configured => ai_generated.
    assert body["profile"]["status"] == "ai_generated"
    assert body["profile"]["observed"].get("material") == "Copper"
    assert body["profile"]["observed_facts"]  # observed vs assumptions kept
    assert body["product"]["seo_complete"] is True  # title+meta+desc+kw+img

    # Publish before approve must be refused (spec §11: never auto-publish).
    r = c.post(f"/api/catalogue/products/{pid}/publish", headers=H)
    assert r.status_code == 409

    r = c.post(f"/api/catalogue/products/{pid}/approve", headers=H)
    assert r.status_code == 200, r.text
    assert r.json()["profile"]["status"] == "approved"

    r = c.post(f"/api/catalogue/products/{pid}/publish", headers=H)
    assert r.status_code == 200, r.text
    assert r.json()["profile"]["status"] == "published"
    assert r.json()["product"]["status"] == "published"

    # Now the public API serves it.
    slug = r.json()["product"]["slug"]
    pub = c.get(f"/api/public/products/{slug}", headers=H)
    assert pub.status_code == 200
    assert pub.json()["name"]


def test_approve_blocked_without_seo_title(tmp_path, monkeypatch):
    _scan_one(tmp_path, monkeypatch, "no-title.png")
    db = SessionLocal()
    p = db.query(models.Product).filter(
        models.Product.source_url == "scan:no-title.png").first()
    prof = db.query(models.ProductSeoProfile).filter(
        models.ProductSeoProfile.product_id == p.id).first()
    prof.status = "needs_review"  # as if analysis ran but produced nothing
    p.seo_title = ""
    db.commit()
    pid = p.id
    db.close()
    r = c.post(f"/api/catalogue/products/{pid}/approve", headers=H)
    assert r.status_code == 409  # no title => cannot approve
    msg = r.json().get("error") or r.json().get("detail") or ""
    assert "title" in msg.lower()


def test_regeneration_never_edits_published_copy(tmp_path, monkeypatch):
    _scan_one(tmp_path, monkeypatch, "published-one.png")
    _mock_llm(monkeypatch)
    db = SessionLocal()
    p = db.query(models.Product).filter(
        models.Product.source_url == "scan:published-one.png").first()
    pid = p.id
    db.close()
    c.post(f"/api/catalogue/products/{pid}/analyze", headers=H)
    c.post(f"/api/catalogue/products/{pid}/approve", headers=H)
    c.post(f"/api/catalogue/products/{pid}/publish", headers=H)
    db = SessionLocal()
    p = db.query(models.Product).filter(models.Product.id == pid).first()
    before_desc, before_seo = p.description, p.seo_title
    db.close()
    # Regenerate sections while published: profile re-enters review but the
    # live product copy must stay untouched (approve applies, not regenerate).
    r = c.post(f"/api/catalogue/products/{pid}/regenerate",
               json={"sections": ["descriptions", "seo"]}, headers=H)
    assert r.status_code == 200, r.text
    assert r.json()["profile"]["status"] == "needs_review"
    db = SessionLocal()
    p = db.query(models.Product).filter(models.Product.id == pid).first()
    assert p.description == before_desc
    assert p.seo_title == before_seo
    assert p.status == "published"
    db.close()


def test_manual_edit_moves_pipeline_to_review(tmp_path, monkeypatch):
    _scan_one(tmp_path, monkeypatch, "edited-two.png")
    _mock_llm(monkeypatch)
    db = SessionLocal()
    p = db.query(models.Product).filter(
        models.Product.source_url == "scan:edited-two.png").first()
    pid = p.id
    db.close()
    c.post(f"/api/catalogue/products/{pid}/analyze", headers=H)
    r = c.put(f"/api/catalogue/products/{pid}",
              json={"product_fields": {"description": "Hand-edited copy."}},
              headers=H)
    assert r.status_code == 200, r.text
    assert r.json()["profile"]["status"] == "needs_review"
    assert r.json()["product"]["has_description"]


def test_preview_google_serp_and_copy_blocks(tmp_path, monkeypatch):
    _scan_one(tmp_path, monkeypatch, "preview-one.png")
    _mock_llm(monkeypatch)
    db = SessionLocal()
    p = db.query(models.Product).filter(
        models.Product.source_url == "scan:preview-one.png").first()
    pid = p.id
    db.close()
    c.post(f"/api/catalogue/products/{pid}/analyze", headers=H)
    r = c.get(f"/api/catalogue/products/{pid}/preview", headers=H)
    assert r.status_code == 200
    body = r.json()
    assert body["google_preview"]["title"] and body["google_preview"]["url"]
    assert "indiamart_description" in body["copy_blocks"]
    assert body["copy_blocks"]["seo_keywords"]["primary"]
    prod_schema = body["json_ld"].get("product", {})
    assert "offers" not in prod_schema


def test_stats_and_list_filters(tmp_path, monkeypatch):
    _scan_one(tmp_path, monkeypatch, "stats-one.png")
    r = c.get("/api/catalogue/stats", headers=H)
    assert r.status_code == 200
    body = r.json()
    assert body["total_products"] >= 1
    for key in ("pending", "needs_review", "approved", "published_pipeline",
                "failed", "seo_completion_pct", "missing_images",
                "missing_descriptions", "missing_metadata"):
        assert key in body, key
    r = c.get("/api/catalogue/products?status=pending", headers=H)
    assert r.status_code == 200
    assert all(it["pipeline_status"] == "pending"
               for it in r.json()["items"])


def test_bulk_actions(tmp_path, monkeypatch):
    _scan_one(tmp_path, monkeypatch, "bulk-one.png")
    _scan_one(tmp_path, monkeypatch, "bulk-two.png")
    db = SessionLocal()
    ids = [p.id for p in db.query(models.Product).filter(
        models.Product.source_url.in_(
            ["scan:bulk-one.png", "scan:bulk-two.png"])).all()]
    db.close()
    assert len(ids) == 2
    r = c.post("/api/catalogue/bulk", json={"action": "mark_review", "ids": ids},
               headers=H)
    assert r.status_code == 200 and r.json()["done"] == 2
    # Invalid action rejected.
    r = c.post("/api/catalogue/bulk", json={"action": "nuke", "ids": ids},
               headers=H)
    assert r.status_code == 400


def test_delete_blocked_by_rfq_reference(tmp_path, monkeypatch):
    _scan_one(tmp_path, monkeypatch, "rfq-one.png")
    db = SessionLocal()
    p = db.query(models.Product).filter(
        models.Product.source_url == "scan:rfq-one.png").first()
    pid = p.id
    rfq = models.RFQ(reference_number="CAT-RFQ-1", full_name="Buyer",
                     business_email="buyer@x.example")
    db.add(rfq)
    db.flush()
    db.add(models.RFQItem(rfq_id=rfq.id, product_id=pid, product_name=p.name))
    db.commit()
    db.close()
    r = c.delete(f"/api/catalogue/products/{pid}", headers=H)
    assert r.status_code == 409
    # Clean up so later runs stay hermetic.
    db = SessionLocal()
    db.query(models.RFQ).filter(models.RFQ.reference_number == "CAT-RFQ-1").delete()
    db.query(models.Product).filter(models.Product.id == pid).delete()
    db.query(models.ProductSeoProfile).filter(
        models.ProductSeoProfile.product_id == pid).delete()
    db.commit()
    db.close()
