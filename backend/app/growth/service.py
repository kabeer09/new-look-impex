"""Job orchestration, schedules and the consolidated weekly growth report."""
from __future__ import annotations
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from .. import models
from ..agents.tools import get_website_overview, get_analytics, seo_audit
from ..helpdesk import service as H
from . import seo

DUMP = lambda v: __import__("json").dumps(v, ensure_ascii=False, default=str)

JOBS = {
    "continuous_monitor": ("Continuous", "availability, new enquiries, failed tasks, critical errors"),
    "daily_seo": ("Daily", "technical SEO, indexing opportunities, issue tasks"),
    "weekly_keywords": ("Weekly", "keyword research, competitor and content planning"),
    "weekly_collaboration": ("Weekly", "SEO-led multi-agent growth collaboration"),
    "monthly_audit": ("Monthly", "international SEO audit, market and growth strategy"),
    "weekly_report": ("Weekly", "consolidated SEO and business growth report"),
}


def current_week() -> str:
    y, w, _ = datetime.now(timezone.utc).isocalendar()
    return f"{y}-W{w:02d}"


def _period(job: str, now: datetime) -> str:
    if job == "continuous_monitor":
        return now.strftime("%Y-%m-%d-%H")
    if job == "daily_seo":
        return now.strftime("%Y-%m-%d")
    if job in ("weekly_keywords", "weekly_collaboration", "weekly_report"):
        return current_week()
    return now.strftime("%Y-%m")


def schedules(db: Session) -> list[dict]:
    out = []
    for key, (cadence, desc) in JOBS.items():
        row = db.query(models.AutomationSchedule).filter(models.AutomationSchedule.key == key).first()
        out.append({"key": key, "cadence": cadence, "description": desc,
                    "enabled": bool(row.enabled) if row else True,
                    "day": row.day if row else ("Friday" if cadence == "Weekly" else ""),
                    "time": row.time if row else ("18:00" if key == "weekly_report" else "09:00"),
                    "timezone": row.timezone if row else "Asia/Kolkata"})
    return out


def set_schedule(db: Session, key: str, values: dict) -> dict:
    if key not in JOBS:
        return {"ok": False, "error": "Unknown job"}
    row = db.query(models.AutomationSchedule).filter(models.AutomationSchedule.key == key).first()
    if row is None:
        row = models.AutomationSchedule(key=key); db.add(row)
    for f in ("enabled", "cadence", "day", "time", "timezone"):
        if f in values:
            setattr(row, f, values[f])
    db.commit()
    return {"ok": True, "schedule": next(s for s in schedules(db) if s["key"] == key)}


def run_job(db: Session, job: str, force: bool = False, user: str = "scheduler") -> dict:
    """Execute a job once per period. Unique (job, period) prevents duplicates."""
    if job not in JOBS:
        return {"ok": False, "error": "Unknown job"}
    now = datetime.now(timezone.utc)
    period = _period(job, now)
    row = db.query(models.AutomationRun).filter(models.AutomationRun.job == job,
                                                models.AutomationRun.period == period).first()
    if row and not force:
        return {"ok": True, "duplicate": True, "job": job, "period": period,
                "note": "Already executed this period; no duplicate run."}
    if row:
        db.delete(row); db.flush()
    run = models.AutomationRun(job=job, period=period, status="running", started_at=now,
                               worker_id=user)
    db.add(run); db.flush()
    try:
        if job == "continuous_monitor":
            result = _continuous(db)
        elif job == "daily_seo":
            result = _daily_seo(db)
        elif job == "weekly_keywords":
            result = _weekly_keywords(db)
        elif job == "weekly_collaboration":
            result = _weekly_collaboration(db)
        elif job == "monthly_audit":
            result = _monthly(db)
        else:
            result = generate_growth_report(db, force=force)
        run.status = "completed" if result.get("ok") else "failed"
        run.error = str(result.get("error") or "")[:1000]
    except Exception as e:
        run.status = "failed"; run.error = str(e)[:1000]
        result = {"ok": False, "error": str(e)[:300]}
    run.finished_at = datetime.utcnow()
    db.commit()
    return {"ok": result.get("ok", False), "job": job, "period": period, **result}


def _continuous(db: Session) -> dict:
    from ..worker import emergency_stop
    checks = []
    for name, fn in (("overview", get_website_overview), ("seo_metadata", seo_audit)):
        try:
            data = fn(db)
            status = "warning" if (name == "seo_metadata" and data.get("products_missing_seo")) else "ok"
        except Exception as e:
            data, status = {"error": str(e)[:200]}, "failed"
        db.add(models.WebsiteMonitoring(day=datetime.utcnow().strftime("%Y-%m-%d-%H"),
                                        check=name, result_json=DUMP(data), status=status))
        checks.append({"check": name, "status": status})
    failed = db.query(models.AgentTask).filter(models.AgentTask.status == "FAILED").count()
    new_enq = db.query(models.Enquiry).filter(models.Enquiry.status == "new").count()
    db.commit()
    return {"ok": True, "checks": checks, "failed_tasks": failed, "new_enquiries": new_enq,
            "emergency_stop": emergency_stop()}


