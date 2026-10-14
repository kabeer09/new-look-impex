"""AI Product Import: image / CSV / authorised-URL analysis with rights enforcement.

Every import records kind, source, rights and status so failures can be
reviewed and retried. AI suggestions are previews — nothing is saved until
the admin explicitly saves as draft/published. Unknown fields are null +
flagged "needs verification"; the AI is instructed never to invent
dimensions, materials, prices, MOQs, stock, certifications or food-safety.
"""
from __future__ import annotations
import csv
import io
import json
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from . import models
from .auth import current_user, rate_limit, require_role
from .catalog import _save_product
from .config import settings
from .database import get_db
from .llm import analyze_image, generate, generate_image_bytes, llm_configured
from .media_store import (MAX_BYTES, public_url, read_file, save_bytes,
                          save_file, validate_rights)
from .schemas import ProductIn
from .text import slugify

router = APIRouter()

NOW = lambda: datetime.now(timezone.utc).replace(tzinfo=None)  # noqa: E731
CSV_PREVIEW_CAP = 25
FETCH_TIMEOUT_S = 20

VISION_PROMPT = """Analyse this product photo for New Look Impex, a Moradabad (India)
exporter of brass & copper handicrafts, metal home décor, urlis, bowls, diyas,
lanterns, festive and corporate-gifting products.
Return ONLY a JSON object with exactly these keys:
{"name": string|null, "description": string|null, "material": string|null,
"finish": string|null, "color": string|null, "dimensions": string|null,
"tags": [strings], "seo_title": string|null (<=60 chars),
"seo_description": string|null (<=155 chars), "slug": string|null (url-safe),
"alt_text": string|null, "keywords": [strings]}
Rules: describe ONLY what is visible. Dimensions ONLY if a ruler, scale
reference or explicit measurement text is visible — otherwise null. Material
only when visually confident (brass/copper/metal), else null. NEVER invent
prices, MOQ, stock, certifications, food-safety claims or manufacturing
details. Use null for anything uncertain."""

ENRICH_PROMPT = """You assist New Look Impex (Moradabad, India — brass & copper
handicrafts wholesaler). Given this product data: {data}
Return ONLY JSON with keys: {"description": string|null (2-3 factual sentences,
only from the given data), "seo_title": string|null (<=60 chars),
"seo_description": string|null (<=155 chars), "alt_text": string|null,
"tags": [strings], "keywords": [strings]}.
NEVER invent dimensions, materials, prices, MOQ, stock, certifications or
manufacturing details — use null when the data does not support a field."""


def _suggestion_base() -> dict:
    return {"name": None, "slug": None, "short_description": "", "description": None,
            "category_id": None, "category_name": "", "material": None,
            "finish": None, "color": None, "dimensions": None, "weight": "",
            "sku": "", "tags": [], "moq": "", "lead_time": "", "price": None,
            "currency": "USD", "price_on_request": True,
            "seo_title": None, "seo_description": None, "alt_text": None,
            "keywords": [], "media_filenames": [], "row_index": None,
            "needs_verification": []}


def _finalise(item: dict) -> dict:
    """Fill derived fields + needs_verification list."""
    if item.get("name") and not item.get("slug"):
        item["slug"] = slugify(item["name"])
    if item.get("name") and not item.get("alt_text"):
        item["alt_text"] = item["name"]
    verify = [k for k in ("name", "description", "material", "finish", "color",
                          "dimensions", "seo_title", "seo_description")
              if not item.get(k)]
    # tags/keywords empty is normal — not a verification blocker
    item["needs_verification"] = verify
    return item


def _parse_ai_json(text: str) -> dict | None:
    try:
        t = text.strip()
        if t.startswith("```"):
            t = t.split("```")[1]
            if t.lstrip().startswith("json"):
                t = t.lstrip()[4:]
        start, end = t.find("{"), t.rfind("}")
        if start == -1 or end == -1:
            return None
        obj = json.loads(t[start:end + 1])
        return obj if isinstance(obj, dict) else None
    except Exception:
        return None


