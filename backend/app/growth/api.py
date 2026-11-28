"""Admin API for the 24/7 autonomous growth system."""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..auth import require_role
from ..config import settings
from ..media_store import MEDIA_DIR
from . import controller, seo, service, rollback
from ..helpdesk import service as H
from ..worker import worker_status, set_emergency_stop, set_agent_paused
from ..agents.definitions import AGENTS

router = APIRouter()
J = lambda v, d=None: __import__("json").loads(v) if isinstance(v, str) and v.strip() else (d if d is not None else v)


@router.get("/api/growth/controller/status")
def controller_status(db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    return controller.status(db)


@router.get("/api/growth/controller/tasks")
def controller_tasks(limit: int = 20, db: Session = Depends(get_db),
                     u=Depends(require_role("admin", "editor"))):
    return {"items": controller.next_tasks(db, min(limit, 100))}


@router.post("/api/growth/controller/tasks")
def controller_create_task(payload: dict, db: Session = Depends(get_db),
                           u=Depends(require_role("admin",))):
    return controller.create_task(
        db, str(payload.get("title") or ""), str(payload.get("component") or ""),
        str(payload.get("kind") or ""), payload.get("evidence") or {},
        str(payload.get("agent") or ""), bool(payload.get("approval_required")),
        u.email)


@router.post("/api/growth/controller/tasks/{tid}/approve")
def controller_approve_task(tid: str, db: Session = Depends(get_db),
                            u=Depends(require_role("admin",))):
    result = controller.approve_task(db, tid, u.email)
    if not result.get("ok"):
        raise HTTPException(400, result.get("error", "Approval failed"))
    return result


@router.post("/api/growth/controller/tasks/{tid}/report")
def controller_report_task(tid: str, payload: dict, db: Session = Depends(get_db),
                           u=Depends(require_role("admin", "editor"))):
    result = controller.report_result(db, tid, payload.get("evidence") or {},
                                      bool(payload.get("ok")), u.email)
    if not result.get("ok"):
        raise HTTPException(404, result.get("error", "Task not found"))
    return result


@router.post("/api/growth/controller/regression")
def controller_regression(payload: dict, db: Session = Depends(get_db),
                          u=Depends(require_role("admin",))):
    return controller.reopen_on_regression(db, str(payload.get("component") or ""),
                                           payload.get("evidence") or {})


@router.get("/api/growth/status")
def status(db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    ws = worker_status()
    ws["gsc_configured"] = seo.gsc_configured(db)
    ws["ga4_configured"] = seo.ga4_configured()
    ws["automation_runs"] = db.query(models.AutomationRun).count()
    ws["open_issues"] = db.query(models.GrowthIssue).filter(models.GrowthIssue.status == "open").count()
    return ws


@router.post("/api/growth/emergency-stop")
def emergency_stop(body: dict, u=Depends(require_role("admin",))):
    on = bool(body.get("on", True))
    return set_emergency_stop(on)


@router.post("/api/growth/agents/{key}/pause")
def pause_agent(key: str, body: dict, u=Depends(require_role("admin",))):
    if key not in AGENTS:
        raise HTTPException(400, "Unknown agent")
    return set_agent_paused(key, bool(body.get("paused", True)))


@router.get("/api/growth/schedules")
def get_schedules(db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    return {"items": service.schedules(db)}


@router.put("/api/growth/schedules/{key}")
def put_schedule(key: str, body: dict, db: Session = Depends(get_db), u=Depends(require_role("admin",))):
    r = service.set_schedule(db, key, body)
    if not r.get("ok"):
        raise HTTPException(400, r.get("error"))
    return r


@router.post("/api/growth/jobs/{job}/run")
def run_job(job: str, body: dict, db: Session = Depends(get_db), u=Depends(require_role("admin",))):
    return service.run_job(db, job, force=bool(body.get("force")), user=u.email)


@router.get("/api/growth/integrations")
def integrations(db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    row = db.query(models.Integration).filter(models.Integration.provider == "google_search_console").first()
    return {"items": [
        {"name": "Google Search Console", "configured": seo.gsc_configured(db),
         "status": row.status if row else "disconnected", "property": row.property_id if row else "",
         "note": "Sync via /api/integrations/google/search-console/sync"},
        {"name": "Google Analytics 4", "configured": seo.ga4_configured(),
         "status": "connected" if seo.ga4_configured() else "not_configured",
         "property": settings.GA4_PROPERTY_ID,
         "note": "Requires GA4_PROPERTY_ID + GA4_SERVICE_ACCOUNT_JSON. Metrics unavailable otherwise."},
        {"name": "Email notifications", "configured": bool(settings.RESEND_API_KEY or settings.SMTP_HOST),
         "status": "configured", "note": "Uses existing email infrastructure"},
        {"name": "n8n webhooks", "configured": bool(settings.N8N_WEBHOOK_TOKEN),
         "status": "configured" if settings.N8N_WEBHOOK_TOKEN else "not_configured",
         "note": "Existing workflows in n8n-workflows/"},
    ]}


@router.get("/api/growth/seo/analysis")
def seo_analysis(days: int = 28, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    return seo.keyword_analysis(db, days)


@router.post("/api/growth/seo/sync")
def seo_sync(days: int = 28, db: Session = Depends(get_db), u=Depends(require_role("admin",))):
    return seo.sync_keywords(db, days)


@router.post("/api/growth/seo/ga4-sync")
def ga4_sync(days: int = 28, db: Session = Depends(get_db), u=Depends(require_role("admin",))):
    return seo.ga4_sync(db, days)


@router.get("/api/growth/keywords")
def keywords(status: str = "", limit: int = 100, db: Session = Depends(get_db),
             u=Depends(require_role("admin", "editor"))):
    q = db.query(models.SeoKeyword)
    if status:
        q = q.filter(models.SeoKeyword.status == status)
    rows = q.order_by(models.SeoKeyword.priority.asc(), models.SeoKeyword.impressions.desc()).limit(min(limit, 300)).all()
    return {"items": [{"id": k.id, "keyword": k.keyword, "country": k.country, "intent": k.intent,
                       "source": k.source, "clicks": k.clicks, "impressions": k.impressions,
                       "ctr": k.ctr, "position": k.position, "target_url": k.target_url,
                       "priority": k.priority, "status": k.status} for k in rows]}


@router.get("/api/growth/snapshots")
def snapshots(db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    rows = db.query(models.SeoSnapshot).order_by(models.SeoSnapshot.created_at.desc()).limit(60).all()
    return {"items": [{"period": r.period, "source": r.source, "clicks": r.clicks,
                       "impressions": r.impressions, "ctr": r.ctr, "note": r.note} for r in rows]}


@router.get("/api/growth/issues")
def issues(status: str = "open", db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    rows = db.query(models.GrowthIssue).filter(models.GrowthIssue.status == status).limit(100).all()
    return {"items": [{"id": i.id, "kind": i.kind, "severity": i.severity, "subject": i.subject,
                       "evidence": i.evidence, "agent": i.suggested_agent, "status": i.status,
                       "task_id": i.task_id} for i in rows]}


@router.post("/api/growth/issues/detect")
def detect(db: Session = Depends(get_db), u=Depends(require_role("admin",))):
    return seo.detect_issues(db)


@router.post("/api/growth/issues/tasks")
def issue_tasks(db: Session = Depends(get_db), u=Depends(require_role("admin",))):
    return seo.issue_tasks(db)


@router.get("/api/growth/changes")
def changes(db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    rows = db.query(models.WebsiteChange).order_by(models.WebsiteChange.created_at.desc()).limit(100).all()
    return {"items": [{"id": c.id, "kind": c.kind, "target": c.target, "status": c.status,
                       "verification": c.verification, "applied_by": c.applied_by,
                       "before": J(c.before_json, {}), "after": J(c.after_json, {}),
                       "rolled_back_at": c.rolled_back_at.isoformat() if c.rolled_back_at else None}
                      for c in rows]}


@router.post("/api/growth/changes/{cid}/verify")
def verify_change(cid: str, body: dict, db: Session = Depends(get_db), u=Depends(require_role("admin",))):
    c = db.query(models.WebsiteChange).filter(models.WebsiteChange.id == cid).first()
    if not c:
        raise HTTPException(404, "Change not found")
    c.verification = str(body.get("verification") or "verified live")[:1000]
    db.commit()
    return {"ok": True, "verification": c.verification}


@router.post("/api/growth/changes/{cid}/rollback")
def rollback_change(cid: str, db: Session = Depends(get_db), u=Depends(require_role("admin",))):
    return rollback.apply_rollback(db, cid, u.email)


@router.get("/api/growth/reports")
def reports(db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    rows = db.query(models.GrowthReport).order_by(models.GrowthReport.created_at.desc()).limit(50).all()
    return {"items": [{"id": r.id, "week": r.week, "title": r.title, "summary": r.summary,
                       "pdf_filename": r.pdf_filename, "emailed": bool(r.emailed)} for r in rows]}


@router.post("/api/growth/reports/generate", status_code=201)
def generate_report(body: dict, db: Session = Depends(get_db), u=Depends(require_role("admin",))):
    return service.generate_growth_report(db, body.get("week"), bool(body.get("force")))


@router.get("/api/growth/reports/{rid}")
def report_detail(rid: str, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    r = db.query(models.GrowthReport).filter(models.GrowthReport.id == rid).first()
    if not r:
        raise HTTPException(404, "Report not found")
    return {"id": r.id, "week": r.week, "title": r.title, "summary": r.summary,
            "data": J(r.sections_json, {}), "pdf_filename": r.pdf_filename}


@router.post("/api/growth/reports/{rid}/pdf")
def report_pdf(rid: str, db: Session = Depends(get_db), u=Depends(require_role("admin",))):
    return service.generate_growth_pdf(db, rid)


@router.get("/api/growth/reports/{rid}/download")
def report_download(rid: str, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    r = db.query(models.GrowthReport).filter(models.GrowthReport.id == rid).first()
    if not r or not r.pdf_filename:
        raise HTTPException(404, "PDF not generated")
    path = MEDIA_DIR / r.pdf_filename
    if not path.exists():
        raise HTTPException(404, "PDF missing")
    return FileResponse(str(path), media_type="application/pdf", filename=f"growth-report-{r.week}.pdf")


@router.get("/api/growth/runs")
def runs(db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    rows = db.query(models.AutomationRun).order_by(models.AutomationRun.started_at.desc()).limit(100).all()
    return {"items": [{"job": r.job, "period": r.period, "status": r.status, "error": r.error,
                       "started_at": r.started_at.isoformat() if r.started_at else None,
                       "finished_at": r.finished_at.isoformat() if r.finished_at else None} for r in rows]}
