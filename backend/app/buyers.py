"""Buyer research / CRM: qualification (explainable), outreach drafts, suppression."""
from __future__ import annotations
import csv
import io
import json
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from . import models
from .auth import current_user, rate_limit, require_role
from .database import get_db
from .email import send_email
from .llm import generate, llm_configured
from .schemas import BuyerIn
from .text import slugify

router = APIRouter()

NOW = lambda: datetime.now(timezone.utc).replace(tzinfo=None)  # noqa: E731

BUYER_CATEGORIES = [
    "Home décor retailer", "Gift shop", "Importer", "Wholesaler",
    "Distributor", "Interior designer", "Corporate gifting business",
    "Hospitality buyer", "Online retailer",
]
PRODUCT_SIGNALS = ["brass", "copper", "urli", "diya", "lantern", "bowl",
                   "handicraft", "home decor", "home décor", "decor",
                   "metal", "gift", "décor", "decorative"]
B2B_SIGNALS = ["retail", "wholesale", "import", "export", "distribut",
               "gift", "decor", "home", "furnish", "interior", "hospitality",
               "procurement", "corporate"]


def _qualify(company: str, website: str, category: str,
             relevance: str, country: str) -> dict:
    """Transparent, explainable qualification. Never fabricates contacts."""
    text = f"{company} {website} {category} {relevance}".lower()
    country_l = (country or "").lower()
    target = country_l in {"australia", "united states", "united kingdom",
                           "united arab emirates", "canada", "india", "usa", "uk", "uae"}
    prod_hits = sum(1 for s in PRODUCT_SIGNALS if s in text)
    b2b_hits = sum(1 for s in B2B_SIGNALS if s in text)
    factors: dict = {}
    parts = []
    # product relevance (0-0.35)
    prod_score = min(prod_hits, 4) / 4 * 0.35
    factors["product_relevance"] = round(prod_score, 3)
    parts.append(f"Product-term match {prod_hits} signal(s) → {prod_score:.2f}.")
    # business model relevance (0-0.25)
    b2b_score = min(b2b_hits, 4) / 4 * 0.25
    factors["business_model"] = round(b2b_score, 3)
    parts.append(f"B2B/wholesale signal {b2b_hits} → {b2b_score:.2f}.")
    # buyer category fit (0-0.20)
    cat_fit = 0.20 if category in BUYER_CATEGORIES else 0.05
    factors["category_fit"] = round(cat_fit, 3)
    parts.append(f"Buyer category '{category or 'unspecified'}' → {cat_fit:.2f}.")
    # country (0-0.10)
    country_score = 0.10 if target else 0.02
    factors["country_target"] = round(country_score, 3)
    parts.append(f"Country '{country or 'unspecified'}' is "
                 + ("a target market." if target else "outside core target list."))
    # website presence (0-0.10)
    web_score = 0.10 if website.strip() else 0.0
    factors["website_present"] = round(web_score, 3)
    parts.append("Company website provided." if website.strip()
                 else "No website on record — lower confidence.")
    score = round(min(prod_score + b2b_score + cat_fit +
                        country_score + web_score, 1.0), 2)
    explanation = " ".join(parts)
    recommendation = ("High-fit wholesale lead for New Look Impex."
                      if score >= 0.6 else
                      "Potentially relevant — verify business details before outreach."
                      if score >= 0.4 else
                      "Low relevance to copper/brass wholesale — review manually.")
    return {"score": score, "factors": factors, "explanation": explanation,
            "recommendation": recommendation}


def _buyer_out(b: models.Buyer, db: Session) -> dict:
    qual = {}
    try:
        qual = json.loads(b.qualification_json or "{}")
    except Exception:
        qual = {}
    outreach_count = db.query(func.count(models.OutreachRecord.id)).filter(
        models.OutreachRecord.buyer_id == b.id).scalar() or 0
    return {
        "id": b.id, "company_name": b.company_name, "website": b.website,
        "country": b.country, "buyer_category": b.buyer_category,
        "product_relevance": b.product_relevance, "contact_name": b.contact_name,
        "contact_email": b.contact_email, "phone": b.phone,
        "source_url": b.source_url, "source_type": b.source_type,
        "date_collected": str(b.date_collected) if b.date_collected else None,
        "verification_status": b.verification_status, "notes": b.notes,
        "lead_score": b.lead_score, "qualification": qual,
        "outreach_status": b.outreach_status, "outreach_count": outreach_count,
        "created_at": b.created_at.isoformat() if b.created_at else None,
    }


