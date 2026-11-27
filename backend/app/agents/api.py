"""API routes for the AI Command Centre, agents, approvals and public sales chat."""
from __future__ import annotations
import json
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..auth import require_role
from ..config import settings
from ..llm import generate
from ..rate_limiter import rate_limit_check, client_ip
from ..email import send_email, notify_recipients, recipients
from ..text import slugify
from .definitions import AGENTS, SHARED_CONTEXT, all_agents
from .orchestrator import route_intent, run_task
from .tools import TOOLS, get_analytics, search_products, get_website_overview

router = APIRouter()

J = lambda v, d=None: json.loads(v) if isinstance(v, str) and v.strip() else (d if d is not None else v)


# ---------------- agent registry ----------------

@router.get("/api/agents")
def list_agents(db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    stored = {a.key: a for a in db.query(models.AiAgent).all()}
    out = []
    for a in all_agents():
        row = stored.get(a["key"])
        out.append({**a, "enabled": bool(row.enabled) if row else True,
                    "runs": db.query(models.AiTaskStep).filter(models.AiTaskStep.agent_key == a["key"]).count()})
    return {"items": out}


# ---------------- automation schedules ----------------

@router.get("/api/agents/schedules")
def list_schedules(db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    from ..agent_scheduler import SCHEDULES, enabled
    return {"items": [{"kind": k, "cadence": v[0], "description": v[1], "enabled": enabled(k)}
                      for k, v in SCHEDULES.items()]}


@router.post("/api/agents/schedules/{kind}/run")
def run_schedule_now(kind: str, enabled: bool | None = None, db: Session = Depends(get_db),
                     u=Depends(require_role("admin",))):
    from ..agent_scheduler import SCHEDULES, run_schedule
    if kind not in SCHEDULES:
        raise HTTPException(404, "Unknown schedule")
    if enabled is not None:
        row = db.query(models.SiteContent).filter(models.SiteContent.key == f"ai_schedule::{kind}").first()
        if row is None:
            row = models.SiteContent(key=f"ai_schedule::{kind}"); db.add(row)
        row.value = json.dumps(bool(enabled)); db.commit()
    return run_schedule(kind)


@router.get("/api/agents/{key}")
def agent_detail(key: str, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    a = AGENTS.get(key)
    if not a:
        raise HTTPException(404, "Agent not found")
    steps = (db.query(models.AiTaskStep).filter(models.AiTaskStep.agent_key == key)
             .order_by(models.AiTaskStep.created_at.desc()).limit(30).all())
    return {**a, "activity": [{"id": s.id, "status": s.status, "action": s.action,
                               "created_at": s.created_at.isoformat() if s.created_at else None} for s in steps]}


@router.post("/api/agents/{key}/execute")
def execute_agent(key: str, body: dict, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    if key not in AGENTS:
        raise HTTPException(404, "Agent not found")
    message = str(body.get("message") or "").strip()
    if not message:
        raise HTTPException(400, "message required")
    result = run_task(db, message, u.email, body.get("session_id"), [key], bool(body.get("auto_publish")))
    return result


# ---------------- orchestrator chat / tasks ----------------

@router.post("/api/ai/chat")
def ai_chat(body: dict, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    message = str(body.get("message") or "").strip()
    if not message:
        raise HTTPException(400, "message required")
    keys = body.get("agents")
    if keys is not None and not isinstance(keys, list):
        raise HTTPException(400, "agents must be a list")
    result = run_task(db, message, u.email, body.get("session_id"), keys, bool(body.get("auto_publish")))
    return {"session_id": body.get("session_id"), "route": route_intent(message), **result}


@router.get("/api/ai/tasks")
def list_tasks(status: str = "", limit: int = 50, db: Session = Depends(get_db),
               u=Depends(require_role("admin", "editor"))):
    q = db.query(models.AiTask)
    if status:
        q = q.filter(models.AiTask.status == status)
    rows = q.order_by(models.AiTask.created_at.desc()).limit(min(limit, 200)).all()
    return {"items": [{"id": r.id, "request": r.request, "status": r.status,
                       "agents": J(r.agents_json, []), "error": r.error,
                       "created_at": r.created_at.isoformat() if r.created_at else None} for r in rows]}


@router.get("/api/ai/tasks/{task_id}")
def task_detail(task_id: str, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    task = db.query(models.AiTask).filter(models.AiTask.id == task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    steps = db.query(models.AiTaskStep).filter(models.AiTaskStep.task_id == task_id).all()
    return {"id": task.id, "request": task.request, "status": task.status,
            "agents": J(task.agents_json, []), "result": J(task.result_json, {}),
            "error": task.error,
            "steps": [{"id": s.id, "agent": s.agent_key, "action": s.action, "status": s.status,
                       "output": J(s.output_json, {}), "error": s.error} for s in steps]}


@router.post("/api/ai/tasks/{task_id}/retry")
def retry_task(task_id: str, body: dict, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    task = db.query(models.AiTask).filter(models.AiTask.id == task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    if task.status not in ("failed", "cancelled"):
        raise HTTPException(400, "Only failed/cancelled tasks can be retried")
    return run_task(db, task.request, u.email, task.session_id, J(task.agents_json, []), bool(body.get("auto_publish")))


# ---------------- unified approvals ----------------

@router.get("/api/approvals")
def list_approvals(status: str = "pending", limit: int = 100, db: Session = Depends(get_db),
                   u=Depends(require_role("admin", "editor"))):
    q = db.query(models.AiApproval)
    if status and status != "all":
        q = q.filter(models.AiApproval.status == status)
    rows = q.order_by(models.AiApproval.created_at.desc()).limit(min(limit, 200)).all()
    return {"items": [{"id": r.id, "task_id": r.task_id, "agent": r.agent_key, "kind": r.kind,
                       "title": r.title, "summary": r.summary,
                       "previous": J(r.previous_json, {}), "proposed": J(r.proposed_json, {}),
                       "status": r.status, "requested_by": r.requested_by,
                       "created_at": r.created_at.isoformat() if r.created_at else None} for r in rows]}


def _apply_approval(db, row) -> dict:
    kind = row.kind
    p = J(row.proposed_json, {})
    if kind == "product_change":
        product = db.query(models.Product).filter(models.Product.id == p.get("product_id")).first()
        if not product:
            # product_id is in previous, not proposed — resolve from previous
            prev = J(row.previous_json, {})
            product = db.query(models.Product).filter(models.Product.id == prev.get("id")).first()
        if not product:
            return {"ok": False, "error": "Product no longer exists"}
        for k, v in p.items():
            if hasattr(product, k):
                setattr(product, k, v)
        db.flush(); return {"ok": True, "entity_id": product.id}
    if kind == "product_create":
        from .tools import create_product_record
        result = create_product_record(db, p)
        return {"ok": True, "entity_id": result["product_id"],
                "images_attached": result.get("images_attached", 0)}
    if kind == "site_content":
        key = p.get("key")
        row2 = db.query(models.SiteContent).filter(models.SiteContent.key == key).first()
        if row2 is None:
            row2 = models.SiteContent(key=key); db.add(row2)
        row2.value = json.dumps(p.get("value"), ensure_ascii=False)
        db.flush(); return {"ok": True, "entity_id": row2.id}
    if kind == "banner_create":
        b = models.Banner(placement=p.get("placement", "home_hero"), title=p.get("title", ""),
                          subtitle=p.get("subtitle", ""), image_url=p.get("image_url", ""),
                          cta_text=p.get("cta_text", ""), cta_link=p.get("cta_link", ""),
                          is_active=bool(p.get("is_active", True)))
        db.add(b); db.flush(); return {"ok": True, "entity_id": b.id}
    if kind == "seo_page":
        path = p.get("path") or "/"
        s = db.query(models.SeoPage).filter(models.SeoPage.path == path).first()
        if s is None:
            s = models.SeoPage(path=path, title="", meta_description="")
            db.add(s)
        for k, v in p.items():
            if hasattr(s, k) and k != "path":
                setattr(s, k, v)
        db.flush(); return {"ok": True, "entity_id": s.id}
    if kind == "followup":
        f = models.SalesFollowup(enquiry_id=p.get("enquiry_id"), subject=p.get("subject", ""),
                                 body=p.get("body", ""), channel=p.get("channel", "email"), status="approved")
        db.add(f); db.flush(); return {"ok": True, "entity_id": f.id}
    return {"ok": False, "error": f"Unsupported approval kind: {kind}"}


@router.post("/api/approvals/{approval_id}/approve")
def approve(approval_id: str, body: dict, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    row = db.query(models.AiApproval).filter(models.AiApproval.id == approval_id).first()
    if not row:
        raise HTTPException(404, "Approval not found")
    if row.status != "pending":
        raise HTTPException(400, "Approval is not pending")
    # capture before-state for verifiable rollback
    from ..growth.rollback import capture_before, record_change
    before = capture_before(db, row.kind, J(row.proposed_json, {}), J(row.previous_json, {}))
    result = _apply_approval(db, row)
    if not result.get("ok"):
        raise HTTPException(400, result.get("error", "Apply failed"))
    row.status = "executed"; row.decided_by = u.email
    row.decided_at = datetime.now(timezone.utc).replace(tzinfo=None)
    row.notes = str(body.get("notes") or "")[:1000]
    db.add(models.AiExecutionLog(task_id=row.task_id, agent_key=row.agent_key, event="approval_approved",
                                 status="ok", detail_json=json.dumps(result), user_email=u.email))
    change = record_change(db, row, before, result)
    if change and row.kind in ("site_content", "seo_page"):
        change.verification = "pending live verification"
    db.commit()
    # purge homepage cache for content-affecting approvals
    if row.kind in ("site_content", "banner_create", "seo_page"):
        import httpx
        try:
            httpx.post(f"{settings.PUBLIC_SITE_URL.rstrip('/')}/api/revalidate",
                       json={"paths": ["/"]}, headers={"x-revalidate-secret": settings.REVALIDATE_SECRET}, timeout=10)
        except Exception:
            pass
    return {"ok": True, "approval": approval_id, **result}


@router.post("/api/approvals/{approval_id}/reject")
def reject(approval_id: str, body: dict, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    row = db.query(models.AiApproval).filter(models.AiApproval.id == approval_id).first()
    if not row:
        raise HTTPException(404, "Approval not found")
    row.status = "rejected"; row.decided_by = u.email
    row.decided_at = datetime.now(timezone.utc).replace(tzinfo=None)
    row.notes = str(body.get("notes") or "")[:1000]
    db.commit()
    return {"ok": True, "approval": approval_id}


# ---------------- business knowledge ----------------

@router.get("/api/knowledge")
def list_knowledge(category: str = "", db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    q = db.query(models.BusinessKnowledge)
    if category:
        q = q.filter(models.BusinessKnowledge.category == category)
    rows = q.order_by(models.BusinessKnowledge.category, models.BusinessKnowledge.key).all()
    return {"items": [{"id": r.id, "category": r.category, "key": r.key, "value": r.value,
                       "source": r.source, "verified": bool(r.verified)} for r in rows]}


@router.post("/api/knowledge", status_code=201)
def add_knowledge(body: dict, db: Session = Depends(get_db), u=Depends(require_role("admin",))):
    key = str(body.get("key") or "").strip()
    if not key:
        raise HTTPException(400, "key required")
    row = models.BusinessKnowledge(category=str(body.get("category") or "company"), key=key,
                                   value=str(body.get("value") or ""), source=str(body.get("source") or ""),
                                   verified=bool(body.get("verified")))
    db.add(row)
    try:
        db.commit()
    except Exception:
        db.rollback(); raise HTTPException(409, "Knowledge entry already exists")
    return {"id": row.id}


# ---------------- analytics overview for command centre ----------------

@router.get("/api/analytics/overview")
def analytics_overview(db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    a = get_analytics(db)
    o = get_website_overview(db)
    pending = db.query(models.AiApproval).filter(models.AiApproval.status == "pending").count()
    tasks = db.query(models.AiTask).count()
    return {"site": o, "analytics": a, "pending_approvals": pending,
            "agent_tasks": tasks,
            "note": "All values come from the database; sample analytics rows are excluded."}


# ---------------- PUBLIC sales assistant (never admin-authenticated) ----------------

PUBLIC_SYSTEM = SHARED_CONTEXT + """
You are the public sales assistant on the New Look Impex website. Behave like a
professional international B2B export manager. Ask ONE question at a time.
Collect: full name, company, business email, country, WhatsApp/phone, interested
product, quantity, customisation, shipping destination, extra message.
Never ask all fields together. Never invent prices, MOQ, stock, certifications,
delivery dates or specifications. Offer product exploration from the catalogue
context supplied. When enough fields are collected, say you will save the
enquiry. Return ONLY JSON:
{"reply":"...","fields":{"name":"","company":"","email":"","country":"","phone":"","product":"","quantity":"","customisation":"","destination":"","message":""},"ready":false,"products":[]}
Set ready=true only when name, email and at least one interest are present.
"""

SALES_FIELDS = ("name", "company", "email", "country", "phone", "product", "quantity",
                "customisation", "destination", "message")


@router.post("/api/public/assistant/chat")
def public_assistant_chat(body: dict, request: Request, db: Session = Depends(get_db)):
    allowed, retry_after = rate_limit_check(f"assistant:{client_ip(request)}", 20, 3600)
    if not allowed:
        raise HTTPException(429, f"Rate limit exceeded. Try again in {retry_after}s.")
    message = str(body.get("message") or "").strip()[:2000]
    if not message:
        raise HTTPException(400, "message required")
    history = body.get("history") or []
    if not isinstance(history, list):
        history = []
    history = history[-8:]
    convo = "\n".join(f"{h.get('role','user')}: {str(h.get('content',''))[:300]}" for h in history if isinstance(h, dict))
    products = search_products(db, query=message, limit=6).get("items", [])
    ctx = {"products": products[:6], "history": convo}
    res = generate(f"{convo}\nVISITOR: {message}\n\nCATALOGUE CONTEXT:\n{json.dumps(ctx, ensure_ascii=False)[:2000]}",
                   system=PUBLIC_SYSTEM, max_tokens=900)
    text = (res.get("text") or "").strip().replace("```json", "").replace("```", "")
    start, end = text.find("{"), text.rfind("}")
    parsed = {}
    if start >= 0 and end > start:
        try:
            parsed = json.loads(text[start:end + 1])
        except (TypeError, ValueError):
            parsed = {}
    reply = str(parsed.get("reply") or "How can I help with your wholesale enquiry today?")[:1200]
    fields = {k: str((parsed.get("fields") or {}).get(k) or "")[:255] for k in SALES_FIELDS}
    # Client-held conversation state wins over LLM-extracted fields
    supplied = body.get("fields")
    if isinstance(supplied, dict):
        for k in SALES_FIELDS:
            if supplied.get(k):
                fields[k] = str(supplied[k])[:255]
    ready = bool(fields["name"]) and bool(fields["email"]) and bool(fields["product"] or fields["message"])
    saved = None
    if ready and body.get("consent"):
        # dedupe by email within 24h
        from datetime import timedelta
        since = datetime.utcnow() - timedelta(hours=24)
        existing = (db.query(models.Enquiry)
                    .filter(models.Enquiry.email == fields["email"], models.Enquiry.created_at >= since).first())
        if not existing:
            e = models.Enquiry(
                # Unique reference: count()+1 collides under concurrent requests.
                reference=f"NLI-{datetime.utcnow().year}-{uuid.uuid4().hex[:8].upper()}",
                name=fields["name"], email=fields["email"], company=fields["company"],
                phone=fields["phone"], country=fields["country"],
                product_interest=fields["product"] or fields["message"],
                quantity=fields["quantity"], message=(fields["customisation"] + " " + fields["destination"] + " " + fields["message"]).strip()[:2000],
                consent=True, status="new", score=0.4, landing_page="/assistant")
            db.add(e); db.commit(); db.refresh(e)
            saved = {"reference": e.reference, "id": e.id}
            ok, detail = send_email(notify_recipients(), f"New chatbot enquiry {e.reference} — {e.name}",
                                    f"Reference: {e.reference}\nName: {e.name}\nCompany: {e.company}\n"
                                    f"Email: {e.email}\nCountry: {e.country}\nPhone: {e.phone}\n"
                                    f"Product: {e.product_interest}\nQuantity: {e.quantity}\n"
                                    f"Message: {e.message}\nAdmin: /admin/enquiries")
            db.add(models.WorkflowExecution(workflow="assistant_enquiry",
                                            status="completed" if ok else "failed", detail=detail[:200]))
            db.commit()
            reply += f"\n\nSaved as enquiry {e.reference}. Our export team will reply."
        else:
            saved = {"reference": existing.reference, "duplicate": True}
            reply += f"\n\nThis enquiry already exists as {existing.reference}."
    return {"reply": reply, "fields": fields, "ready": ready, "saved": saved,
            "products": [{"id": p["id"], "name": p["name"], "slug": p["slug"]} for p in products[:6]],
            "whatsapp": "https://wa.me/919690053913",
            "configured": bool(res.get("configured"))}
