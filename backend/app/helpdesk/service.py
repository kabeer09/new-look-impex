"""Real multi-agent coordination: messaging, tasks, dependencies, reports.

Every message and task is persisted. No hardcoded conversations. All agent
work is executed through the existing orchestrator, which uses whitelisted
tools; the Help Desk only coordinates, validates and consolidates.
"""
from __future__ import annotations
import json
from datetime import datetime, timedelta, timezone
from typing import Any
from sqlalchemy.orm import Session

from .. import models
from ..agents.definitions import AGENTS, all_agents
from ..agents.orchestrator import run_task, route_intent

J = lambda v, d=None: json.loads(v) if isinstance(v, str) and v.strip() else (d if d is not None else v)
DUMP = lambda v: json.dumps(v, ensure_ascii=False, default=str)

MAX_AGENTS = 8
MAX_ROUNDS = 2           # prevents infinite agent conversations
MAX_RETRIES = 2
TIMEOUT_SECONDS = 240

# Human names used in instructions -> agent keys (handles "Export Intelligence"
# as well as "export_intelligence").
AGENT_ALIASES = {
    "export intelligence": "export_intelligence", "export manager": "export_intelligence",
    "seo": "seo", "seo manager": "seo",
    "product": "product", "product manager": "product",
    "creative studio": "creative_studio", "creative": "creative_studio",
    "marketing": "marketing", "marketing manager": "marketing",
    "website": "website", "website manager": "website",
    "sales": "sales", "sales manager": "sales",
    "analytics": "analytics", "analytics manager": "analytics",
}


def resolve_agents(text: str) -> list[str]:
    low = text.lower()
    found = []
    for alias, key in AGENT_ALIASES.items():
        if alias in low and key not in found:
            found.append(key)
    return found[:MAX_AGENTS]


def current_week() -> str:
    now = datetime.now(timezone.utc)
    y, w, _ = now.isocalendar()
    return f"{y}-W{w:02d}"


def upsert_agent_report(db: Session, agent_key: str, title: str, content: str,
                        data: dict, week: str | None = None, status: str = "submitted") -> models.AgentReport:
    """One report per agent per week; update in place instead of inserting a duplicate."""
    week = week or current_week()
    row = (db.query(models.AgentReport)
           .filter(models.AgentReport.agent_key == agent_key, models.AgentReport.week == week).first())
    if row is None:
        row = models.AgentReport(agent_key=agent_key, week=week)
        db.add(row); db.flush()
    row.title = title[:255]
    row.content = content[:8000]
    row.data_json = DUMP(data)
    row.status = status
    db.flush()
    return row


# ---------------- permissions ----------------

LEVELS = {
    "level1_automatic": [
        "market_research", "seo_analysis", "analytics_reporting", "website_monitoring",
        "internal_message", "task_creation", "report_generation", "content_draft", "lead_research",
    ],
    "level2_approval": [
        "publish_website", "update_live_product", "create_public_page", "update_banner",
        "change_product_info", "send_external_email", "launch_campaign", "change_price",
    ],
    "level3_restricted": [
        "delete_product", "delete_customer_data", "change_financial_info", "change_security",
        "change_admin_permissions", "destructive_db_operation",
    ],
}


def classify_action(action: str) -> str:
    for level, items in LEVELS.items():
        if any(k in action for k in items):
            return level
    return "level2_approval"


def allowed(action: str, autonomy: str = "approval_required") -> bool:
    level = classify_action(action)
    if level == "level3_restricted":
        return False
    if level == "level1_automatic":
        return True
    return autonomy == "full_auto"


# ---------------- conversations ----------------

def new_conversation(db: Session, email: str, title: str = "Help Desk") -> dict:
    c = models.HelpdeskConversation(title=title[:255], user_email=email)
    db.add(c); db.commit(); db.refresh(c)
    return {"id": c.id, "title": c.title}


def add_message(db: Session, conversation_id: str, role: str, content: str, actions: list | None = None):
    m = models.HelpdeskMessage(conversation_id=conversation_id, role=role,
                               content=content[:8000], actions_json=DUMP(actions or []))
    db.add(m); db.flush()
    return m