def _ai_source() -> str:
    return f"ai:{settings.LLM_MODEL}" if llm_configured() else "rule-based"


def _suggest_from_image(image_bytes: bytes, mime: str, filename: str,
                        category_id: int | None) -> tuple[dict, str]:
    item = _suggestion_base()
    item["category_id"] = category_id
    stem = filename.rsplit(".", 1)[0].replace("-", " ").replace("_", " ").strip()
    res = analyze_image(image_bytes, mime, VISION_PROMPT)
    parsed = _parse_ai_json(res.get("text", "")) if res.get("text") else None
    if parsed:
        for k in ("name", "description", "material", "finish", "color",
                  "dimensions", "seo_title", "seo_description", "slug", "alt_text"):
            if parsed.get(k):
                item[k] = str(parsed[k])[:1500]
        item["tags"] = [str(t)[:60] for t in (parsed.get("tags") or [])][:12]
        item["keywords"] = [str(t)[:120] for t in (parsed.get("keywords") or [])][:12]
        return _finalise(item), _ai_source()
    # Rule-based fallback: name from filename only, everything else unverified.
    item["name"] = stem[:120] if stem else "Untitled import"
    item["slug"] = slugify(item["name"])
    item["alt_text"] = item["name"]
    item["needs_verification"] = ["description", "material", "finish", "color",
                                  "dimensions", "seo_title", "seo_description"]
    return item, "rule-based (no AI vision result — verify all fields)"


def _row_to_item(row: dict, idx: int, category_id: int | None) -> dict:
    item = _suggestion_base()
    item["row_index"] = idx
    for k in ("name", "slug", "short_description", "description", "material",
              "finish", "color", "dimensions", "weight", "sku", "moq",
              "lead_time", "seo_title", "seo_description", "alt_text"):
        v = (row.get(k) or "").strip()
        if v:
            item[k] = v
    tags = [t.strip() for t in (row.get("tags") or "").split(";") if t.strip()]
    if tags:
        item["tags"] = tags[:12]
    price_raw = (row.get("price") or "").strip()
    if price_raw:
        try:
            item["price"] = float(price_raw)
            item["price_on_request"] = False
        except ValueError:
            pass
    if (row.get("currency") or "").strip():
        item["currency"] = row["currency"].strip()[:8]
    cat_name = (row.get("category") or "").strip()
    if cat_name:
        item["category_name"] = cat_name
    if category_id:
        item["category_id"] = category_id
    return item


def _enrich_item(item: dict) -> dict:
    """AI-fill only the empty descriptive fields. Rule-based no-op when no LLM."""
    if not llm_configured():
        return item
    missing = [k for k in ("description", "seo_title", "seo_description", "alt_text")
               if not item.get(k)]
    if not missing and item.get("tags") and item.get("keywords"):
        return item
    data = {k: item.get(k) for k in ("name", "material", "finish", "color",
                                     "dimensions", "category_name", "tags") if item.get(k)}
    if not data:
        return item
    res = generate(ENRICH_PROMPT.format(data=json.dumps(data)[:1500]), max_tokens=500)
    parsed = _parse_ai_json(res.get("text", "")) if res.get("text") else None
    if not parsed:
        return item
    for k in ("description", "seo_title", "seo_description", "alt_text"):
        if k in missing and parsed.get(k):
            item[k] = str(parsed[k])[:1500]
    if not item.get("tags") and parsed.get("tags"):
        item["tags"] = [str(t)[:60] for t in parsed["tags"]][:12]
    if not item.get("keywords") and parsed.get("keywords"):
        item["keywords"] = [str(t)[:120] for t in parsed["keywords"]][:12]
    return item


