"""Quotation Management API — admin-only B2B quotations.

Production-ready CRUD with real persistence, status workflow, PDF generation,
duplicate/edit/delete, honest email sending and media-backed product images.
No fabricated buyer/business data; exporter defaults are editable in settings.
"""
from __future__ import annotations

import json
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from . import models
from .auth import current_user, require_role
from .database import get_db
from .email import send_email, email_configured
from .config import settings
from .media_store import save_file, public_url, ALLOWED_IMAGE_EXT
from pathlib import Path
from .quotation_pdf import build_quotation_pdf

router = APIRouter()

CURRENCIES = {"USD", "EUR", "GBP", "AED", "SAR", "INR", "AUD", "CAD"}
STATUSES = {"draft", "sent", "accepted", "rejected", "expired"}
DEFAULT_TERMS = "\n".join([
    "Quotation is valid until the specified expiry date.",
    "Prices and currency are as stated in this quotation.",
    "Shipping charges are estimates unless specifically confirmed.",
    "Production starts after order confirmation and agreed advance payment.",
    "Product specifications and customization must be approved before production.",
    "Delivery times are estimates and may depend on production and logistics.",
    "Import duties, customs clearance, destination taxes and charges are the buyer's responsibility unless otherwise agreed.",
    "Payment terms are as agreed in this quotation.",
    "Bulk production may require sample approval.",
    "Claims regarding damage or shortages must be reported within the agreed period.",
])


def _num(db: Session) -> str:
    year = datetime.now(timezone.utc).year
    prefix = f"NLI-QTN-{year}-"
    last = db.query(models.Quotation).filter(
        models.Quotation.number.like(prefix + "%")
    ).order_by(models.Quotation.number.desc()).first()
    seq = 1
    if last:
        try:
            seq = int(last.number.split("-")[-1]) + 1
        except ValueError:
            seq = 1
    return f"{prefix}{seq:04d}"


def _settings(db: Session) -> models.QuotationSetting:
    s = db.query(models.QuotationSetting).first()
    if not s:
        s = models.QuotationSetting(default_terms=DEFAULT_TERMS)
        db.add(s); db.commit(); db.refresh(s)
    if not s.default_terms:
        s.default_terms = DEFAULT_TERMS; db.commit()
    return s


def _exporter_dict(s: models.QuotationSetting) -> dict:
    return {
        "company_name": s.company_name, "address": s.address,
        "contact_person": s.contact_person, "email": s.email,
        "phone": s.phone, "whatsapp": s.whatsapp, "website": s.website,
        "gstin": s.gstin, "iec": s.iec,
    }


def _f(v, default=0.0):
    try:
        return float(v if v not in (None, "") else default)
    except (TypeError, ValueError):
        return default


def _qa(v):
    """Parse stored buyer Q&A JSON into a list; tolerate legacy/empty values."""
    if not v:
        return []
    try:
        out = json.loads(v)
        return out if isinstance(out, list) else []
    except (TypeError, ValueError):
        return []


def _calc(payload: dict):
    subtotal = 0.0
    for it in payload.get("items", []):
        line = round(_f(it.get("quantity")) * _f(it.get("unit_price")), 2)
        it["line_total"] = line
        subtotal += line
    subtotal = round(subtotal, 2)
    grand = round(subtotal + _f(payload.get("shipping_charges")) + _f(payload.get("packing_charges"))
                  + _f(payload.get("sample_charges")) - _f(payload.get("discount"))
                  + _f(payload.get("tax")), 2)
    return subtotal, grand