# ---------------- internal agent messaging ----------------

def send_message(db: Session, from_agent: str, to_agent: str, subject: str, body: str,
                 kind: str = "info", references: list | None = None,
                 conversation_id: str | None = None, task_id: str | None = None) -> dict:
    m = models.AgentMessage(from_agent=from_agent, to_agent=to_agent,
                            subject=subject[:255], body=body[:6000], kind=kind,
                            references_json=DUMP(references or []),
                            conversation_id=conversation_id, task_id=task_id)
    db.add(m); db.flush()
    return {"id": m.id, "from": from_agent, "to": to_agent, "kind": kind, "subject": subject}


# ---------------- tasks and dependencies ----------------

def create_task(db: Session, title: str, agent: str, requesting: str = "helpdesk",
                description: str = "", priority: str = "normal", depends_on: list | None = None,
                approval_required: bool = False, conversation_id: str | None = None) -> dict:
    # duplicate prevention: same title+agent in CREATED/ASSIGNED/IN_PROGRESS
    existing = (db.query(models.AgentTask)
                .filter(models.AgentTask.title == title[:255],
                        models.AgentTask.assigned_agent == agent,
                        models.AgentTask.status.in_(["CREATED", "ASSIGNED", "IN_PROGRESS", "WAITING_FOR_AGENT"]))
                .first())
    if existing:
        return {"id": existing.id, "duplicate": True, "status": existing.status}
    t = models.AgentTask(title=title[:255], description=description[:4000], assigned_agent=agent,
                         requesting_agent=requesting, priority=priority, status="CREATED",
                         approval_required=approval_required, conversation_id=conversation_id)
    db.add(t); db.flush()
    for dep in (depends_on or []):
        if db.query(models.AgentTask).filter(models.AgentTask.id == dep).first():
            db.add(models.AgentTaskDependency(task_id=t.id, depends_on=dep))
    db.commit()
    return {"id": t.id, "duplicate": False, "status": "CREATED"}


def deps_done(db: Session, task_id: str) -> bool:
    deps = db.query(models.AgentTaskDependency).filter(models.AgentTaskDependency.task_id == task_id).all()
    for d in deps:
        parent = db.query(models.AgentTask).filter(models.AgentTask.id == d.depends_on).first()
        if not parent or parent.status not in ("COMPLETED",):
            return False
    return True