def _resolve_category(db: Session, category_id: int | None,
                      category_name: str) -> int | None:
    if category_id:
        c = db.query(models.Category).filter(models.Category.id == category_id).first()
        if c:
            return c.id
    if category_name:
        from sqlalchemy import func
        c = db.query(models.Category).filter(
            func.lower(models.Category.name) == category_name.lower()).first()
        if c:
            return c.id
    return None


# ---------------- preview ----------------

@router.post("/api/products/ai-preview", status_code=201)
async def ai_preview(
    mode: str = Form("image"),
    file: UploadFile | None = File(None),
    url: str = Form(""),
    category_id: int | None = Form(None),
    rights_source: str = Form(""),
    confirm_rights: str = Form(""),
    permission: str = Form(""),
    enrich: str = Form("true"),
    db: Session = Depends(get_db),
    u=Depends(require_role("admin", "editor"))):
    rate_limit(f"ai-import:{u.email}", 10, 600)
    mode = (mode or "").strip().lower()
    if mode not in ("image", "csv", "url"):
        raise HTTPException(400, "mode must be image, csv or url.")
    try:
        rights = validate_rights(rights_source)
    except ValueError as e:
        raise HTTPException(400, str(e))
    perm_note = (permission or "").strip()[:512]
    do_enrich = (enrich or "").strip().lower() in ("true", "1", "yes")

    imp = models.ProductImport(kind=mode, rights_source=rights,
                               category_id=category_id,
                               status="previewed", created_by=u.email)
    db.add(imp)
    db.flush()
    try:
        items: list[dict] = []
        warnings: list[str] = []
        capped = False
        source = _ai_source()

        if mode == "url":
            if (confirm_rights or "").strip().lower() not in ("true", "1", "yes"):
                raise HTTPException(400, "URL import requires confirm_rights=true: "
                                         "confirm you have permission to reuse this content.")
            target = (url or "").strip()
            if not target.lower().startswith(("http://", "https://")):
                raise HTTPException(400, "Provide a valid http(s) URL.")
            imp.source_url = target[:1024]
            try:
                r = httpx.get(target, timeout=FETCH_TIMEOUT_S, follow_redirects=True,
                              headers={"User-Agent": "NewLookImpex-AI-Import/1.0"})
                r.raise_for_status()
            except Exception as e:
                raise HTTPException(502, f"Could not fetch URL: {type(e).__name__}")
            if len(r.content) > MAX_BYTES:
                raise HTTPException(400, "Remote file too large (max 8 MB).")
            ctype = r.headers.get("content-type", "").split(";")[0].strip().lower()
            fname = target.rstrip("/").rsplit("/", 1)[-1].split("?")[0][:120] or "remote"
            if ctype.startswith("image/"):
                meta = save_file(fname if "." in fname else fname + ".jpg",
                                 r.content, ctype, label=fname)
                _record_media(db, meta, rights, perm_note, imp.source_url)
                item, source = _suggest_from_image(r.content, ctype, fname, category_id)
                item["media_filenames"] = [meta["filename"]]
                items.append(_finalise(item))
            elif ctype in ("text/csv", "application/csv", "text/plain") or \
                    fname.lower().endswith(".csv"):
                items, capped = _preview_csv(r.text, category_id, do_enrich)
            else:
                raise HTTPException(400, f"URL content-type '{ctype or 'unknown'}' not supported. "
                                         "Import an image or CSV file, or upload the file directly.")
            imp.filename = fname[:255]
        else:
            if file is None:
                raise HTTPException(400, "Upload a file for image/csv mode.")
            content = await file.read()
            if not content:
                raise HTTPException(400, "Uploaded file is empty.")
            if len(content) > MAX_BYTES:
                raise HTTPException(400, "File too large (max 8 MB).")
            imp.filename = (file.filename or "upload")[:255]
            ext = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else ""
            if mode == "image":
                meta = save_file(file.filename or "image.jpg", content,
                                 file.content_type or "", label="ai-import")
                _record_media(db, meta, rights, perm_note, "")
                item, source = _suggest_from_image(
                    content, file.content_type or "image/jpeg",
                    file.filename or "image.jpg", category_id)
                item["media_filenames"] = [meta["filename"]]
                items.append(_finalise(item))
            else:  # csv
                try:
                    text = content.decode("utf-8-sig")
                except Exception:
                    raise HTTPException(400, "CSV must be UTF-8 encoded.")
                items, capped = _preview_csv(text, category_id, do_enrich)
                if do_enrich and llm_configured():
                    warnings.append("AI-enriched descriptions/SEO are suggestions — review before saving.")

        if not items:
            raise HTTPException(400, "No products found in the supplied input.")
        if capped:
            warnings.append(f"Preview capped at {CSV_PREVIEW_CAP} rows — split larger catalogues.")
        if source.startswith("rule-based"):
            warnings.append("No AI provider result — all substantive fields need verification.")
        imp.items_json = json.dumps(items)[:200000]
        db.commit()
        return {"import_id": imp.id, "source": source, "items": items,
                "warnings": warnings, "capped": capped}
    except HTTPException:
        imp.status = "failed"
        db.commit()
        raise
    except Exception as e:
        imp.status = "failed"
        imp.error = f"{type(e).__name__}: {str(e)[:500]}"
        db.commit()
        raise HTTPException(502, f"Import preview failed: {str(e)[:200]}")


