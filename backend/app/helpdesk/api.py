"""Admin API for the AI Help Desk Manager."""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..auth import require_role
from ..config import settings
from . import service as S
from ..agents.definitions import AGENTS, all_agents

router = APIRouter()
J = lambda v, d=None: __import__("json").loads(v) if isinstance(v, str) and v.strip() else (d if d is not None else v)


@router.get("/api/helpdesk/overview")
def overview(db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    return {
        "agents": len(AGENTS),
        "active_tasks": db.query(models.AgentTask).filter(models.AgentTask.status.in_(
            ["CREATED", "ASSIGNED", "IN_PROGRESS", "WAITING_FOR_AGENT"])).count(),
        "completed_tasks": db.query(models.AgentTask).filter(models.AgentTask.status == "COMPLETED").count(),
        "failed_tasks": db.query(models.AgentTask).filter(models.AgentTask.status == "FAILED").count(),
        "pending_approvals": db.query(models.AiApproval).filter(models.AiApproval.status == "pending").count(),
        "agent_messages": db.query(models.AgentMessage).count(),
        "collaborations": db.query(models.AgentCollaboration).count(),
        "agent_reports": db.query(models.AgentReport).count(),
        "weekly_reports": db.query(models.WeeklyReport).count(),
        "week": S.current_week(),
        "autonomy": "approval_required",
    }


@router.get("/api/helpdesk/agents")
def agents(db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    out = []
    for a in all_agents():
        rep = db.query(models.AgentReport).filter(models.AgentReport.agent_key == a["key"],
                                                  models.AgentReport.week == S.current_week()).first()
        out.append({**a, "report_status": rep.status if rep else "incomplete"})
    return {"items": out}


@router.post("/api/helpdesk/conversations", status_code=201)
def new_conversation(body: dict, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    return S.new_conversation(db, u.email, str(body.get("title") or "Help Desk"))


@router.get("/api/helpdesk/conversations")
def conversations(db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    rows = db.query(models.HelpdeskConversation).order_by(models.HelpdeskConversation.updated_at.desc()).limit(50).all()
    return {"items": [{"id": c.id, "title": c.title,
                       "updated_at": c.updated_at.isoformat() if c.updated_at else None} for c in rows]}


@router.get("/api/helpdesk/conversations/{cid}/messages")
def messages(cid: str, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    rows = db.query(models.HelpdeskMessage).filter(models.HelpdeskMessage.conversation_id == cid).all()
    return {"items": [{"id": m.id, "role": m.role, "content": m.content,
                       "actions": J(m.actions_json, []),
                       "created_at": m.created_at.isoformat() if m.created_at else None} for m in rows]}


@router.post("/api/helpdesk/chat")
def chat(body: dict, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    message = str(body.get("message") or "").strip()
    if not message:
        raise HTTPException(400, "message required")
    return S.helpdesk_chat(db, message, u.email, body.get("conversation_id"), body.get("autonomy", "approval_required"))


@router.get("/api/helpdesk/tasks")
def tasks(status: str = "", limit: int = 100, db: Session = Depends(get_db),
          u=Depends(require_role("admin", "editor"))):
    q = db.query(models.AgentTask)
    if status:
        q = q.filter(models.AgentTask.status == status)
    rows = q.order_by(models.AgentTask.created_at.desc()).limit(min(limit, 200)).all()
    return {"items": [{"id": t.id, "title": t.title, "agent": t.assigned_agent,
                       "requesting": t.requesting_agent, "status": t.status,
                       "priority": t.priority, "approval_required": bool(t.approval_required),
                       "error": t.error, "output": J(t.output_json, {}),
                       "created_at": t.created_at.isoformat() if t.created_at else None} for t in rows]}


@router.post("/api/helpdesk/tasks", status_code=201)
def create_task(body: dict, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    agent = str(body.get("agent") or "").strip()
    if agent not in AGENTS:
        raise HTTPException(400, "Unknown agent")
    title = str(body.get("title") or "").strip()
    if not title:
        raise HTTPException(400, "title required")
    return S.create_task(db, title, agent, "admin", str(body.get("description") or ""),
                         str(body.get("priority") or "normal"), body.get("depends_on") or [],
                         bool(body.get("approval_required")))


@router.post("/api/helpdesk/tasks/{tid}/run")
def run_task(tid: str, body: dict, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    return S.run_task_now(db, tid, u.email, body.get("autonomy", "approval_required"))


@router.get("/api/helpdesk/messages")
def agent_messages(agent: str = "", limit: int = 100, db: Session = Depends(get_db),
                   u=Depends(require_role("admin", "editor"))):
    q = db.query(models.AgentMessage)
    if agent:
        q = q.filter((models.AgentMessage.from_agent == agent) | (models.AgentMessage.to_agent == agent))
    rows = q.order_by(models.AgentMessage.created_at.desc()).limit(min(limit, 200)).all()
    return {"items": [{"id": m.id, "from": m.from_agent, "to": m.to_agent, "kind": m.kind,
                       "subject": m.subject, "body": m.body, "references": J(m.references_json, []),
                       "created_at": m.created_at.isoformat() if m.created_at else None} for m in rows]}


@router.get("/api/helpdesk/collaborations")
def collaborations(db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    rows = db.query(models.AgentCollaboration).order_by(models.AgentCollaboration.created_at.desc()).limit(50).all()
    return {"items": [{"id": c.id, "topic": c.topic, "agents": J(c.agents_json, []),
                       "status": c.status, "result": J(c.result_json, {}),
                       "created_at": c.created_at.isoformat() if c.created_at else None} for c in rows]}


@router.post("/api/helpdesk/collaborations", status_code=201)
def collaborate(body: dict, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    topic = str(body.get("topic") or "").strip()
    if not topic:
        raise HTTPException(400, "topic required")
    keys = body.get("agents") or []
    if not isinstance(keys, list):
        raise HTTPException(400, "agents must be a list")
    return S.collaborate(db, topic, keys, u.email)


@router.get("/api/helpdesk/monitoring")
def monitoring(db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    rows = db.query(models.WebsiteMonitoring).order_by(models.WebsiteMonitoring.created_at.desc()).limit(100).all()
    return {"items": [{"id": m.id, "day": m.day, "check": m.check, "status": m.status,
                       "result": J(m.result_json, {})} for m in rows]}


@router.post("/api/helpdesk/monitoring/run")
def run_monitoring(db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    return S.run_monitoring(db, u.email)


@router.get("/api/helpdesk/reports")
def reports(db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    rows = db.query(models.WeeklyReport).order_by(models.WeeklyReport.created_at.desc()).limit(50).all()
    return {"items": [{"id": r.id, "week": r.week, "title": r.title, "summary": r.summary,
                       "status": r.status, "pdf_filename": r.pdf_filename, "emailed": bool(r.emailed),
                       "created_at": r.created_at.isoformat() if r.created_at else None} for r in rows]}


@router.post("/api/helpdesk/reports/generate", status_code=201)
def generate_report(body: dict, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    return S.generate_weekly_report(db, body.get("week"), bool(body.get("force")))


@router.get("/api/helpdesk/reports/{rid}")
def report_detail(rid: str, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    r = db.query(models.WeeklyReport).filter(models.WeeklyReport.id == rid).first()
    if not r:
        raise HTTPException(404, "Report not found")
    return {"id": r.id, "week": r.week, "title": r.title, "summary": r.summary,
            "data": J(r.sections_json, {}), "pdf_filename": r.pdf_filename}


@router.post("/api/helpdesk/reports/{rid}/pdf")
def report_pdf(rid: str, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    return S.generate_report_pdf(db, rid)


@router.get("/api/helpdesk/reports/{rid}/download")
def download_report(rid: str, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    from fastapi.responses import FileResponse
    from ..media_store import MEDIA_DIR
    r = db.query(models.WeeklyReport).filter(models.WeeklyReport.id == rid).first()
    if not r or not r.pdf_filename:
        raise HTTPException(404, "PDF not generated")
    p = MEDIA_DIR / r.pdf_filename
    if not p.exists():
        raise HTTPException(404, "PDF missing")
    return FileResponse(str(p), media_type="application/pdf", filename=f"weekly-report-{r.week}.pdf")


@router.get("/api/helpdesk/knowledge")
def knowledge(category: str = "", db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    q = db.query(models.BusinessKnowledge)
    if category:
        q = q.filter(models.BusinessKnowledge.category == category)
    rows = q.order_by(models.BusinessKnowledge.category).all()
    return {"items": [{"id": k.id, "category": k.category, "key": k.key, "value": k.value,
                       "source": k.source, "verified": bool(k.verified)} for k in rows]}


@router.get("/api/helpdesk/settings")
def settings_get(db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    row = db.query(models.SiteContent).filter(models.SiteContent.key == "helpdesk_settings").first()
    defaults = {"autonomy": "approval_required", "weekly_report_day": "Friday",
                "weekly_report_time": "18:00", "timezone": "Asia/Kolkata",
                "notifications": {"new_enquiry": True, "approval": True, "failed_task": True, "weekly_report": True}}
    return {**defaults, **(J(row.value, {}) if row else {})}


@router.put("/api/helpdesk/settings")
def settings_put(body: dict, db: Session = Depends(get_db), u=Depends(require_role("admin",))):
    row = db.query(models.SiteContent).filter(models.SiteContent.key == "helpdesk_settings").first()
    if row is None:
        row = models.SiteContent(key="helpdesk_settings"); db.add(row)
    row.value = S.DUMP(body); db.commit()
    return {"ok": True, "settings": body}


@router.get("/api/helpdesk/notifications")
def notifications(db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    """Derive alerts from real database state; no fabricated notifications."""
    from datetime import datetime, timedelta, timezone
    prefs = {p.event: p for p in db.query(models.NotificationPreference).all()}
    def on(event):
        p = prefs.get(event)
        return p is None or bool(p.enabled)
    out = []
    pending = db.query(models.AiApproval).filter(models.AiApproval.status == "pending").count()
    if pending and on("approval"):
        out.append({"event": "approval", "level": "warning", "title": f"{pending} change(s) await approval",
                    "link": "/admin/approvals"})
    failed = db.query(models.AgentTask).filter(models.AgentTask.status == "FAILED").count()
    if failed and on("failed_task"):
        out.append({"event": "failed_task", "level": "error", "title": f"{failed} agent task(s) failed",
                    "link": "/admin/helpdesk"})
    since = datetime.utcnow() - timedelta(days=1)
    new_enq = db.query(models.Enquiry).filter(models.Enquiry.created_at >= since).count()
    if new_enq and on("new_enquiry"):
        out.append({"event": "new_enquiry", "level": "info", "title": f"{new_enq} new enquiry(ies) in 24h",
                    "link": "/admin/enquiries"})
    blocked = db.query(models.AgentMessage).filter(models.AgentMessage.kind == "blocker").count()
    if blocked and on("failed_task"):
        out.append({"event": "blocker", "level": "warning", "title": f"{blocked} agent blocker(s) reported",
                    "link": "/admin/helpdesk"})
    return {"items": out}


@router.get("/api/helpdesk/permissions")
def permissions(u=Depends(require_role("admin", "editor"))):
    return {"levels": S.LEVELS, "note": "Level 3 is always blocked; Level 2 requires approval."}
