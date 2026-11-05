"""RFQ (Request for Quotation) system."""
from __future__ import annotations
import hashlib
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from . import models
from .auth import current_user, rate_limit, require_role
from .config import settings
from .database import get_db
from .email import send_email
from .schemas import RFQIn, RFQStatusIn
from .turnstile import require_turnstile

router = APIRouter()

NOW = lambda: datetime.now(timezone.utc).replace(tzinfo=None)  # noqa: E731

TARGET_COUNTRIES = {"australia", "united states", "united kingdom",
                    "united arab emirates", "canada", "india", "usa", "uk", "uae"}


def _items_hash(items: list) -> str:
    blob = json.dumps([[i.product_id, i.product_name.strip().lower(),
                        i.quantity.strip()] for i in items], sort_keys=True)
    return hashlib.sha256(blob.encode()).hexdigest()


def _next_reference(db: Session) -> str:
    year = datetime.now(timezone.utc).year
    prefix = f"RFQ-{year}-"
    last = db.query(models.RFQ).filter(
        models.RFQ.reference_number.like(prefix + "%")) \
        .order_by(models.RFQ.reference_number.desc()).first()
    seq = 1
    if last:
        try:
            seq = int(last.reference_number.split("-")[-1]) + 1
        except ValueError:
            seq = 1
    return f"{prefix}{seq:04d}"


def _score_rfq(body: RFQIn) -> float:
    s = 0.35
    if body.company_name.strip():
        s += 0.2
    if body.country.strip().lower() in TARGET_COUNTRIES:
        s += 0.15
    if body.phone.strip():
        s += 0.1
    if body.target_price.strip():
        s += 0.05
    if body.delivery_timeframe.strip():
        s += 0.05
    if len(body.additional_requirements.strip()) > 40:
        s += 0.1
    if len(body.items) >= 2:
        s += 0.05
    return round(min(s, 1.0), 2)