@router.get("/api/buyers")
def list_buyers(q: str = "", country: str = "", category: str = "",
                outreach_status: str = "", verification: str = "",
                page: int = Query(1, ge=1),
                page_size: int = Query(20, ge=1, le=100),
                db: Session = Depends(get_db), u=Depends(current_user)):
    qry = db.query(models.Buyer)
    if q:
        like = f"%{q}%"
        qry = qry.filter(
            func.lower(models.Buyer.company_name).like(func.lower(like))
            | func.lower(models.Buyer.website).like(func.lower(like))
            | func.lower(models.Buyer.country).like(func.lower(like)))
    if country:
        qry = qry.filter(func.lower(models.Buyer.country).like(f"%{country.lower()}%"))
    if category:
        qry = qry.filter(func.lower(models.Buyer.buyer_category).like(f"%{category.lower()}%"))
    if outreach_status:
        qry = qry.filter(models.Buyer.outreach_status == outreach_status)
    if verification:
        qry = qry.filter(models.Buyer.verification_status == verification)
    total = qry.count()
    rows = qry.order_by(models.Buyer.lead_score.desc(), models.Buyer.id.desc()) \
        .offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "page": page, "page_size": page_size,
            "items": [_buyer_out(b, db) for b in rows]}


@router.post("/api/buyers", status_code=201)
def create_buyer(body: BuyerIn, db: Session = Depends(get_db),
                   u=Depends(require_role("admin", "editor"))):
    rate_limit(f"buyer:{u.email}", 60, 60)
    slug = slugify(body.company_name)
    exists = db.query(models.Buyer).filter(
        func.lower(models.Buyer.company_name) == body.company_name.strip().lower()).first()
    if exists:
        raise HTTPException(409, "Buyer company already exists (duplicate protection).")
    qual = _qualify(body.company_name, body.website, body.buyer_category,
                      body.product_relevance, body.country)
    b = models.Buyer(
        company_name=body.company_name.strip(), website=body.website.strip(),
        country=body.country.strip(), buyer_category=body.buyer_category.strip(),
        product_relevance=body.product_relevance.strip(),
        contact_name=body.contact_name.strip(),
        contact_email=body.contact_email.strip(), phone=body.phone.strip(),
        source_url=body.source_url.strip(), source_type=body.source_type.strip() or "manual",
        date_collected=date.today(), verification_status="unverified",
        notes=body.notes.strip(), lead_score=qual["score"],
        qualification_json=json.dumps(qual))
    db.add(b); db.commit(); db.refresh(b)
    return _buyer_out(b, db)