def _out(q: models.Quotation, db: Session) -> dict:
    items = db.query(models.QuotationItem).filter(
        models.QuotationItem.quotation_id == q.id
    ).order_by(models.QuotationItem.sort_order, models.QuotationItem.id).all()
    return {
        "id": q.id, "number": q.number, "status": q.status,
        "exporter": json.loads(q.exporter or "{}"),
        "buyer_company": q.buyer_company, "buyer_contact": q.buyer_contact,
        "buyer_email": q.buyer_email, "buyer_phone": q.buyer_phone,
        "buyer_whatsapp": q.buyer_whatsapp, "buyer_country": q.buyer_country,
        "buyer_address": q.buyer_address, "buyer_type": q.buyer_type, "buyer_notes": q.buyer_notes,
        "currency": q.currency, "shipping_method": q.shipping_method, "incoterm": q.incoterm,
        "shipping_charges": _f(q.shipping_charges), "packing_charges": _f(q.packing_charges),
        "sample_charges": _f(q.sample_charges), "discount": _f(q.discount), "tax": _f(q.tax),
        "port_loading": q.port_loading, "port_destination": q.port_destination,
        "delivery_time": q.delivery_time, "production_lead": q.production_lead,
        "payment_terms": q.payment_terms, "advance_pct": _f(q.advance_pct),
        "balance_terms": q.balance_terms,
        "quote_date": str(q.quote_date) if q.quote_date else None,
        "expiry_date": str(q.expiry_date) if q.expiry_date else None,
        "terms": q.terms, "buyer_qa": _qa(q.buyer_qa), "subtotal": _f(q.subtotal), "grand_total": _f(q.grand_total),
        "pdf_filename": q.pdf_filename, "pdf_url": q.pdf_url,
        "created_by": q.created_by,
        "created_at": q.created_at.isoformat() if q.created_at else None,
        "updated_at": q.updated_at.isoformat() if q.updated_at else None,
        "items": [{
            "id": i.id, "product_id": i.product_id, "sku": i.sku, "name": i.name,
            "description": i.description, "material": i.material, "dimensions": i.dimensions,
            "weight": i.weight, "images": json.loads(i.images or "[]"),
            "quantity": _f(i.quantity), "unit": i.unit, "unit_price": _f(i.unit_price),
            "moq": i.moq, "packaging": i.packaging, "line_total": _f(i.line_total),
            "sort_order": i.sort_order,
        } for i in items],
    }


def _write_items(db: Session, qid: int, items: list):
    db.query(models.QuotationItem).filter(models.QuotationItem.quotation_id == qid).delete()
    for idx, it in enumerate(items):
        db.add(models.QuotationItem(
            quotation_id=qid, product_id=it.get("product_id"), sku=str(it.get("sku") or "")[:128],
            name=str(it.get("name") or "")[:512], description=it.get("description") or "",
            material=str(it.get("material") or "")[:128], dimensions=str(it.get("dimensions") or "")[:255],
            weight=str(it.get("weight") or "")[:128], images=json.dumps(it.get("images") or []),
            quantity=_f(it.get("quantity")), unit=str(it.get("unit") or "pcs")[:64],
            unit_price=_f(it.get("unit_price")), moq=str(it.get("moq") or "")[:128],
            packaging=it.get("packaging") or "", line_total=_f(it.get("line_total")),
            sort_order=int(it.get("sort_order") or idx)))


def _apply_payload(q: models.Quotation, p: dict, db: Session):
    s = _settings(db)
    exporter = p.get("exporter") or _exporter_dict(s)
    q.exporter = json.dumps(exporter)
    q.buyer_company = str(p.get("buyer_company") or "")[:255]
    q.buyer_contact = str(p.get("buyer_contact") or "")[:255]
    q.buyer_email = str(p.get("buyer_email") or "")[:255]
    q.buyer_phone = str(p.get("buyer_phone") or "")[:128]
    q.buyer_whatsapp = str(p.get("buyer_whatsapp") or "")[:128]
    q.buyer_country = str(p.get("buyer_country") or "")[:128]
    q.buyer_address = p.get("buyer_address") or ""
    q.buyer_type = str(p.get("buyer_type") or "")[:128]
    q.buyer_notes = p.get("buyer_notes") or ""
    cur = str(p.get("currency") or "USD").upper()
    q.currency = cur if cur in CURRENCIES else "USD"
    q.shipping_method = str(p.get("shipping_method") or "")[:64]
    q.incoterm = str(p.get("incoterm") or "")[:32]
    q.shipping_charges = _f(p.get("shipping_charges"))
    q.packing_charges = _f(p.get("packing_charges"))
    q.sample_charges = _f(p.get("sample_charges"))
    q.discount = _f(p.get("discount"))
    q.tax = _f(p.get("tax"))
    q.port_loading = str(p.get("port_loading") or "")[:255]
    q.port_destination = str(p.get("port_destination") or "")[:255]
    q.delivery_time = str(p.get("delivery_time") or "")[:255]
    q.production_lead = str(p.get("production_lead") or "")[:255]
    q.payment_terms = p.get("payment_terms") or ""
    q.advance_pct = _f(p.get("advance_pct"))
    q.balance_terms = p.get("balance_terms") or ""
    q.terms = p.get("terms") or s.default_terms or DEFAULT_TERMS
    qa = p.get("buyer_qa")
    if isinstance(qa, str):
        q.buyer_qa = qa
    elif qa:
        q.buyer_qa = json.dumps(qa)
    else:
        q.buyer_qa = ""
    for fld in ("quote_date", "expiry_date"):
        val = p.get(fld)
        setattr(q, fld, date.fromisoformat(val) if val else None)
    sub, grand = _calc(p)
    q.subtotal, q.grand_total = sub, grand
    return p.get("items", [])