def run_task_now(db: Session, task_id: str, email: str, autonomy: str = "approval_required") -> dict:
    t = db.query(models.AgentTask).filter(models.AgentTask.id == task_id).first()
    if not t:
        return {"ok": False, "error": "Task not found"}

    def _timed_out() -> bool:
        # A watchdog in worker.py may have marked this task FAILED while an LLM
        # call was hanging; never let the late-running thread flip it back.
        cur = db.query(models.AgentTask).filter(models.AgentTask.id == task_id).first()
        return bool(cur and cur.status == "FAILED" and str(cur.error or "").startswith("Timeout after"))

    if _timed_out():
        return {"ok": False, "status": "FAILED", "error": "Task already timed out", "ignored": True}
    # Enforce the documented permission layer (it used to be decorative).
    action = t.description or t.title
    level = classify_action(action)
    if level == "level3_restricted" or (level == "level2_approval"
                                        and t.approval_required and not allowed(action, autonomy)):
        reason = f"Blocked by permission layer ({level}): {action[:120]}"
        t.status = "FAILED"; t.error = reason[:1000]; db.commit()
        send_message(db, "helpdesk", t.assigned_agent, f"Blocked: {t.title}",
                     reason, kind="blocker", task_id=task_id)
        return {"ok": False, "status": "BLOCKED", "error": reason}

    if not deps_done(db, task_id):
        t.status = "WAITING_FOR_AGENT"
        db.commit()
        send_message(db, "helpdesk", t.assigned_agent, "Task blocked by dependency",
                     f"Task {t.title} waits for dependencies.", kind="blocker", task_id=task_id)
        return {"ok": False, "status": "WAITING_FOR_AGENT"}
    if t.status not in ("CREATED", "ASSIGNED") and t.retries >= MAX_RETRIES:
        return {"ok": False, "error": "Retry limit reached"}
    t.status = "IN_PROGRESS"; db.commit()
    try:
        result = run_task(db, t.description or t.title, email, None, [t.assigned_agent], False)
        t.output_json = DUMP(result)
        if _timed_out():
            db.commit()
            return {"ok": False, "status": "FAILED", "error": "Task already timed out", "ignored": True}
        sources = [a.get("tool") for r in result.get("agents", []) for a in r.get("actions", [])]
        t.sources_json = DUMP(sources)
        if result.get("error") or any(
            a.get("status") == "failed" for r in result.get("agents", []) for a in r.get("actions", [])
        ):
            t.status = "FAILED"
            t.error = str(result.get("error") or "One or more agent actions failed")[:1000]
            t.retries += 1
            db.commit()
            send_message(db, t.assigned_agent, "helpdesk", f"Failed: {t.title}",
                         t.error, kind="blocker", task_id=task_id)
            return {"ok": False, "status": "FAILED", "error": t.error}
        t.status = "COMPLETED"
        db.commit()
        send_message(db, t.assigned_agent, "helpdesk", f"Completed: {t.title}",
                     str(result.get("reply") or "")[:4000], kind="result", task_id=task_id,
                     references=sources)
        # store the agent's report for the week
        upsert_agent_report(db, t.assigned_agent, t.title,
                            str(result.get("reply") or ""), result)
        db.commit()
        return {"ok": True, "status": "COMPLETED", "result": result}
    except Exception as e:
        if _timed_out():
            return {"ok": False, "status": "FAILED", "error": "Task already timed out", "ignored": True}
        t.status = "FAILED"; t.error = str(e)[:1000]; t.retries += 1; db.commit()
        send_message(db, t.assigned_agent, "helpdesk", f"Failed: {t.title}",
                     str(e)[:1000], kind="blocker", task_id=task_id)
        return {"ok": False, "status": "FAILED", "error": str(e)[:300]}


# ---------------- collaboration ----------------

def collaborate(db: Session, topic: str, agent_keys: list[str], email: str,
                conversation_id: str | None = None) -> dict:
    """Sequential real agent runs with message relay and shared context."""
    keys = [k for k in agent_keys if k in AGENTS][:MAX_AGENTS]
    if not keys:
        return {"ok": False, "error": "No valid agents"}
    collab = models.AgentCollaboration(topic=topic[:255], agents_json=DUMP(keys), status="running")
    db.add(collab); db.flush()
    outputs = []
    for round_no in range(MAX_ROUNDS):
        for key in keys:
            prior = "\n\n".join(f"{o['agent']}: {str(o['reply'])[:900]}" for o in outputs[-4:])
            msg = f"{topic}\n\nOTHER AGENTS' FINDINGS (shared context):\n{prior}" if prior else topic
            result = run_task(db, msg, email, None, [key], False)
            reply = str(result.get("reply") or "")
            outputs.append({"agent": key, "round": round_no + 1, "reply": reply,
                            "actions": result.get("agents", [{}])[0].get("actions", []) if result.get("agents") else []})
            send_message(db, key, "helpdesk", f"Finding: {topic[:80]}", reply[:4000],
                         kind="result", conversation_id=conversation_id,
                         references=[a.get("tool") for o in outputs[-1:] for a in o.get("actions", [])])
            for other in keys:
                if other != key:
                    send_message(db, key, other, f"Shared finding for {topic[:60]}", reply[:2500],
                                 kind="info", conversation_id=conversation_id)
    collab.status = "completed"; collab.result_json = DUMP(outputs); db.commit()
    return {"ok": True, "collaboration_id": collab.id, "rounds": MAX_ROUNDS,
            "outputs": outputs, "messages": len(outputs) * len(keys)}


# ---------------- monitoring ----------------