def _record_media(db: Session, meta: dict, rights: str, perm_note: str,
                  source_url: str) -> None:
    db.add(models.MediaFile(filename=meta["filename"],
                            original_name=meta.get("original_name", "")[:255],
                            content_type=meta.get("content_type", ""),
                            size=meta.get("size", 0),
                            has_thumb=meta.get("has_thumb", False),
                            source=rights,
                            permission=(perm_note or source_url or "")[:512]))


def _preview_csv(text: str, category_id: int | None,
                 do_enrich: bool) -> tuple[list[dict], bool]:
    reader = csv.DictReader(io.StringIO(text))
    items: list[dict] = []
    capped = False
    for idx, row in enumerate(reader):
        if idx >= CSV_PREVIEW_CAP:
            capped = True
            break
        name = (row.get("name") or "").strip()
        if not name:
            continue
        item = _row_to_item(row, idx, category_id)
        if do_enrich:
            item = _enrich_item(item)
        items.append(_finalise(item))
    return items, capped


# ---------------- regenerate ----------------

@router.post("/api/products/ai-regenerate")
def ai_regenerate(payload: dict, db: Session = Depends(get_db),
                  u=Depends(require_role("admin", "editor"))):
    rate_limit(f"ai-import:{u.email}", 20, 600)
    imp = db.query(models.ProductImport).filter(
        models.ProductImport.id == int(payload.get("import_id", 0))).first()
    if not imp:
        raise HTTPException(404, "Import not found")
    try:
        items = json.loads(imp.items_json or "[]")
    except Exception:
        items = []
    idx = int(payload.get("index", 0))
    if not (0 <= idx < len(items)):
        raise HTTPException(400, "Invalid item index")
    fields = [str(f) for f in (payload.get("fields") or [])]
    if not fields:
        raise HTTPException(400, "Provide fields to regenerate.")
    allowed = {"name", "description", "material", "finish", "color", "dimensions",
               "tags", "seo_title", "seo_description", "slug", "alt_text", "keywords"}
    fields = [f for f in fields if f in allowed]
    if not fields:
        raise HTTPException(400, "No regenerable fields requested.")
    item = items[idx]
    if not llm_configured():
        raise HTTPException(400, "No AI provider configured — edit fields manually.")
    # Re-analyse from stored media when available, else enrich from item data.
    fresh: dict | None = None
    for fn in item.get("media_filenames", []):
        content, mime = read_file(fn)
        if content:
            sug, _ = _suggest_from_image(content, mime or "image/jpeg", fn,
                                         item.get("category_id"))
            fresh = sug
            break
    if fresh is None:
        fresh = _enrich_item({**item, **{f: None for f in fields
                                         if f in ("description", "seo_title",
                                                  "seo_description", "alt_text",
                                                  "tags", "keywords")}})
    for f in fields:
        if fresh.get(f):
            item[f] = fresh[f]
    _finalise(item)
    imp.items_json = json.dumps(items)[:200000]
    db.commit()
    return {"item": item, "source": _ai_source()}