@router.get("/api/buyers/export")
def export_buyers(db: Session = Depends(get_db), u=Depends(require_role("admin"))):
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["company_name", "website", "country", "buyer_category",
                "product_relevance", "contact_name", "contact_email", "phone",
                "source_url", "source_type", "verification_status",
                "lead_score", "outreach_status"])
    for b in db.query(models.Buyer).order_by(models.Buyer.id.desc()).limit(5000).all():
        w.writerow([b.company_name, b.website, b.country, b.buyer_category,
                      b.product_relevance, b.contact_name, b.contact_email,
                      b.phone, b.source_url, b.source_type,
                      b.verification_status, b.lead_score, b.outreach_status])
    return PlainTextResponse(buf.getvalue(), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=buyers.csv"})


@router.get("/api/buyers/categories")
def buyer_categories(u=Depends(current_user)):
    return {"categories": BUYER_CATEGORIES}


@router.get("/api/buyers/{bid}")
def get_buyer(bid: int, db: Session = Depends(get_db), u=Depends(current_user)):
    b = db.query(models.Buyer).filter(models.Buyer.id == bid).first()
    if not b:
        raise HTTPException(404, "Buyer not found")
    return _buyer_out(b, db)


@router.put("/api/buyers/{bid}")
def update_buyer(bid: int, body: BuyerIn, db: Session = Depends(get_db),
                   u=Depends(require_role("admin", "editor"))):
    b = db.query(models.Buyer).filter(models.Buyer.id == bid).first()
    if not b:
        raise HTTPException(404, "Buyer not found")
    for field in ("website", "country", "buyer_category", "product_relevance",
                  "contact_name", "contact_email", "phone", "source_url",
                  "source_type", "notes"):
        setattr(b, field, getattr(body, field).strip())
    b.company_name = body.company_name.strip()
    qual = _qualify(b.company_name, b.website, b.buyer_category,
                      b.product_relevance, b.country)
    b.lead_score = qual["score"]
    b.qualification_json = json.dumps(qual)
    db.commit(); db.refresh(b)
    return _buyer_out(b, db)


@router.delete("/api/buyers/{bid}")
def delete_buyer(bid: int, db: Session = Depends(get_db),
                   u=Depends(require_role("admin"))):
    b = db.query(models.Buyer).filter(models.Buyer.id == bid).first()
    if not b:
        raise HTTPException(404, "Buyer not found")
    db.query(models.OutreachRecord).filter(models.OutreachRecord.buyer_id == bid).delete()
    db.delete(b); db.commit()
    return {"deleted": bid}


@router.post("/api/buyers/import", status_code=201)
def import_buyers(payload: dict, db: Session = Depends(get_db),
                    u=Depends(require_role("admin", "editor"))):
    csv_text = payload.get("csv", "")
    if not csv_text.strip():
        raise HTTPException(400, "Provide {csv: '...'} content.")
    reader = csv.DictReader(io.StringIO(csv_text))
    created, skipped, errors = 0, 0, []
    for i, row in enumerate(reader, start=2):
        company = (row.get("company_name") or row.get("company") or "").strip()
        if not company:
            errors.append(f"row {i}: missing company_name"); continue
        if db.query(models.Buyer).filter(
                func.lower(models.Buyer.company_name) == company.lower()).first():
            skipped += 1; continue
        category = (row.get("buyer_category") or row.get("category") or "").strip()
        if category and category not in BUYER_CATEGORIES:
            category = category  # keep user-provided value but don't validate strictly
        website = (row.get("website") or row.get("source_url") or "").strip()
        qual = _qualify(company, website, category,
                          (row.get("product_relevance") or "").strip(),
                          (row.get("country") or "").strip())
        b = models.Buyer(
            company_name=company, website=website,
            country=(row.get("country") or "").strip(),
            buyer_category=category,
            product_relevance=(row.get("product_relevance") or "").strip(),
            contact_name=(row.get("contact_name") or "").strip(),
            contact_email=(row.get("contact_email") or row.get("email") or "").strip(),
            phone=(row.get("phone") or "").strip(),
            source_url=(row.get("source_url") or row.get("website") or "").strip(),
            source_type=(row.get("source_type") or "csv").strip(),
            date_collected=date.today(),
            verification_status="unverified",
            notes=(row.get("notes") or "").strip(),
            lead_score=qual["score"], qualification_json=json.dumps(qual))
        db.add(b); created += 1
    db.commit()
    return {"created": created, "skipped_duplicates": skipped, "errors": errors}


# ---------------- qualification (AI, explainable) ----------------

@router.post("/api/buyers/{bid}/qualify")
def qualify_buyer(bid: int, db: Session = Depends(get_db),
                    u=Depends(require_role("admin", "editor"))):
    b = db.query(models.Buyer).filter(models.Buyer.id == bid).first()
    if not b:
        raise HTTPException(404, "Buyer not found")
    # Rule-based qualification always runs (transparent).
    qual = _qualify(b.company_name, b.website, b.buyer_category,
                    b.product_relevance, b.country)
    source = "rule-based"
    # If an LLM is configured, add an AI explanation — but never trust it with facts.
    if llm_configured():
        prompt = (f"Assess relevance of '{b.company_name}' ({b.country}, "
                  f"category: {b.buyer_category}) as a wholesale buyer for "
                  f"New Look Impex — a Moradabad, India exporter of copper & brass "
                  f"handicrafts (urlis, diyas, lanterns, bowls, home décor, gifting). "
                  f"Website: {b.website or 'none'}. Product relevance: {b.product_relevance or 'unspecified'}. "
                  f"Return 3-5 bullet points explaining WHY this company may be relevant, "
                  f"using only the facts given. Do not invent contacts, revenue, or certifications.")
        res = generate(prompt, max_tokens=400)
        if res.get("text"):
            qual["ai_notes"] = res["text"][:1500]
            source = f"ai:{settings_model()}"
    qual["source"] = source
    b.lead_score = qual["score"]
    b.qualification_json = json.dumps(qual)
    db.commit()
    return _buyer_out(b, db)


def settings_model() -> str:
    from .config import settings
    return settings.LLM_MODEL or "unknown"


# ---------------- outreach drafts + sending ----------------

def _outreach_draft(b: models.Buyer, db: Session) -> dict:
    """Generate a personalised wholesale email draft. Human review required."""
    first = (b.contact_name or "").split()[0] if b.contact_name else ""
    greeting = f"Dear {b.contact_name}," if b.contact_name else f"Dear {b.company_name} team,"
    prompt = (f"Write a polite B2B wholesale outreach email draft for New Look Impex "
              f"(Moradabad, India — copper & brass handicrafts exporter) to "
              f"{b.company_name} ({b.country}, {b.buyer_category}). "
              f"Relevant products: {b.product_relevance or 'brass & copper handicrafts, home décor, gifting'}. "
              f"Include: a specific reason they may be interested, an invitation to request "
              f"a wholesale quotation, catalogue availability, and customization/OEM capability. "
              f"Do NOT invent prices, MOQs, certifications, or claims. Keep it under 180 words. "
              f"Return only the email body text.")
    subject = f"Wholesale copper & brass handicrafts for {b.company_name}"
    source = "rule-based"
    body = (
        f"{greeting}\n\n"
        f"I'm reaching out from New Look Impex, a Moradabad (India) exporter of "
        f"copper and brass handicrafts — including urlis, diyas, lanterns, decorative "
        f"bowls and home décor for wholesale, retail and corporate gifting buyers.\n\n"
        f"Given {b.company_name}'s focus on {b.buyer_category or 'home & gift retail'}, "
        f"our handcrafted metal ranges may suit your assortment. We support bulk orders, "
        f"custom designs and export enquiries to {b.country or 'international markets'}.\n\n"
        f"Would you be interested in a wholesale quotation or our product catalogue? "
        f"You can request a quote or download the catalogue from our website, or simply "
        f"reply to this email.\n\n"
        f"Best regards,\nNew Look Impex\nnewlookimpex@gmail.com | +91 8218251238\n"
        f"(Moradabad, Uttar Pradesh, India)")
    if llm_configured():
        res = generate(prompt, max_tokens=600)
        if res.get("text"):
            body = res["text"][:3000]
            source = "ai:" + settings_model()
    return {"subject": subject, "body": body, "source": source}


@router.post("/api/buyers/{bid}/outreach-draft", status_code=201)
def create_outreach_draft(bid: int, db: Session = Depends(get_db),
                            u=Depends(require_role("admin", "editor"))):
    b = db.query(models.Buyer).filter(models.Buyer.id == bid).first()
    if not b:
        raise HTTPException(404, "Buyer not found")
    if b.outreach_status in ("unsubscribed", "do_not_contact"):
        raise HTTPException(409, "Contact is suppressed (opt-out). Cannot draft outreach.")
    draft = _outreach_draft(b, db)
    rec = models.OutreachRecord(buyer_id=b.id, channel="email",
                                  subject=draft["subject"], body=draft["body"],
                                  status="draft")
    db.add(rec); db.commit(); db.refresh(rec)
    return {"draft_id": rec.id, "subject": rec.subject, "body": rec.body,
            "source": draft["source"], "status": rec.status}


@router.get("/api/buyers/{bid}/outreach")
def list_outreach(bid: int, db: Session = Depends(get_db),
                    u=Depends(require_role("admin", "editor"))):
    rows = db.query(models.OutreachRecord).filter(models.OutreachRecord.buyer_id == bid) \
        .order_by(models.OutreachRecord.id.desc()).all()
    return {"items": [{"id": r.id, "channel": r.channel, "subject": r.subject,
                        "body": r.body, "status": r.status,
                        "provider_response": r.provider_response,
                        "reply_status": r.reply_status,
                        "sent_at": r.sent_at.isoformat() if r.sent_at else None,
                        "created_at": r.created_at.isoformat() if r.created_at else None}
                       for r in rows]}


@router.post("/api/outreach/{rid}/approve")
def approve_outreach(rid: int, db: Session = Depends(get_db),
                       u=Depends(require_role("admin", "editor"))):
    r = db.query(models.OutreachRecord).filter(models.OutreachRecord.id == rid).first()
    if not r:
        raise HTTPException(404, "Outreach record not found")
    b = db.query(models.Buyer).filter(models.Buyer.id == r.buyer_id).first()
    if b and b.outreach_status in ("unsubscribed", "do_not_contact"):
        r.status = "suppressed"
        db.commit()
        raise HTTPException(409, "Contact is suppressed (opt-out).")
    if r.status != "draft":
        raise HTTPException(409, f"Cannot approve outreach in status '{r.status}'.")
    r.status = "approved"
    db.commit()
    return {"id": r.id, "status": r.status}


@router.post("/api/outreach/{rid}/send")
def send_outreach(rid: int, db: Session = Depends(get_db),
                    u=Depends(require_role("admin"))):
    """Send ONLY through a configured SMTP provider. Records the real provider result."""
    r = db.query(models.OutreachRecord).filter(models.OutreachRecord.id == rid).first()
    if not r:
        raise HTTPException(404, "Outreach record not found")
    b = db.query(models.Buyer).filter(models.Buyer.id == r.buyer_id).first()
    if not b:
        raise HTTPException(404, "Buyer not found")
    if b.outreach_status in ("unsubscribed", "do_not_contact"):
        r.status = "suppressed"
        db.commit()
        raise HTTPException(409, "Contact is suppressed (opt-out). Sending blocked.")
    if r.status != "approved":
        raise HTTPException(409, "Only approved outreach drafts can be sent.")
    if not b.contact_email:
        raise HTTPException(400, "No verified contact email on record. "
                                 "Add a contact email before sending (no fabrication).")
    ok, detail = send_email(b.contact_email, r.subject, r.body)
    if ok:
        r.status = "sent"
        r.sent_at = NOW()
        r.provider_response = "delivered (SMTP accepted message)"
        b.outreach_status = "contacted"
        db.add(models.AnalyticsEvent(event_type="outreach_sent",
                                         country=b.country, url=""))
    else:
        r.status = "failed"
        r.provider_response = detail
    db.commit()
    return {"id": r.id, "status": r.status, "provider_response": r.provider_response}


@router.post("/api/buyers/{bid}/outreach-status")
def set_outreach_status(bid: int, payload: dict, db: Session = Depends(get_db),
                          u=Depends(require_role("admin", "editor"))):
    b = db.query(models.Buyer).filter(models.Buyer.id == bid).first()
    if not b:
        raise HTTPException(404, "Buyer not found")
    allowed = {"not_contacted", "contacted", "replied", "interested",
               "not_interested", "unsubscribed", "do_not_contact"}
    status = payload.get("outreach_status", "")
    if status not in allowed:
        raise HTTPException(400, f"Invalid outreach_status. Allowed: {sorted(allowed)}")
    b.outreach_status = status
    db.commit()
    return {"id": b.id, "outreach_status": b.outreach_status}