def run_monitoring(db: Session, email: str = "system") -> dict:
    from ..agents.tools import get_website_overview, get_analytics, seo_audit
    checks = []
    try:
        o = get_website_overview(db); checks.append(("overview", o, "ok" if o["products"] else "warning"))
    except Exception as e:
        checks.append(("overview", {"error": str(e)[:200]}, "failed"))
    try:
        a = get_analytics(db); checks.append(("analytics", a, "ok"))
    except Exception as e:
        checks.append(("analytics", {"error": str(e)[:200]}, "failed"))
    try:
        s = seo_audit(db); checks.append(("seo_metadata", s, "warning" if s.get("products_missing_seo") else "ok"))
    except Exception as e:
        checks.append(("seo_metadata", {"error": str(e)[:200]}, "failed"))
    day = datetime.utcnow().strftime("%Y-%m-%d")
    for name, data, status in checks:
        db.add(models.WebsiteMonitoring(day=day, check=name, result_json=DUMP(data), status=status))
    db.commit()
    return {"ok": True, "day": day, "checks": [{"check": n, "status": s} for n, _, s in checks]}


# ---------------- weekly report ----------------

REPORT_SECTIONS = [
    ("A", "Executive Summary"), ("B", "Export Intelligence"), ("C", "SEO Performance"),
    ("D", "Product Performance"), ("E", "Creative Studio"), ("F", "Marketing"),
    ("G", "Website Health"), ("H", "Sales"), ("I", "Analytics"), ("J", "Next Week's Action Plan"),
]


def generate_weekly_report(db: Session, week: str | None = None, force: bool = False) -> dict:
    from ..agents.tools import get_analytics, get_website_overview
    week = week or current_week()
    existing = db.query(models.WeeklyReport).filter(models.WeeklyReport.week == week).first()
    if existing and not force:
        return {"ok": True, "existing": True, "report_id": existing.id, "week": week}
    o = get_website_overview(db)
    a = get_analytics(db)
    pending = db.query(models.AiApproval).filter(models.AiApproval.status == "pending").count()
    failed = db.query(models.AgentTask).filter(models.AgentTask.status == "FAILED").count()
    reports = db.query(models.AgentReport).filter(models.AgentReport.week == week).all()
    by_agent = {r.agent_key: r for r in reports}
    sections = {}
    sections["A"] = (f"Business snapshot: {o['published_products']} published products, "
                     f"{o['enquiries']} enquiries, {o['rfqs']} RFQs. "
                     f"{pending} approvals and {failed} failed tasks require attention.")
    sections["B"] = by_agent.get("export_intelligence").content[:2500] if by_agent.get("export_intelligence") else "No export report submitted this week."
    sections["C"] = (f"GSC (real data): {a['clicks']} clicks, {a['impressions']} impressions over "
                     f"{a['period_days']} days. " + (by_agent["seo"].content[:1800] if "seo" in by_agent else "No SEO agent report."))
    sections["D"] = (by_agent["product"].content[:1800] if "product" in by_agent else "No Product Manager report.")
    sections["E"] = (by_agent["creative_studio"].content[:1800] if "creative_studio" in by_agent else "No Creative Studio report.")
    sections["F"] = (by_agent["marketing"].content[:1800] if "marketing" in by_agent else "No Marketing report.")
    sections["G"] = (by_agent["website"].content[:1800] if "website" in by_agent else "No Website Manager report.")
    sections["H"] = (by_agent["sales"].content[:1800] if "sales" in by_agent else "No Sales report.")
    sections["I"] = (by_agent["analytics"].content[:1800] if "analytics" in by_agent
                     else f"Analytics snapshot: {a['events']} events, {len(a['enquiries_by_country'])} countries with enquiries.")
    actions = []
    if pending:
        actions.append({"task": "Review pending approvals", "reason": f"{pending} changes await approval",
                        "agent": "helpdesk", "priority": "high", "approval": True})
    if failed:
        actions.append({"task": "Retry failed agent tasks", "reason": f"{failed} tasks failed",
                        "agent": "helpdesk", "priority": "high", "approval": False})
    sections["J"] = DUMP(actions)
    body = "\n\n".join(f"{code}. {title}\n{text}" for (code, title), text in zip(REPORT_SECTIONS, [sections[c] for c, _ in REPORT_SECTIONS]))
    rep = models.WeeklyReport(week=week, title=f"Weekly Business Report — {week}",
                              sections_json=DUMP({"sections": sections, "data": {"site": o, "analytics": a},
                                                  "agent_reports": list(by_agent.keys())}),
                              summary=sections["A"][:2000], status="generated")
    if existing:
        db.delete(existing); db.flush()
    db.add(rep); db.commit(); db.refresh(rep)
    return {"ok": True, "existing": False, "report_id": rep.id, "week": week, "summary": sections["A"]}


