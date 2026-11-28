"""Growth Controller — one coordinator for all growth agents.

Uses the existing shared AgentTask/AiApproval/Help Desk task system. No parallel
task store. Every task has a component ownership lock, evidence and an explicit
approval policy, so two agents cannot independently edit the same area.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy import inspect

from .. import models

OPEN = ("CREATED", "ASSIGNED", "IN_PROGRESS", "WAITING_FOR_AGENT", "WAITING_APPROVAL")
PRIORITY_RANK = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}
AGENTS = {
    "seo", "analytics", "website", "product", "creative_studio", "marketing",
    "sales", "export_intelligence", "helpdesk", "growth_controller",
}
DEFAULT_AGENT = {
    "enquiries": "sales", "forms": "sales", "email": "sales", "whatsapp": "sales",
    "sitemap": "seo", "robots": "seo", "canonical": "seo", "metadata": "seo",
    "indexing": "seo", "content": "product", "products": "product",
    "country_pages": "export_intelligence", "pagespeed": "website", "frontend": "website",
    "api": "website", "database": "website", "security": "helpdesk",
}


def schema_ready(db) -> dict:
    """Controller needs additive columns from migration 0008. Return an explicit
    state instead of a 500 if production has not been migrated yet."""
    try:
        cols = {c["name"] for c in inspect(db.bind).get_columns("agent_tasks")}
    except Exception:
        return {"ready": False, "missing": ["agent_tasks"],
                "note": "Run additive migration 0008 before using the Growth Controller."}
    missing = sorted({"component", "evidence_json"} - cols)
    return {"ready": not missing, "missing": missing,
            "note": "Run additive migration 0008 before using the Growth Controller." if missing else ""}


def _dump(value) -> str:
    return json.dumps(value, ensure_ascii=False, default=str)[:8000]


def _load(value: str | None) -> dict:
    try:
        return json.loads(value) if value and value.strip() else {}
    except (TypeError, ValueError):
        return {}


def priority_for(kind: str) -> str:
    if kind in ("outage", "enquiries_broken", "security", "data_loss"):
        return "P0"
    if kind in ("broken_page", "indexing_error", "canonical", "performance_critical"):
        return "P1"
    if kind in ("ctr_opportunity", "content", "internal_link", "conversion"):
        return "P2"
    return "P3"


def owner_for(component: str) -> str:
    return DEFAULT_AGENT.get(component, "seo")


def create_task(db, title: str, component: str, kind: str, evidence: dict,
                agent: str = "", approval_required: bool = False,
                requested_by: str = "growth_controller") -> dict:
    """Create a deduped task with component ownership conflict detection."""
    component = (component or "general").strip().lower()
    kind = (kind or "other").strip().lower()
    priority = priority_for(kind)
    agent = agent or owner_for(component)
    if agent not in AGENTS:
        agent = "helpdesk"

    duplicate = (db.query(models.AgentTask)
                 .filter(models.AgentTask.title == title[:255],
                         models.AgentTask.component == component,
                         models.AgentTask.status.in_(OPEN)).first())
    if duplicate:
        return {"ok": True, "duplicate": True, "id": duplicate.id, "status": duplicate.status}

    conflict = (db.query(models.AgentTask)
                .filter(models.AgentTask.component == component,
                        models.AgentTask.status.in_(OPEN),
                        models.AgentTask.assigned_agent != agent).first())
    if conflict:
        return {"ok": False, "conflict": True, "conflicting_task_id": conflict.id,
                "message": f"Component {component} is owned by {conflict.assigned_agent}"}

    task = models.AgentTask(
        title=title[:255], description=f"{kind}: {title}"[:4000],
        assigned_agent=agent, requesting_agent=requested_by,
        priority=priority, status="CREATED", component=component,
        evidence_json=_dump(evidence),
        approval_required=bool(approval_required or priority == "P0"))
    db.add(task)
    db.commit()
    return {"ok": True, "duplicate": False, "id": task.id,
            "priority": priority, "agent": agent, "approval_required": task.approval_required}


def approve_task(db, task_id: str, user: str) -> dict:
    task = db.query(models.AgentTask).filter(models.AgentTask.id == task_id).first()
    if not task:
        return {"ok": False, "error": "Task not found"}
    if not task.approval_required:
        return {"ok": False, "error": "Task does not require approval"}
    db.add(models.AiApproval(task_id=task.id, agent_key=task.assigned_agent,
                             kind="growth_controller",
                             title=f"Approve: {task.title}"[:255],
                             summary=f"Priority {task.priority}, component {task.component}",
                             proposed_json=_dump({"task_id": task.id, "component": task.component}),
                             previous_json="{}", requested_by=user))
    task.status = "WAITING_APPROVAL"
    db.commit()
    return {"ok": True, "status": "WAITING_APPROVAL"}


def report_result(db, task_id: str, evidence: dict, ok: bool, user: str = "agent") -> dict:
    task = db.query(models.AgentTask).filter(models.AgentTask.id == task_id).first()
    if not task:
        return {"ok": False, "error": "Task not found"}
    prior = _load(task.evidence_json)
    prior["last_result"] = {"ok": ok, "evidence": evidence, "by": user,
                            "at": datetime.now(timezone.utc).isoformat()}
    task.evidence_json = _dump(prior)
    task.status = "COMPLETED" if ok else "FAILED"
    if not ok:
        task.error = str(evidence.get("error", "Agent reported failure"))[:1000]
    task.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    return {"ok": True, "status": task.status}


def reopen_on_regression(db, component: str, evidence: dict) -> dict:
    last = (db.query(models.AgentTask)
            .filter(models.AgentTask.component == component,
                    models.AgentTask.status == "COMPLETED")
            .order_by(models.AgentTask.updated_at.desc()).first())
    if not last:
        return {"reopened": False}
    data = _load(last.evidence_json)
    data.setdefault("regressions", []).append(evidence)
    last.evidence_json = _dump(data)
    last.status = "CREATED"
    last.retries = (last.retries or 0) + 1
    db.commit()
    return {"reopened": True, "task_id": last.id}


def next_tasks(db, limit: int = 10) -> list[dict]:
    rows = (db.query(models.AgentTask)
            .filter(models.AgentTask.status.in_(("CREATED", "ASSIGNED"))).all())
    rows.sort(key=lambda t: (PRIORITY_RANK.get(t.priority, 3), t.created_at or datetime.min))
    return [{"id": t.id, "title": t.title, "component": t.component,
             "priority": t.priority, "agent": t.assigned_agent,
             "approval_required": bool(t.approval_required)} for t in rows[:limit]]


def status(db) -> dict:
    rows = db.query(models.AgentTask).all()
    by_priority: dict[str, int] = {}
    by_status: dict[str, int] = {}
    by_agent: dict[str, int] = {}
    conflicts = []
    seen: dict[str, str] = {}
    for t in rows:
        by_priority[t.priority] = by_priority.get(t.priority, 0) + 1
        by_status[t.status] = by_status.get(t.status, 0) + 1
        by_agent[t.assigned_agent] = by_agent.get(t.assigned_agent, 0) + 1
        if t.status in OPEN and t.component:
            owner = seen.get(t.component)
            if owner and owner != t.assigned_agent:
                conflicts.append({"component": t.component, "agents": [owner, t.assigned_agent]})
            seen[t.component] = t.assigned_agent
    return {"total_tasks": len(rows), "by_priority": by_priority, "by_status": by_status,
            "by_agent": by_agent, "conflicts": conflicts,
            "next": next_tasks(db, 10),
            "note": "One shared AgentTask queue; component locks prevent conflicting edits."}