def _daily_seo(db: Session) -> dict:
    snap = seo.snapshot(db)
    issues = seo.detect_issues(db)
    tasks = seo.issue_tasks(db, limit=8)
    return {"ok": True, "snapshot": snap, "issues": issues, "tasks": tasks}


def _weekly_keywords(db: Session) -> dict:
    synced = seo.sync_keywords(db)
    analysis = seo.keyword_analysis(db)
    task = H.create_task(db, title="SEO growth: prepare monthly keyword and content roadmap",
                         agent="seo", requesting="growth_scheduler",
                         description="Use real GSC keyword data in seo_keywords/seo_snapshots and verified "
                                     "candidate keywords. Produce a prioritised roadmap with intent, country, "
                                     "target URL and expected measurement. Never claim guaranteed rankings.",
                         priority="high", approval_required=False)
    return {"ok": True, "synced": synced, "analysis": analysis, "roadmap_task_id": task.get("id")}


def _weekly_collaboration(db: Session) -> dict:
    task = H.create_task(
        db, title="Growth collaboration: SEO-led first-page opportunity",
        agent="seo", requesting="growth_scheduler", priority="high", approval_required=False,
        description="Coordinate with Export Intelligence, Product, Marketing, Website and Analytics on the "
                    "highest real GSC opportunity. Save all findings as agent messages and tasks.")
    if not task.get("duplicate"):
        # execute through the Help Desk so messages persist
        return {"ok": True, "task_id": task["id"],
                "result": H.run_task_now(db, task["id"], "growth_scheduler", "approval_required")}
    return {"ok": True, "duplicate": True, "task_id": task.get("id")}


def _monthly(db: Session) -> dict:
    seo.snapshot(db, days=90)
    synced = seo.sync_keywords(db, days=90)
    issues = seo.detect_issues(db)
    task = H.create_task(db, title="Monthly international SEO and growth strategy",
                         agent="export_intelligence", requesting="growth_scheduler",
                         description="Using real GSC data, enquiries by country and catalogue facts, prepare an "
                                     "international SEO/market growth strategy with honest source references.",
                         priority="high", approval_required=False)
    return {"ok": True, "synced": synced, "issues": issues, "strategy_task_id": task.get("id")}


# ---------------- weekly consolidated growth report ----------------

SECTION_TITLES = {
    1: "Website Health", 2: "Google Search Console Performance", 3: "Improving & Declining Keywords",
    4: "Keywords With First-Page Potential", 5: "Country-Wise Organic Visibility",
    6: "New Keyword Opportunities", 7: "Competitor Findings", 8: "Product-Page Opportunities",
    9: "Technical SEO Issues", 10: "New & Qualified Buyer Enquiries", 11: "Completed Agent Tasks",
    12: "Failed / Pending Tasks", 13: "Published Changes & Verification", 14: "Next Week's Action Plan",
}