@router.post("/api/public/rfqs", status_code=201)
def submit_rfq(body: RFQIn, request: Request, db: Session = Depends(get_db)):
    rate_limit(f"rfq:{request.client.host if request.client else 'x'}", 10, 3600)

    # Turnstile verification (if configured)
    if settings.TURNSTILE_SECRET_KEY:
        turnstile_token = request.headers.get("x-turnstile-token", "")
        ip = request.client.host if request.client else "unknown"
        if not verify_turnstile_token(turnstile_token, ip):
            db.add(models.SecurityEvent(
                event_type="turnstile_fail",
                ip_address=ip,
                path="/api/public/rfqs",
                detail="Invalid Turnstile token on RFQ submission",
                severity="high",
            ))
            db.commit()
            raise HTTPException(
                status_code=400,
                detail="Security verification failed. Please refresh and try again.",
            )

    # Honeypot check - RFQIn doesn't have website_url, so check via body
    # The honeypot is sent as an extra form field
    body_dict = body.model_dump() if hasattr(body, 'model_dump') else body.dict()
    website_url = body_dict.get("website_url", "")
    if website_url and str(website_url).strip():
        db.add(models.SecurityEvent(
            event_type="honeypot_triggered",
            ip_address=request.client.host if request.client else "unknown",
            path="/api/public/rfqs",
            detail="Honeypot field filled - likely bot",
            severity="medium",
        ))
        db.commit()
        raise HTTPException(
            status_code=400,
            detail="Invalid submission detected.",
        )
    h = _items_hash(body.items)
    dup = db.query(models.RFQ).filter(
        func.lower(models.RFQ.business_email) == body.business_email.strip().lower(),
        models.RFQ.items_hash == h).order_by(models.RFQ.id.desc()).first()
    if dup and (NOW() - dup.created_at).total_seconds() < 24 * 3600:
        raise HTTPException(
            409,
            "A similar quotation request was already received in the last 24 hours. "
            "Reference: " + dup.reference_number)
    rfq = models.RFQ(
        reference_number=_next_reference(db),
        full_name=body.full_name.strip(),
        business_email=str(body.business_email).strip(),
        company_name=body.company_name.strip(),
        country=body.country.strip(),
        phone=body.phone.strip(),
        target_price=body.target_price.strip(),
        delivery_timeframe=body.delivery_timeframe.strip(),
        additional_requirements=body.additional_requirements.strip(),
        consent=body.consent,
        items_hash=h,
        status="new")
    db.add(rfq)
    db.flush()
    for item in body.items:
        # verify product exists & capture name snapshot
        pname = item.product_name.strip()
        if item.product_id is not None:
            prod = db.query(models.Product).filter(models.Product.id == item.product_id).first()
            if prod:
                pname = prod.name
        db.add(models.RFQItem(
            rfq_id=rfq.id, product_id=item.product_id, product_name=pname,
            quantity=item.quantity.strip(), unit=item.unit.strip(), notes=item.notes.strip()))
    db.add(models.WorkflowExecution(workflow="rfq_received", status="success",
                                    detail=rfq.reference_number))
    db.add(models.AnalyticsEvent(event_type="rfq_submit",
                                 country=body.country.strip(),
                                 referrer="", url=""))
    db.commit()
    db.refresh(rfq)

    # Honest email handling — never claim delivery when SMTP is not configured.
    email_sent = False
    email_detail = "SMTP not configured"
    if body.consent:
        from .campaigns import active_campaign
        camp = active_campaign()
        season = (f"This season: {camp['emoji']} {camp['name']} — {camp['percent']}% OFF storewide "
                  f"with code {camp['code']} (valid till {camp['ends_label']}).\n"
                  if camp["ends_label"] != "always on" else "")
        ok, detail = send_email(
            str(body.business_email),
            f"RFQ {rfq.reference_number} — New Look Impex (acknowledgement)",
            f"Dear {body.full_name},\n\n"
            f"Thank you for your wholesale enquiry {rfq.reference_number} to "
            f"New Look Impex (Moradabad, India).\n\n"
            f"Selected items: {len(body.items)}\n\n"
            "WHAT HAPPENS NEXT\n"
            "  1. Our export team prepares your quotation (within one business day)\n"
            "  2. We reply with pricing, MOQ, samples and shipping options\n"
            "  3. Need it faster? WhatsApp us: +91 8218251238\n\n"
            f"{season}"
            "A real person reads every reply — just write back to this email.\n\n"
            "Warm regards,\n"
            "Team New Look Impex\n"
            "Brass & Copper Manufacturer & Exporter — Moradabad, India\n"
            "newlookimpex130@gmail.com — +91 8218251238")
        email_sent, email_detail = ok, detail
        # Admin notification (best effort, honest) — includes every item so the
        # owner understands exactly what was selected in the RFQ.
        item_lines = "\n".join(
            f"{i + 1}. {it.product_name} — Qty: {it.quantity}"
            f"{' ' + it.unit.strip() if it.unit.strip() else ''}"
            f"{' (notes: ' + it.notes.strip() + ')' if it.notes.strip() else ''}"
            for i, it in enumerate(body.items)
        )
        send_email(
            settings.ENQUIRY_NOTIFY_EMAIL,
            f"New RFQ {rfq.reference_number} from {body.company_name or body.full_name}",
            f"RFQ {rfq.reference_number}\n"
            f"From: {body.full_name} <{body.business_email}>\n"
            f"Company: {body.company_name}\nCountry: {body.country}\n"
            f"Phone: {body.phone or '-'}\nTarget price: {body.target_price or '-'}\n"
            f"Delivery: {body.delivery_timeframe or '-'}\n"
            f"Requirements: {body.additional_requirements or '-'}\n\n"
            f"Selected Products ({len(body.items)}):\n{item_lines}\n\n"
            f"Admin record: {settings.PUBLIC_SITE_URL.rstrip('/')}/admin/rfqs")
    return {
        "reference_number": rfq.reference_number,
        "message": "Thank you — your wholesale enquiry has been received. "
                   "New Look Impex will respond with a quotation.",
        "email_sent": email_sent,
        "email_detail": email_detail,
    }


