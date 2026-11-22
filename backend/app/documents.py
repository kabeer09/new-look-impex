"""Document Studio API — invoices, saved buyers, company profile, conversions.

Complements the existing quotations router. Everything is manual-entry first:
an invoice works for a buyer and product that are NOT in the system/catalogue.
All admin operations use existing auth. No invented figures or FX conversion.
"""
from __future__ import annotations

import json
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from . import models
from .auth import current_user, require_role
from .database import get_db
from .email import send_email, email_configured
from .media_store import save_file, public_url
from .invoice_pdf import build_invoice_pdf

router = APIRouter()
CURRENCIES = {"USD", "EUR", "GBP", "AED", "SAR", "INR", "AUD", "CAD"}
INV_TYPES = {"proforma", "commercial", "sales", "custom"}
PAY_STATUSES = {"unpaid", "partial", "paid", "overdue"}


# ---------- company profile ----------
def _company(db: Session) -> models.CompanyProfile:
    c = db.query(models.CompanyProfile).first()
    if not c:
        c = models.CompanyProfile()
        db.add(c); db.commit(); db.refresh(c)
    return c


def company_dict(c: models.CompanyProfile) -> dict:
    return {k: getattr(c, k) for k in (
        "id", "name", "logo", "contact_person", "address", "city", "state", "country",
        "postal_code", "email", "phone", "whatsapp", "website", "gstin", "iec",
        "bank_name", "account_holder", "account_number", "ifsc", "swift", "bank_address",
        "default_currency", "validity_days", "default_quote_terms", "default_invoice_terms",
        "prefix_quotation", "prefix_pi", "prefix_ci", "prefix_invoice")}


def exporter_snapshot(c: models.CompanyProfile) -> dict:
    return {k: company_dict(c)[k] for k in (
        "name", "contact_person", "address", "city", "state", "country", "postal_code",
        "email", "phone", "whatsapp", "website", "gstin", "iec")} | {"company_name": c.name}


def bank_snapshot(c: models.CompanyProfile) -> dict:
    return {k: company_dict(c)[k] for k in (
        "bank_name", "account_holder", "account_number", "ifsc", "swift", "bank_address")}


@router.get("/api/company-profile")
def get_company(db: Session = Depends(get_db), u=Depends(current_user)):
    c = _company(db)
    out = company_dict(c)
    out["logo_url"] = public_url(c.logo) if c.logo else ""
    return out


@router.put("/api/company-profile")
def put_company(p: dict, db: Session = Depends(get_db), u=Depends(require_role("admin"))):
    c = _company(db)
    for k in company_dict(c):
        if k in ("id",) or k not in p:
            continue
        v = p[k]
        if k == "validity_days":
            try: c.validity_days = int(v) or 30
            except (TypeError, ValueError): pass
        else:
            setattr(c, k, str(v or "")[:8000])
    db.commit()
    return {"saved": True}


@router.post("/api/company-profile/logo", status_code=201)
async def upload_company_logo(file: UploadFile = File(...),
                              db: Session = Depends(get_db), u=Depends(require_role("admin"))):
    """Upload the company logo persistently via the existing media store."""
    content = await file.read()
    try:
        meta = save_file(file.filename or "logo.png", content, file.content_type or "image/png")
    except ValueError as e:
        raise HTTPException(400, str(e))
    c = _company(db)
    c.logo = meta["filename"]
    db.add(models.MediaFile(filename=meta["filename"], original_name=(file.filename or "")[:255],
                            content_type=meta.get("content_type", ""), size=meta.get("size", 0),
                            source="own", alt_text="Company logo"))
    db.commit()
    return {"filename": meta["filename"], "url": public_url(meta["filename"])}


# ---------- saved buyers ----------
def buyer_out(b: models.DocBuyer) -> dict:
    return {k: getattr(b, k) for k in (
        "id", "name", "company", "contact", "email", "phone", "whatsapp", "country",
        "billing_address", "shipping_address", "city", "state", "postal_code", "tax_id", "reference", "notes")}


@router.get("/api/doc-buyers")
def list_buyers(search: str = "", db: Session = Depends(get_db), u=Depends(current_user)):
    q = db.query(models.DocBuyer)
    if search:
        like = f"%{search}%"
        q = q.filter(models.DocBuyer.company.ilike(like) | models.DocBuyer.email.ilike(like) | models.DocBuyer.name.ilike(like))
    return {"items": [buyer_out(b) for b in q.order_by(models.DocBuyer.id.desc()).limit(100).all()]}