def generate_growth_report(db: Session, week: str | None = None, force: bool = False) -> dict:
    from ..growth import seo as S
    week = week or current_week()
    existing = db.query(models.GrowthReport).filter(models.GrowthReport.week == week).first()
    if existing and not force:
        return {"ok": True, "existing": True, "report_id": existing.id, "week": week}
    analysis = S.keyword_analysis(db)
    overview = get_website_overview(db)
    audit = seo_audit(db)
    monitoring = (db.query(models.WebsiteMonitoring)
                  .order_by(models.WebsiteMonitoring.created_at.desc()).limit(20).all())
    health = [{"check": m.check, "status": m.status, "day": m.day} for m in monitoring]
    enquiries = db.query(models.Enquiry).order_by(models.Enquiry.id.desc()).limit(30).all()
    completed = db.query(models.AgentTask).filter(models.AgentTask.status == "COMPLETED").count()
    failed = db.query(models.AgentTask).filter(models.AgentTask.status == "FAILED").count()
    pending = db.query(models.AgentTask).filter(models.AgentTask.status.in_(
        ["CREATED", "ASSIGNED", "IN_PROGRESS", "WAITING_FOR_AGENT", "WAITING_FOR_APPROVAL"])).count()
    approvals = db.query(models.AiApproval).filter(models.AiApproval.status == "pending").count()
    changes = db.query(models.WebsiteChange).order_by(models.WebsiteChange.created_at.desc()).limit(20).all()
    open_issues = db.query(models.GrowthIssue).filter(models.GrowthIssue.status == "open").limit(20).all()

    def line(items, empty):
        return "\n".join(str(i) for i in items) if items else empty

    s = {}
    s[1] = line([f"{h['check']}: {h['status']}" for h in health], "No health checks recorded yet.")
    gsc = analysis.get("totals", {})
    s[2] = (f"Connected: {analysis.get('configured')}. "
            f"Clicks: {gsc.get('clicks') if gsc.get('clicks') is not None else 'unavailable'}. "
            f"Impressions: {gsc.get('impressions') if gsc.get('impressions') is not None else 'unavailable'}. "
            + analysis.get("note", ""))
    s[3] = line([f"{i['keyword']}: {i['clicks']} clicks (was {i.get('previous_clicks','?')})"
                 for i in analysis.get("declining", [])], "No declining keywords with sufficient history.")
    s[4] = line([f"{i['keyword']} — position {i['position']}, {i['impressions']} impressions"
                 for i in analysis.get("positions_5_30", [])],
                "No keywords currently reported in positions 5–30. No rankings are estimated.")
    s[5] = line([f"{i['country']}: {i['enquiries']} enquiries" for i in analysis.get("country_visibility", [])],
                "No country data yet. ") + " " + analysis.get("note", "")
    no_page = db.query(models.SeoKeyword).filter(models.SeoKeyword.source == "candidate",
                                                 models.SeoKeyword.status == "no_matching_page").all()
    s[6] = line([f"{k.keyword} ({k.intent}) — no matching verified page yet" for k in no_page],
                "All candidate keywords map to a verified page or need review.")
    s[7] = ("No competitor data source is connected; no competitor claims are made. "
            "Connect a lawful public-data source to populate this section.")
    product_issues = [i for i in seo.detect_issues(db).get("issues", []) if "product" in i["kind"]]
    s[8] = line([f"{i['subject']}: {i['kind']}" for i in product_issues[:12]],
                "No verifiable product-page issues detected.")
    s[9] = (f"Published products missing SEO metadata: {audit.get('products_missing_seo', 0)}. "
            "Sitemap, robots, hreflang and schema are implemented in the existing site; "
            "no invented audit scores are shown.")
    s[10] = line([f"{e.reference} — {e.name or 'unknown'} ({e.country or 'country unknown'}) "
                  f"interest: {e.product_interest or 'n/a'}" for e in enquiries[:12]],
                 "No buyer enquiries recorded.")
    s[11] = f"{completed} agent task(s) completed and stored in the task system."
    s[12] = f"{failed} failed, {pending} pending or in-progress task(s). {approvals} approval(s) await a decision."
    s[13] = line([f"{c.kind} → {c.target}: {c.status}, verification: {c.verification or 'n/a'}"
                  for c in changes[:12]], "No approved website changes recorded yet.")
    actions = []
    for issue in open_issues:
        actions.append({"task": f"Fix {issue.kind}: {issue.subject}",
                        "reason": issue.evidence,
                        "expected_benefit": "Improved page quality/indexability (measurable; not guaranteed)",
                        "agent": issue.suggested_agent or "website", "priority": issue.severity,
                        "approval": "required" if issue.kind not in ("missing_image_alt",) else "draft only",
                        "estimate": "1 work cycle"})
    if approvals:
        actions.append({"task": "Review pending approvals", "reason": f"{approvals} change(s) await approval",
                        "expected_benefit": "Unblock verified site improvements", "agent": "helpdesk",
                        "priority": "high", "approval": "required", "estimate": "same day"})
    s[14] = DUMP(actions)
    summary = (f"Site: {overview.get('published_products', 0)} published products, {overview.get('enquiries', 0)} "
               f"enquiries. GSC connected: {analysis.get('configured')}. "
               f"{failed} failed and {pending} pending tasks; {approvals} approvals pending.")
    data = {"sections": {str(k): v for k, v in s.items()}, "analysis": analysis,
            "overview": overview, "health": health, "actions": actions}
    report = models.GrowthReport(week=week, title=f"SEO & Business Growth Report — {week}",
                                 sections_json=DUMP(data), summary=summary)
    if existing:
        db.delete(existing); db.flush()
    db.add(report); db.commit(); db.refresh(report)
    return {"ok": True, "existing": False, "report_id": report.id, "week": week, "summary": summary}


def generate_growth_pdf(db: Session, report_id: str) -> dict:
    from ..daily_report_pdf import build_growth_report_pdf
    r = db.query(models.GrowthReport).filter(models.GrowthReport.id == report_id).first()
    if not r:
        return {"ok": False, "error": "Report not found"}
    path = build_growth_report_pdf(r)
    r.pdf_filename = path.name
    db.commit()
    return {"ok": True, "filename": path.name, "path": str(path)}