# ---------- settings ----------
@router.get("/api/quotation-settings")
def get_quote_settings(db: Session = Depends(get_db), u=Depends(current_user)):
    s = _settings(db)
    return {"company_name": s.company_name, "address": s.address,
            "contact_person": s.contact_person, "email": s.email, "phone": s.phone,
            "whatsapp": s.whatsapp, "website": s.website, "gstin": s.gstin, "iec": s.iec,
            "default_currency": s.default_currency, "default_terms": s.default_terms,
            "validity_days": s.validity_days}


@router.put("/api/quotation-settings")
def put_quote_settings(p: dict, db: Session = Depends(get_db), u=Depends(require_role("admin"))):
    s = _settings(db)
    for k in ("company_name", "address", "contact_person", "email", "phone", "whatsapp",
              "website", "gstin", "iec", "default_currency", "default_terms"):
        if k in p:
            setattr(s, k, str(p[k] or "")[:8000])
    if "validity_days" in p:
        s.validity_days = int(_f(p["validity_days"], 30)) or 30
    db.commit()
    return {"saved": True}


# ---------- image upload (persistent via media_store) ----------
@router.post("/api/quotations/upload", status_code=201)
async def quote_upload(files: list[UploadFile] = File(...),
                       db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    from .media_store import save_file as _save, public_url as _url
    saved = []
    for f in files:
        content = await f.read()
        ext = Path(f.filename or "image.jpg").suffix.lower()
        if ext not in ALLOWED_IMAGE_EXT:
            raise HTTPException(400, f"Unsupported image type: {ext}")
        meta = _save(f.filename or "image.jpg", content, f.content_type or "image/jpeg")
        db.add(models.MediaFile(filename=meta["filename"], original_name=(f.filename or "")[:255],
                                content_type=meta.get("content_type", ""), size=meta.get("size", 0),
                                source="own", alt_text="Quotation product image"))
        db.commit()
        saved.append({"filename": meta["filename"], "url": _url(meta["filename"])})
    return {"files": saved}


# ---------- CRUD ----------
@router.get("/api/quotations")
def list_quotes(status: str = "", country: str = "", buyer: str = "",
                 date_from: str = "", date_to: str = "", search: str = "",
                 page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
                 db: Session = Depends(get_db), u=Depends(current_user)):
    q = db.query(models.Quotation)
    if status in STATUSES:
        q = q.filter(models.Quotation.status == status)
    if country:
        q = q.filter(models.Quotation.buyer_country.ilike(f"%{country}%"))
    if buyer:
        q = q.filter(models.Quotation.buyer_company.ilike(f"%{buyer}%"))
    if date_from:
        q = q.filter(models.Quotation.quote_date >= date.fromisoformat(date_from))
    if date_to:
        q = q.filter(models.Quotation.quote_date <= date.fromisoformat(date_to))
    if search:
        like = f"%{search}%"
        q = q.filter(models.Quotation.number.ilike(like) |
                     models.Quotation.buyer_company.ilike(like) |
                     models.Quotation.buyer_email.ilike(like))
    total = q.count()
    rows = q.order_by(models.Quotation.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "page": page, "page_size": page_size,
            "items": [{k: v for k, v in _out(r, db).items() if k != "items"} | {"item_count": len(_out(r, db)["items"])} for r in rows]}


@router.post("/api/quotations", status_code=201)
def create_quote(p: dict, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    # Manual quotations must work for a buyer whose email is not yet known.
    # A buyer company/name is the only required field.
    if not (p.get("buyer_company") or p.get("buyer_contact")):
        raise HTTPException(400, "Buyer company or name is required.")
    if not p.get("items"):
        raise HTTPException(400, "Add at least one product.")
    q = models.Quotation(number=_num(db), status=p.get("status", "draft") if p.get("status", "draft") in STATUSES else "draft",
                         created_by=u.email)
    items = _apply_payload(q, p, db)
    db.add(q); db.flush()
    _write_items(db, q.id, items)
    db.commit(); db.refresh(q)
    return _out(q, db)


@router.get("/api/quotations/{qid}")
def get_quote(qid: int, db: Session = Depends(get_db), u=Depends(current_user)):
    q = db.query(models.Quotation).filter(models.Quotation.id == qid).first()
    if not q:
        raise HTTPException(404, "Quotation not found")
    return _out(q, db)


@router.put("/api/quotations/{qid}")
def update_quote(qid: int, p: dict, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    q = db.query(models.Quotation).filter(models.Quotation.id == qid).first()
    if not q:
        raise HTTPException(404, "Quotation not found")
    if q.status in ("accepted",):
        raise HTTPException(409, "Accepted quotations are locked; duplicate to edit.")
    items = _apply_payload(q, p, db)
    _write_items(db, q.id, items)
    db.commit(); db.refresh(q)
    return _out(q, db)


@router.delete("/api/quotations/{qid}")
def delete_quote(qid: int, db: Session = Depends(get_db), u=Depends(require_role("admin"))):
    q = db.query(models.Quotation).filter(models.Quotation.id == qid).first()
    if not q:
        raise HTTPException(404, "Quotation not found")
    db.query(models.QuotationItem).filter(models.QuotationItem.quotation_id == qid).delete()
    db.delete(q); db.commit()
    return {"deleted": qid}


@router.post("/api/quotations/{qid}/duplicate", status_code=201)
def duplicate_quote(qid: int, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    src = db.query(models.Quotation).filter(models.Quotation.id == qid).first()
    if not src:
        raise HTTPException(404, "Quotation not found")
    d = _out(src, db)
    d["status"] = "draft"
    nq = models.Quotation(number=_num(db), status="draft", created_by=u.email)
    items = _apply_payload(nq, d, db)
    db.add(nq); db.flush()
    _write_items(db, nq.id, items)
    db.commit(); db.refresh(nq)
    return _out(nq, db)


@router.post("/api/quotations/{qid}/status")
def set_status(qid: int, p: dict, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    q = db.query(models.Quotation).filter(models.Quotation.id == qid).first()
    if not q:
        raise HTTPException(404, "Quotation not found")
    st = str(p.get("status") or "")
    if st not in STATUSES:
        raise HTTPException(400, f"status must be one of {sorted(STATUSES)}")
    q.status = st; db.commit()
    return {"id": qid, "status": st}


# ---------- PDF ----------
@router.get("/api/quotations/{qid}/pdf")
def quote_pdf(qid: int, db: Session = Depends(get_db), u=Depends(current_user)):
    q = db.query(models.Quotation).filter(models.Quotation.id == qid).first()
    if not q:
        raise HTTPException(404, "Quotation not found")
    items = db.query(models.QuotationItem).filter(
        models.QuotationItem.quotation_id == qid
    ).order_by(models.QuotationItem.sort_order, models.QuotationItem.id).all()
    pdf = build_quotation_pdf(q, items, _settings(db))
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename={q.number}.pdf'})


# ---------- send email (honest) ----------
@router.post("/api/quotations/{qid}/send-email")
def quote_send_email(qid: int, p: dict, db: Session = Depends(get_db),
                     u=Depends(require_role("admin", "editor"))):
    q = db.query(models.Quotation).filter(models.Quotation.id == qid).first()
    if not q:
        raise HTTPException(404, "Quotation not found")
    to = str(p.get("email") or q.buyer_email or "").strip()
    if not to:
        raise HTTPException(400, "No recipient email on this quotation.")
    if not email_configured():
        return {"sent": False, "detail": "SMTP not configured", "to": to}
    pdf = None
    try:
        items = db.query(models.QuotationItem).filter(
            models.QuotationItem.quotation_id == qid).all()
        pdf = build_quotation_pdf(q, items, _settings(db))
    except Exception:
        pdf = None
    body = (f"Dear {q.buyer_contact or q.buyer_company},\n\n"
            f"Please find quotation {q.number} for {q.buyer_company}.\n"
            f"Currency: {q.currency} · Grand total: {q.grand_total}\n"
            f"Valid until: {q.expiry_date or '-'}\n\n"
            f"Regards,\n{q.created_by or 'New Look Impex'}")
    ok, detail = send_email(to, f"Quotation {q.number} — New Look Impex", body)
    if ok:
        q.status = "sent"
        db.commit()
    return {"sent": ok, "detail": detail, "to": to, "pdf_attached": bool(pdf)}