@router.post("/api/doc-buyers", status_code=201)
def create_buyer(p: dict, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    if not (p.get("company") or p.get("name")):
        raise HTTPException(400, "Buyer name or company is required.")
    b = models.DocBuyer()
    for k in buyer_out(b):
        if k != "id" and k in p:
            setattr(b, k, str(p[k] or "")[:8000])
    db.add(b); db.commit(); db.refresh(b)
    return buyer_out(b)


@router.put("/api/doc-buyers/{bid}")
def update_buyer(bid: int, p: dict, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    b = db.query(models.DocBuyer).filter(models.DocBuyer.id == bid).first()
    if not b: raise HTTPException(404, "Buyer not found")
    for k in buyer_out(b):
        if k != "id" and k in p:
            setattr(b, k, str(p[k] or "")[:8000])
    db.commit(); db.refresh(b)
    return buyer_out(b)


@router.delete("/api/doc-buyers/{bid}")
def delete_buyer(bid: int, db: Session = Depends(get_db), u=Depends(require_role("admin"))):
    b = db.query(models.DocBuyer).filter(models.DocBuyer.id == bid).first()
    if not b: raise HTTPException(404, "Buyer not found")
    db.delete(b); db.commit()
    return {"deleted": bid}


# ---------- numbering ----------
def _next_number(db: Session, kind: str) -> str:
    c = _company(db)
    prefix = {"quotation": c.prefix_quotation, "proforma": c.prefix_pi,
              "commercial": c.prefix_ci, "sales": c.prefix_invoice, "custom": c.prefix_invoice}[kind]
    prefix = prefix or "NLI-DOC"
    year = datetime.now(timezone.utc).year
    full = f"{prefix}-{year}-"
    model = models.Quotation if kind == "quotation" else models.Invoice
    col = models.Quotation.number if kind == "quotation" else models.Invoice.number
    last = db.query(col).filter(col.like(full + "%")).order_by(col.desc()).first()
    seq = 1
    if last:
        raw = last[0] if isinstance(last, (tuple, list)) or hasattr(last, "_fields") else last
        try: seq = int(str(raw).split("-")[-1]) + 1
        except (ValueError, IndexError): seq = 1
    return f"{full}{seq:04d}"


# ---------- invoices ----------
def _num(v, d=0.0):
    try: return float(v if v not in (None, "") else d)
    except (TypeError, ValueError): return d


def invoice_out(inv, db) -> dict:
    items = db.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == inv.id).order_by(models.InvoiceItem.sort_order, models.InvoiceItem.id).all()
    return {
        "id": inv.id, "number": inv.number, "doc_type": inv.doc_type, "status": inv.status,
        "exporter": json.loads(inv.exporter or "{}"), "buyer": json.loads(inv.buyer or "{}"), "buyer_id": inv.buyer_id,
        "currency": inv.currency, "invoice_date": str(inv.invoice_date) if inv.invoice_date else None,
        "due_date": str(inv.due_date) if inv.due_date else None, "po_number": inv.po_number,
        "ref_quotation": inv.ref_quotation, "order_number": inv.order_number,
        "subtotal": _num(inv.subtotal), "discount": _num(inv.discount), "packing_charges": _num(inv.packing_charges),
        "freight_charges": _num(inv.freight_charges), "insurance": _num(inv.insurance),
        "other_charges": _num(inv.other_charges), "tax": _num(inv.tax), "grand_total": _num(inv.grand_total),
        "amount_paid": _num(inv.amount_paid), "balance_due": _num(inv.balance_due),
        "payment_status": inv.payment_status, "payment_method": inv.payment_method,
        "payment_reference": inv.payment_reference,
        "payment_date": str(inv.payment_date) if inv.payment_date else None, "payment_terms": inv.payment_terms,
        "shipping_method": inv.shipping_method, "incoterm": inv.incoterm, "port_loading": inv.port_loading,
        "port_destination": inv.port_destination, "delivery_time": inv.delivery_time, "packaging": inv.packaging,
        "bank_details": json.loads(inv.bank_details or "{}"), "show_bank": bool(inv.show_bank),
        "terms": inv.terms, "notes": inv.notes, "created_by": inv.created_by,
        "created_at": inv.created_at.isoformat() if inv.created_at else None,
        "updated_at": inv.updated_at.isoformat() if inv.updated_at else None,
        "items": [{k: (json.loads(getattr(it, k) or "[]") if k == "images" else getattr(it, k))
                   for k in ("id", "product_id", "sku", "name", "title", "description", "material", "size",
                             "dimensions", "weight", "finish", "images", "quantity", "unit", "unit_price",
                             "discount_pct", "tax_pct", "line_total", "sort_order")} for it in items],
    }


def _calc_inv(p: dict):
    subtotal = 0.0
    for it in p.get("items", []):
        qty, price = _num(it.get("quantity")), _num(it.get("unit_price"))
        disc = _num(it.get("discount_pct"))
        tax = _num(it.get("tax_pct"))
        base = qty * price
        after = base * (1 - disc / 100.0)
        line = round(after * (1 + tax / 100.0), 2)
        it["line_total"] = line
        subtotal += base
    subtotal = round(subtotal, 2)
    grand = round(subtotal - _num(p.get("discount")) + _num(p.get("packing_charges"))
                  + _num(p.get("freight_charges")) + _num(p.get("insurance"))
                  + _num(p.get("other_charges")) + _num(p.get("tax")), 2)
    paid = _num(p.get("amount_paid"))
    return subtotal, grand, paid, round(grand - paid, 2)


def _apply_inv(inv, p: dict, db: Session):
    cur = str(p.get("currency") or "USD").upper()
    inv.currency = cur if cur in CURRENCIES else "USD"
    inv.exporter = json.dumps(p.get("exporter") or exporter_snapshot(_company(db)))
    inv.buyer = json.dumps(p.get("buyer") or {})
    inv.buyer_id = p.get("buyer_id")
    inv.doc_type = p.get("doc_type") if p.get("doc_type") in INV_TYPES else "proforma"
    for fld in ("invoice_date", "due_date", "payment_date"):
        v = p.get(fld)
        setattr(inv, fld, date.fromisoformat(v) if v else None)
    for k in ("po_number", "ref_quotation", "order_number", "payment_method", "payment_reference",
              "payment_terms", "shipping_method", "incoterm", "port_loading", "port_destination",
              "delivery_time", "packaging", "notes", "terms"):
        setattr(inv, k, str(p.get(k) or "")[:8000])
    inv.bank_details = json.dumps(p.get("bank_details") or bank_snapshot(_company(db)))
    inv.show_bank = bool(p.get("show_bank", True))
    # Persist every individual charge so the PDF itemises them (not just the total).
    inv.discount = _num(p.get("discount"))
    inv.packing_charges = _num(p.get("packing_charges"))
    inv.freight_charges = _num(p.get("freight_charges"))
    inv.insurance = _num(p.get("insurance"))
    inv.other_charges = _num(p.get("other_charges"))
    inv.tax = _num(p.get("tax"))
    subtotal, grand, paid, balance = _calc_inv(p)
    inv.subtotal, inv.grand_total, inv.amount_paid, inv.balance_due = subtotal, grand, paid, balance
    inv.payment_status = p.get("payment_status") if p.get("payment_status") in PAY_STATUSES else "unpaid"
    return p.get("items", [])


def _write_inv_items(db, iid, items):
    db.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == iid).delete()
    for idx, it in enumerate(items):
        db.add(models.InvoiceItem(invoice_id=iid, product_id=it.get("product_id"), sku=str(it.get("sku") or "")[:128],
            name=str(it.get("name") or "")[:512], title=str(it.get("title") or "")[:512],
            description=it.get("description") or "", material=str(it.get("material") or "")[:128],
            size=str(it.get("size") or "")[:128], dimensions=str(it.get("dimensions") or "")[:255],
            weight=str(it.get("weight") or "")[:128], finish=str(it.get("finish") or "")[:128],
            images=json.dumps(it.get("images") or []), quantity=_num(it.get("quantity")),
            unit=str(it.get("unit") or "pcs")[:64], unit_price=_num(it.get("unit_price")),
            discount_pct=_num(it.get("discount_pct")), tax_pct=_num(it.get("tax_pct")),
            line_total=_num(it.get("line_total")), sort_order=int(it.get("sort_order") or idx)))