# ---------------- save ----------------

@router.post("/api/products/ai-save", status_code=201)
def ai_save(payload: dict, db: Session = Depends(get_db),
            u=Depends(require_role("admin", "editor"))):
    imp = db.query(models.ProductImport).filter(
        models.ProductImport.id == int(payload.get("import_id", 0))).first()
    if not imp:
        raise HTTPException(404, "Import not found")
    if imp.status == "saved":
        raise HTTPException(409, "This import was already saved (duplicate protection).")
    try:
        items = json.loads(imp.items_json or "[]")
    except Exception:
        items = []
    if not items:
        raise HTTPException(400, "Import has no previewed items.")
    only = payload.get("index", None)
    if only is not None:
        only = int(only)
        if not (0 <= only < len(items)):
            raise HTTPException(400, "Invalid item index")
        items = [items[only]]
    status = str(payload.get("status", "draft")).strip().lower()
    if status not in ("draft", "published"):
        raise HTTPException(400, "status must be draft or published.")
    overrides = payload.get("overrides") or {}
    attach = payload.get("attach_media")
    product_ids: list[int] = []
    errors: list[str] = []
    for pos, item in enumerate(items):
        try:
            # Overrides keyed by row_index when present, else by position.
            okey = str(item.get("row_index")
                       if item.get("row_index") is not None else pos)
            ov = overrides.get(okey, {})
            if not isinstance(ov, dict):
                ov = {}
            merged = {**item, **ov}
            if not (merged.get("name") or "").strip():
                raise ValueError("Product name is required.")
            cat_id = _resolve_category(db, merged.get("category_id"),
                                       merged.get("category_name", "") or "")
            if imp.category_id and not cat_id:
                cat_id = _resolve_category(db, imp.category_id, "")
            price = merged.get("price")
            try:
                price = float(price) if price not in (None, "") else None
            except (TypeError, ValueError):
                price = None
            body = ProductIn(
                name=str(merged["name"]).strip()[:512],
                slug=(merged.get("slug") or "")[:512],
                short_description=str(merged.get("short_description") or "")[:2000],
                description=str(merged.get("description") or "")[:20000],
                category_id=cat_id,
                material=str(merged.get("material") or "")[:255],
                finish=str(merged.get("finish") or "")[:255],
                color=str(merged.get("color") or "")[:255],
                dimensions=str(merged.get("dimensions") or "")[:255],
                weight=str(merged.get("weight") or "")[:128],
                sku=str(merged.get("sku") or "")[:128],
                tags=[str(t)[:60] for t in (merged.get("tags") or [])][:20],
                moq=str(merged.get("moq") or "")[:128],
                lead_time=str(merged.get("lead_time") or "")[:128],
                packaging_info="",
                price=price, currency=str(merged.get("currency") or "USD")[:8],
                price_on_request=bool(merged.get("price_on_request", True)),
                featured=False, sort_order=0, status=status,
                seo_title=str(merged.get("seo_title") or "")[:512],
                seo_description=str(merged.get("seo_description") or "")[:1024],
                variant_data=[], spec_data=[], collection_ids=[],
                image_urls=[])
            p = models.Product(name=body.name, slug=slugify(body.slug or body.name))
            p = _save_product(p, body, db, is_new=True)
            # Attach media with rights provenance.
            media_fns = attach if isinstance(attach, list) else (merged.get("media_filenames") or [])
            for i, fn in enumerate(media_fns[:10]):
                db.add(models.ProductImage(
                    product_id=p.id, url=public_url(str(fn)),
                    alt_text=str(merged.get("alt_text") or p.name)[:512],
                    is_primary=(i == 0), sort_order=i,
                    source=imp.rights_source,
                    permission=(db.query(models.MediaFile)
                                  .filter(models.MediaFile.filename == str(fn))
                                  .first().permission
                                if db.query(models.MediaFile)
                                  .filter(models.MediaFile.filename == str(fn)).first()
                                else "")[:512]))
            db.commit()
            product_ids.append(p.id)
        except Exception as e:
            db.rollback()
            label = (item.get("name") or f"row {item.get('row_index', '?')}")
            errors.append(f"{label}: {type(e).__name__}: {str(e)[:150]}")
    if product_ids and not errors:
        imp.status = "saved"
    elif product_ids:
        imp.status = "partial"
        imp.error = "; ".join(errors)[:2000]
    else:
        imp.status = "failed"
        imp.error = "; ".join(errors)[:2000]
    db.commit()
    return {"product_ids": product_ids, "status": imp.status, "errors": errors}