def generate_report_pdf(db: Session, report_id: str) -> dict:
    from ..daily_report_pdf import build_weekly_report_pdf
    rep = db.query(models.WeeklyReport).filter(models.WeeklyReport.id == report_id).first()
    if not rep:
        return {"ok": False, "error": "Report not found"}
    path = build_weekly_report_pdf(rep)
    rep.pdf_filename = path.name
    db.commit()
    return {"ok": True, "filename": path.name, "path": str(path)}


# ---------------- help desk chat (coordinator) ----------------

def helpdesk_chat(db: Session, message: str, email: str, conversation_id: str | None = None,
                  autonomy: str = "approval_required") -> dict:
    text = (message or "").strip()
    if not text:
        return {"ok": False, "error": "message required"}
    conv_id = conversation_id
    if not conv_id:
        conv_id = new_conversation(db, email, title=text[:80])["id"]
    add_message(db, conv_id, "user", text)

    low = text.lower()
    actions = []
    # explicit weekly report
    if any(w in low for w in ("weekly report", "full report", "business report", "complete business report")):
        r = generate_weekly_report(db)
        actions.append({"type": "weekly_report", **{k: r.get(k) for k in ("report_id", "week", "summary") if k in r}})
        reply = f"Weekly report generated for {r.get('week')}: {r.get('summary','')[:400]}"
    # ask all agents
    elif any(w in low for w in ("all agents", "all eight", "analyse my business", "analyze my business")):
        keys = [a["key"] for a in all_agents()]
        results = []
        for key in keys:
            res = run_task(db, f"Analyse New Look Impex business from your role and report real findings. {text}", email, None, [key], False)
            results.append({"agent": key, "reply": str(res.get("reply") or "")[:1200]})
            upsert_agent_report(db, key, "All-agents analysis", str(res.get("reply") or ""), res)
        db.commit()
        actions.append({"type": "all_agents", "results": results})
        reply = "All eight agents completed their analysis and submitted reports to the Help Desk."
    # explicit collaboration
    elif any(w in low for w in ("collaborate", "together", "and seo", "& seo", "assist")):
        keys = resolve_agents(text)
        if len(keys) < 2:
            keys = route_intent(text)[:3] or ["seo", "export_intelligence"]
        c = collaborate(db, text, keys, email, conv_id)
        actions.append({"type": "collaboration", "id": c.get("collaboration_id"), "rounds": c.get("rounds")})
        reply = f"Coordinated {len(keys)} agents through {c.get('rounds', 0)} rounds with {c.get('messages',0)} persisted messages. Findings consolidated in the collaboration record."
    # single-agent instruction
    else:
        keys = resolve_agents(text) or route_intent(text) or ["analytics"]
        key = keys[0]
        res = run_task(db, text, email, None, [key], False)
        t = create_task(db, title=text[:255], agent=key, requesting="helpdesk",
                        description=text, conversation_id=conv_id,
                        approval_required=classify_action(text) != "level1_automatic")
        actions.append({"type": "task", "task_id": t.get("id"), "agent": key, "reply": str(res.get("reply") or "")[:800]})
        reply = f"**{AGENTS[key]['name']}:** {res.get('reply') or 'No reply produced.'}"
    add_message(db, conv_id, "assistant", reply[:8000], actions)
    db.commit()
    return {"ok": True, "conversation_id": conv_id, "reply": reply, "actions": actions}