@router.get("/api/invoices")
def list_invoices(doc_type: str = "", status: str = "", country: str = "", search: str = "",
                  page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
                  db: Session = Depends(get_db), u=Depends(current_user)):
    q = db.query(models.Invoice)
    if doc_type in INV_TYPES: q = q.filter(models.Invoice.doc_type == doc_type)
    if status in PAY_STATUSES: q = q.filter(models.Invoice.payment_status == status)
    if search:
        like = f"%{search}%"
        q = q.filter(models.Invoice.number.ilike(like) | models.Invoice.po_number.ilike(like))
    rows = q.order_by(models.Invoice.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    items = []
    for inv in rows:
        d = invoice_out(inv, db)
        bd = d.pop("items")
        d["item_count"] = len(bd)
        d["buyer_company"] = d["buyer"].get("company") or d["buyer"].get("name") or ""
        d["buyer_country"] = d["buyer"].get("country") or ""
        items.append(d)
    return {"total": q.count(), "page": page, "page_size": page_size, "items": items}


@router.post("/api/invoices", status_code=201)
def create_invoice(p: dict, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    if not p.get("buyer") or not (p["buyer"].get("company") or p["buyer"].get("name")):
        raise HTTPException(400, "Buyer company or name is required.")
    if not p.get("items"):
        raise HTTPException(400, "Add at least one product.")
    kind = p.get("doc_type") if p.get("doc_type") in INV_TYPES else "proforma"
    inv = models.Invoice(number=_next_number(db, kind), created_by=u.email, status="draft")
    items = _apply_inv(inv, p, db)
    db.add(inv); db.flush(); _write_inv_items(db, inv.id, items)
    db.commit(); db.refresh(inv)
    return invoice_out(inv, db)


@router.get("/api/invoices/{iid}")
def get_invoice(iid: int, db: Session = Depends(get_db), u=Depends(current_user)):
    inv = db.query(models.Invoice).filter(models.Invoice.id == iid).first()
    if not inv: raise HTTPException(404, "Invoice not found")
    return invoice_out(inv, db)


@router.put("/api/invoices/{iid}")
def update_invoice(iid: int, p: dict, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    inv = db.query(models.Invoice).filter(models.Invoice.id == iid).first()
    if not inv: raise HTTPException(404, "Invoice not found")
    items = _apply_inv(inv, p, db)
    _write_inv_items(db, inv.id, items)
    db.commit(); db.refresh(inv)
    return invoice_out(inv, db)


@router.delete("/api/invoices/{iid}")
def delete_invoice(iid: int, db: Session = Depends(get_db), u=Depends(require_role("admin"))):
    inv = db.query(models.Invoice).filter(models.Invoice.id == iid).first()
    if not inv: raise HTTPException(404, "Invoice not found")
    db.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == iid).delete()
    db.delete(inv); db.commit()
    return {"deleted": iid}


@router.post("/api/invoices/{iid}/duplicate", status_code=201)
def duplicate_invoice(iid: int, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    src = db.query(models.Invoice).filter(models.Invoice.id == iid).first()
    if not src: raise HTTPException(404, "Invoice not found")
    d = invoice_out(src, db)
    d["status"] = "draft"
    kind = d.get("doc_type") or "proforma"
    inv = models.Invoice(number=_next_number(db, kind), created_by=u.email, status="draft")
    items = _apply_inv(inv, d, db)
    db.add(inv); db.flush(); _write_inv_items(db, inv.id, items)
    db.commit(); db.refresh(inv)
    return invoice_out(inv, db)


@router.post("/api/invoices/{iid}/payment")
def record_payment(iid: int, p: dict, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    inv = db.query(models.Invoice).filter(models.Invoice.id == iid).first()
    if not inv: raise HTTPException(404, "Invoice not found")
    amount = _num(p.get("amount"))
    if amount <= 0: raise HTTPException(400, "Payment amount must be positive.")
    inv.amount_paid = _num(inv.amount_paid) + amount
    inv.balance_due = round(_num(inv.grand_total) - _num(inv.amount_paid), 2)
    if p.get("method"): inv.payment_method = str(p["method"])[:128]
    if p.get("reference"): inv.payment_reference = str(p["reference"])[:128]
    if p.get("date"):
        try: inv.payment_date = date.fromisoformat(p["date"])
        except ValueError: pass
    inv.payment_status = "paid" if inv.balance_due <= 0 else "partial"
    db.commit(); db.refresh(inv)
    return invoice_out(inv, db)


@router.post("/api/invoices/{iid}/status")
def set_inv_status(iid: int, p: dict, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    inv = db.query(models.Invoice).filter(models.Invoice.id == iid).first()
    if not inv: raise HTTPException(404, "Invoice not found")
    st = str(p.get("status") or "")
    if st not in PAY_STATUSES: raise HTTPException(400, f"status must be one of {sorted(PAY_STATUSES)}")
    inv.payment_status = st
    db.commit()
    return {"id": iid, "status": st}


@router.get("/api/invoices/{iid}/pdf")
def invoice_pdf_endpoint(iid: int, db: Session = Depends(get_db), u=Depends(current_user)):
    inv = db.query(models.Invoice).filter(models.Invoice.id == iid).first()
    if not inv: raise HTTPException(404, "Invoice not found")
    items = db.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == iid).order_by(models.InvoiceItem.sort_order, models.InvoiceItem.id).all()
    pdf = build_invoice_pdf(inv, items, company_dict(_company(db)))
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename={inv.number}.pdf'})


# ---------- convert quotation -> invoice ----------
@router.post("/api/documents/quote-to-invoice/{qid}", status_code=201)
def quote_to_invoice(qid: int, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    q = db.query(models.Quotation).filter(models.Quotation.id == qid).first()
    if not q: raise HTTPException(404, "Quotation not found")
    qitems = db.query(models.QuotationItem).filter(models.QuotationItem.quotation_id == qid).order_by(models.QuotationItem.sort_order).all()
    buyer = {"company": q.buyer_company, "name": q.buyer_contact, "contact": q.buyer_contact,
             "email": q.buyer_email, "phone": q.buyer_phone, "whatsapp": q.buyer_whatsapp,
             "country": q.buyer_country, "billing_address": q.buyer_address, "shipping_address": q.buyer_address}
    payload = {
        "doc_type": "proforma", "exporter": json.loads(q.exporter or "{}"), "buyer": buyer,
        "currency": q.currency, "invoice_date": str(date.today()), "due_date": str(q.expiry_date) if q.expiry_date else None,
        "ref_quotation": q.number, "payment_terms": q.payment_terms, "shipping_method": q.shipping_method,
        "incoterm": q.incoterm, "port_loading": q.port_loading, "port_destination": q.port_destination,
        "delivery_time": q.delivery_time, "packaging": "",
        "terms": q.terms, "packing_charges": _num(q.packing_charges), "freight_charges": _num(q.shipping_charges),
        "sample_charges": _num(q.sample_charges), "discount": _num(q.discount), "tax": _num(q.tax),
        "amount_paid": 0, "payment_status": "unpaid",
        "items": [{"product_id": it.product_id, "sku": it.sku, "name": it.name, "title": it.name,
                   "description": it.description, "material": it.material, "dimensions": it.dimensions,
                   "images": json.loads(it.images or "[]"), "quantity": _num(it.quantity), "unit": it.unit,
                   "unit_price": _num(it.unit_price), "line_total": _num(it.line_total)} for it in qitems],
    }
    inv = models.Invoice(number=_next_number(db, "proforma"), created_by=u.email, status="draft")
    items = _apply_inv(inv, payload, db)
    db.add(inv); db.flush(); _write_inv_items(db, inv.id, items)
    db.commit(); db.refresh(inv)
    return invoice_out(inv, db)


@router.post("/api/invoices/{iid}/send-email")
def send_invoice_email(iid: int, p: dict, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    inv = db.query(models.Invoice).filter(models.Invoice.id == iid).first()
    if not inv: raise HTTPException(404, "Invoice not found")
    buyer = json.loads(inv.buyer or "{}")
    to = str(p.get("email") or buyer.get("email") or "").strip()
    if not to: raise HTTPException(400, "No recipient email on this invoice.")
    if not email_configured():
        return {"sent": False, "detail": "SMTP not configured", "to": to}
    ok, detail = send_email(to, f"{TITLE.get(inv.doc_type,'Invoice')} {inv.number} — New Look Impex",
        f"Dear {buyer.get('contact') or buyer.get('company')},\n\nPlease find {inv.number} for {buyer.get('company')}.\n"
        f"Grand total: {inv.currency} {inv.grand_total}. Balance due: {inv.currency} {inv.balance_due}.\n\nRegards,\nNew Look Impex")
    if ok: inv.status = "sent"; db.commit()
    return {"sent": ok, "detail": detail, "to": to}