@router.get("/api/rfqs")
def list_rfqs(status: str = "", page: int = Query(1, ge=1),
              page_size: int = Query(20, ge=1, le=100),
              db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    q = db.query(models.RFQ)
    if status:
        q = q.filter(models.RFQ.status == status)
    total = q.count()
    rows = q.order_by(models.RFQ.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    items = []
    for r in rows:
        item_count = db.query(func.count(models.RFQItem.id)).filter(
            models.RFQItem.rfq_id == r.id).scalar() or 0
        total_qty = 0
        items.append({
            "id": r.id, "reference_number": r.reference_number,
            "full_name": r.full_name, "business_email": r.business_email,
            "company_name": r.company_name, "country": r.country, "phone": r.phone,
            "target_price": r.target_price, "delivery_timeframe": r.delivery_timeframe,
            "additional_requirements": r.additional_requirements, "consent": r.consent,
            "status": r.status, "item_count": item_count,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    return {"total": total, "page": page, "page_size": page_size, "items": items}


@router.get("/api/rfqs/export")
def export_rfqs(db: Session = Depends(get_db), u=Depends(require_role("admin"))):
    import csv
    import io
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["reference_number", "name", "email", "company", "country", "phone",
                "target_price", "delivery_timeframe", "status", "created_at"])
    for r in db.query(models.RFQ).order_by(models.RFQ.id.desc()).limit(2000).all():
        w.writerow([r.reference_number, r.full_name, r.business_email, r.company_name,
                    r.country, r.phone, r.target_price, r.delivery_timeframe,
                    r.status, r.created_at])
    return PlainTextResponse(buf.getvalue(), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=rfqs.csv"})


@router.get("/api/rfqs/{rid}")
def get_rfq(rid: int, db: Session = Depends(get_db),
            u=Depends(require_role("admin", "editor"))):
    r = db.query(models.RFQ).filter(models.RFQ.id == rid).first()
    if not r:
        raise HTTPException(404, "RFQ not found")
    rfq_items = []
    for it in db.query(models.RFQItem).filter(models.RFQItem.rfq_id == rid) \
            .order_by(models.RFQItem.id).all():
        prod = None
        if it.product_id:
            p = db.query(models.Product).filter(models.Product.id == it.product_id).first()
            prod = {"id": p.id, "name": p.name, "slug": p.slug} if p else None
        rfq_items.append({
            "id": it.id, "product_id": it.product_id, "product": prod,
            "product_name": it.product_name, "quantity": it.quantity,
            "unit": it.unit, "notes": it.notes})
    return {
        "id": r.id, "reference_number": r.reference_number,
        "full_name": r.full_name, "business_email": r.business_email,
        "company_name": r.company_name, "country": r.country, "phone": r.phone,
        "target_price": r.target_price, "delivery_timeframe": r.delivery_timeframe,
        "additional_requirements": r.additional_requirements, "consent": r.consent,
        "status": r.status, "notes": r.notes, "items": rfq_items,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


@router.post("/api/rfqs/{rid}/status")
def set_rfq_status(rid: int, body: RFQStatusIn, db: Session = Depends(get_db),
                   u=Depends(require_role("admin", "editor"))):
    r = db.query(models.RFQ).filter(models.RFQ.id == rid).first()
    if not r:
        raise HTTPException(404, "RFQ not found")
    if body.status not in ("new", "contacted", "quoted", "won", "lost"):
        raise HTTPException(400, "Invalid status")
    r.status = body.status
    r.notes = body.notes[:2000]
    db.commit()
    return {"id": r.id, "status": r.status}
