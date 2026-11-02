"""Drop-folder watcher + banners tests. AI vision mocked — no keys needed."""
import struct
import zlib
from pathlib import Path

from fastapi.testclient import TestClient

import app.ai_import as ai_mod
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


def tiny_png():
    sig = b"\x89PNG\r\n\x1a\n"

    def chunk(t, d):
        cc = t + d
        return struct.pack(">I", len(d)) + cc + struct.pack(">I", zlib.crc32(cc) & 0xffffffff)
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", 4, 4, 8, 2, 0, 0, 0))
    idat = chunk(b"IDAT", zlib.compress(b"\x00" + b"\xff\x00\x00" * 4))
    return sig + ihdr + idat + chunk(b"IEND", b"")


def use_tmp_incoming(tmp_path, monkeypatch):
    import app.watcher as wmod
    from app import config as cfg
    root = tmp_path / "incoming"
    (root / "products").mkdir(parents=True)
    (root / "banners").mkdir(parents=True)
    monkeypatch.setattr(cfg.settings, "INCOMING_DIR", str(root))
    monkeypatch.setattr(cfg.settings, "INCOMING_RIGHTS", "own")
    monkeypatch.setattr(wmod.settings, "INCOMING_DIR", str(root))
    monkeypatch.setattr(wmod.settings, "INCOMING_RIGHTS", "own")
    return root


# ---------- banners CRUD ----------

def test_banner_crud_and_public():
    before = {b["id"] for b in c.get("/api/public/banners").json()["items"]}
    b = c.post("/api/banners", json={"title": "Test Banner",
                                     "image_url": "/api/media/files/x.png",
                                     "cta_text": "Shop", "cta_link": "/products"},
               headers=H)
    assert b.status_code == 201, b.text
    bid = b.json()["id"]
    pub = c.get("/api/public/banners")
    assert bid in {x["id"] for x in pub.json()["items"]} - before
    # deactivate hides it publicly
    c.put(f"/api/banners/{bid}", json={"is_active": False}, headers=H)
    assert bid not in {x["id"] for x in c.get("/api/public/banners").json()["items"]}
    assert c.delete(f"/api/banners/{bid}", headers=H).status_code == 200


def test_watcher_status_endpoint():
    r = c.get("/api/admin/watcher", headers=H)
    assert r.status_code == 200
    assert "enabled" in r.json() and "last_run" in r.json()


# ---------- watcher: products ----------

def test_watch_product_creates_draft(tmp_path, monkeypatch):
    root = use_tmp_incoming(tmp_path, monkeypatch)
    import app.watcher as wmod
    monkeypatch.setattr(ai_mod, "analyze_image",
                        lambda *a, **k: {"text": '{"name": "Watch Brass Bowl", "material": "Brass"}',
                                         "configured": True})
    monkeypatch.setattr(ai_mod, "llm_configured", lambda: True)
    (root / "products" / "watch-brass-bowl.png").write_bytes(tiny_png())
    counts = wmod.scan_once()
    assert counts == {"products": 1, "banners": 0, "failed": 0}
    # file moved away (idempotency)
    assert not (root / "products" / "watch-brass-bowl.png").exists()
    assert (root / "processed" / "watch-brass-bowl.png").exists()
    db = SessionLocal()
    p = db.query(models.Product).filter(models.Product.slug == "watch-brass-bowl").first()
    assert p is not None
    assert p.status == "draft"  # never auto-published by default
    assert p.material == "Brass"
    imgs = db.query(models.ProductImage).filter(models.ProductImage.product_id == p.id).all()
    assert len(imgs) == 1 and imgs[0].source == "own"
    imp = db.query(models.ProductImport).filter(
        models.ProductImport.kind == "watch",
        models.ProductImport.filename == "watch-brass-bowl.png").first()
    assert imp is not None and imp.status == "saved"
    db.close()
    # second scan finds nothing (idempotent)
    assert wmod.scan_once() == {"products": 0, "banners": 0, "failed": 0}


def test_watch_product_category_subfolder(tmp_path, monkeypatch):
    root = use_tmp_incoming(tmp_path, monkeypatch)
    import app.watcher as wmod
    db = SessionLocal()
    cat = models.Category(name="Watch Cat", slug="watch-cat", status="published")
    db.add(cat); db.commit(); db.refresh(cat)
    db.close()
    (root / "products" / "watch-cat").mkdir(parents=True, exist_ok=True)
    (root / "products" / "watch-cat" / "cat-item.png").write_bytes(tiny_png())
    wmod.scan_once()
    db = SessionLocal()
    p = db.query(models.Product).filter(models.Product.name == "Cat Item").first()
    assert p is not None and p.category_id == cat.id
    db.close()


def test_watch_bad_file_goes_to_failed(tmp_path, monkeypatch):
    root = use_tmp_incoming(tmp_path, monkeypatch)
    import app.watcher as wmod
    (root / "products" / "corrupt.png").write_bytes(b"not an image at all")
    counts = wmod.scan_once()
    assert counts["failed"] == 1
    assert (root / "failed" / "corrupt.png").exists()
    db = SessionLocal()
    imp = db.query(models.ProductImport).filter(
        models.ProductImport.filename == "corrupt.png").first()
    assert imp is not None and imp.status == "failed" and imp.error != ""
    db.close()


# ---------- watcher: banners ----------

def test_watch_banner_creates_record(tmp_path, monkeypatch):
    root = use_tmp_incoming(tmp_path, monkeypatch)
    import app.watcher as wmod
    (root / "banners" / "diwali-sale.png").write_bytes(tiny_png())
    counts = wmod.scan_once()
    assert counts["banners"] == 1
    pub = c.get("/api/public/banners")
    titles = [x["title"] for x in pub.json()["items"]]
    assert "Diwali Sale" in titles
    # cleanup so later runs stay hermetic
    db = SessionLocal()
    b = db.query(models.Banner).filter(models.Banner.title == "Diwali Sale").first()
    if b:
        db.delete(b); db.commit()
    db.close()