# ---------------- concept imagery ----------------

@router.post("/api/products/ai-generate-image", status_code=201)
def ai_generate_image(payload: dict, db: Session = Depends(get_db),
                      u=Depends(require_role("admin", "editor"))):
    rate_limit(f"ai-image:{u.email}", 10, 3600)
    prompt = str(payload.get("prompt", "")).strip()
    if len(prompt) < 10:
        raise HTTPException(400, "Describe the concept in at least 10 characters.")
    label = str(payload.get("label", "") or "concept").strip()[:60]
    full_prompt = (f"Original product-concept visualisation for a wholesale handicraft "
                   f"catalogue (NOT a photograph of a real product): {prompt}. "
                   f"Brass/copper metal home décor style, studio presentation, no text, no watermark.")
    res = generate_image_bytes(full_prompt[:1000])
    if not res.get("image_bytes"):
        raise HTTPException(400, res.get("error") or "Image generation unavailable.")
    from .text import slugify as _slug
    fname = descriptive_name_helper(label)
    meta = save_bytes(fname, res["image_bytes"], res.get("mime") or "image/png")
    db.add(models.MediaFile(filename=meta["filename"], original_name=f"{label}.png",
                            content_type="image/png", size=meta["size"],
                            has_thumb=meta["has_thumb"], source="ai_generated",
                            permission="AI-generated concept — not a product photograph"))
    imp = models.ProductImport(kind="concept", filename=meta["filename"],
                               rights_source="ai_generated", status="saved",
                               created_by=u.email)
    db.add(imp)
    db.commit()
    return {"file": {"filename": meta["filename"], "url": public_url(meta["filename"])},
            "warning": "Concept imagery — do not present as a photograph of a real product.",
            "import_id": imp.id}


def descriptive_name_helper(label: str) -> str:
    from .media_store import descriptive_name
    return descriptive_name(label + ".png", label)


# ---------------- history ----------------

@router.get("/api/products/imports")
def list_imports(db: Session = Depends(get_db), u=Depends(current_user),
                 page: int = 1, page_size: int = 20):
    q = db.query(models.ProductImport).order_by(models.ProductImport.id.desc())
    total = q.count()
    rows = q.offset((page - 1) * page_size).limit(min(page_size, 50)).all()
    return {"total": total, "items": [
        {"id": r.id, "kind": r.kind, "filename": r.filename,
         "source_url": r.source_url, "rights_source": r.rights_source,
         "category_id": r.category_id, "status": r.status, "error": r.error,
         "created_by": r.created_by,
         "created_at": r.created_at.isoformat() if r.created_at else None}
        for r in rows]}
