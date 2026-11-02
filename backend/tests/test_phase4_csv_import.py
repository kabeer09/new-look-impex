"""Phase-4 tests: CSV product import workflow — template download, preview
(validation + duplicate detection + create/update classification), and commit
modes with the never-auto-publish safety rule."""
from fastapi.testclient import TestClient
import pytest

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
def _reset_rate_limit():
    from app.auth import _hits
    _hits.clear()
    yield
    _hits.clear()


def test_template_download_open():
    # Auth removed: template download no longer requires a token.
    assert c.get("/api/products/import/template").status_code == 200


def test_template_download_has_header_and_example():
    r = c.get("/api/products/import/template", headers=H)
    assert r.status_code == 200
    assert "text/csv" in r.headers["content-type"]
    lines = [l for l in r.text.strip().splitlines() if l]
    assert lines[0].startswith("external_product_id,name,slug")
    assert len(lines) >= 2  # header + example row


def test_preview_classifies_create_and_detects_errors():
    csv_text = (
        "name,external_product_id,price,status\n"
        "New Copper Kettle,KTL-1,88.5,draft\n"
        ",NO-NAME-1,10,draft\n"
        "Bad Price,PRC-1,notanumber,draft\n"
    )
    r = c.post("/api/products/import/preview", json={"csv": csv_text}, headers=H)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["counts"]["create"] == 1      # New Copper Kettle
    assert body["counts"]["error"] == 2       # missing name + bad price
    assert body["counts"]["update"] == 0
    # Nothing actually written during preview
    from app.database import SessionLocal as SL
    s = SL()
    try:
        assert s.query(models.Product).filter(models.Product.external_product_id == "KTL-1").count() == 0
    finally:
        s.close()


def test_preview_flags_duplicate_external_ids_within_file():
    csv_text = (
        "name,external_product_id\n"
        "First,DUPE-1\n"
        "Second,DUPE-1\n"
    )
    r = c.post("/api/products/import/preview", json={"csv": csv_text}, headers=H)
    assert r.status_code == 200, r.text
    dup_errors = [e for row in r.json()["rows"] for e in row["errors"] if "duplicate external_product_id" in e]
    assert dup_errors


def test_preview_flags_unknown_category_but_not_hard_error():
    # Use a category name that can never exist so the test is robust to other
    # modules seeding real categories into the shared DB.
    csv_text = "name,category\nNo Such Cat,ZZZ Definitely Not A Category 999\n"
    r = c.post("/api/products/import/preview", json={"csv": csv_text}, headers=H)
    assert r.status_code == 200, r.text
    row = r.json()["rows"][0]
    assert row["action"] == "create"
    assert any("unknown category" in e for e in row["errors"])


def test_commit_creates_and_never_auto_publishes():
    csv_text = "name,external_product_id,status\nImported Draft,IMP-1,published\n"
    # default auto_publish=false -> imported row is forced to draft
    r = c.post("/api/products/import/commit", json={"csv": csv_text, "mode": "create_new_only"}, headers=H)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["created"] == 1
    assert body["auto_publish"] is False
    from app.database import SessionLocal as SL
    s = SL()
    try:
        p = s.query(models.Product).filter(models.Product.external_product_id == "IMP-1").first()
        assert p is not None
        assert p.status == "draft", "imported product must NOT auto-publish"
    finally:
        s.close()


def test_commit_update_only_skips_new():
    # seed one existing product keyed by external id
    c.post("/api/products", headers=H,
           json={"name": "Existing One", "external_product_id": "EX-100", "status": "draft"})
    csv_text = (
        "name,external_product_id\n"
        "Existing One Updated,EX-100\n"
        "Brand New,NEW-100\n"
    )
    r = c.post("/api/products/import/commit",
               json={"csv": csv_text, "mode": "update_only"}, headers=H)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["created"] == 0
    assert body["updated"] == 1   # EX-100 updated
    assert body["skipped"] == 1   # NEW-100 skipped in update_only mode
    from app.database import SessionLocal as SL
    s = SL()
    try:
        assert s.query(models.Product).filter(models.Product.external_product_id == "NEW-100").count() == 0
        p = s.query(models.Product).filter(models.Product.external_product_id == "EX-100").first()
        assert p is not None and p.name == "Existing One Updated"
    finally:
        s.close()


def test_commit_upsert_updates_existing_by_external_id():
    # seed an existing product with an external id
    c.post("/api/products", headers=H,
           json={"name": "Seed Product", "external_product_id": "SEED-1", "status": "draft"})
    csv_text = "name,external_product_id\nRenamed Seed Product,SEED-1\n"
    r = c.post("/api/products/import/commit",
               json={"csv": csv_text, "mode": "update_existing"}, headers=H)
    assert r.status_code == 200, r.text
    assert r.json()["updated"] == 1
    from app.database import SessionLocal as SL
    s = SL()
    try:
        p = s.query(models.Product).filter(models.Product.external_product_id == "SEED-1").first()
        assert p is not None and p.name == "Renamed Seed Product"
    finally:
        s.close()


def test_commit_invalid_mode_rejected():
    assert c.post("/api/products/import/commit",
                  json={"csv": "name\nX\n", "mode": "bogus"}, headers=H).status_code == 400


def test_import_endpoints_open():
    # Auth removed: import commit/preview no longer require a token.
    assert c.post("/api/products/import/preview", json={"csv": "name\nX\n"}, headers=H).status_code == 200
