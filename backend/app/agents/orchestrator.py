"""Bounded multi-agent orchestrator.

A request is routed to 1–4 agents, each agent performs at most one LLM pass
with a strict JSON action plan, and tool calls are capped. Every step is
logged. Mutations become approvals by default — nothing publishes silently.
"""
from __future__ import annotations
import json
from typing import Any
from sqlalchemy.orm import Session

from .. import models
from ..llm import generate
from ..config import settings
from .definitions import AGENTS, ROUTE_KEYWORDS, SHARED_CONTEXT, get_agent
from .tools import TOOLS

MAX_AGENTS = 4
MAX_ACTIONS_PER_AGENT = 4

# Deterministic fallback: when the provider returns an empty/unreadable plan,
# run one safe, read-only tool for that agent so the user always gets real data.
FALLBACK_TOOL = {
    "export_intelligence": "get_website_overview",
    "seo": "seo_audit",
    "product": "search_products",
    "creative_studio": "list_media",
    "marketing": "get_analytics",
    "website": "get_website_overview",
    "sales": "list_enquiries",
    "analytics": "get_analytics",
}
FALLBACK_REPLY = "The AI provider returned no plan, so I ran a safe read-only check instead. No changes were made."


def _j(v, default=None):
    try:
        return json.loads(v) if isinstance(v, str) and v.strip() else (default if default is not None else v)
    except (TypeError, ValueError):
        return default if default is not None else {}


def route_intent(message: str) -> list[str]:
    """Select agents by explicit keyword matches; empty list = general assistant."""
    text = (message or "").lower()
    scored: dict[str, int] = {}
    for key, needles in ROUTE_KEYWORDS.items():
        n = sum(1 for needle in needles if needle in text)
        if n:
            scored[key] = n
    ordered = sorted(scored.items(), key=lambda x: -x[1])
    if not ordered:
        return ["analytics"] if any(w in text for w in ("show", "list", "status", "what", "overview")) else []
    return [k for k, _ in ordered[:MAX_AGENTS]]


def _plan(agent: dict, message: str, context: dict) -> dict:
    if not settings.LLM_API_KEY or not settings.LLM_API_BASE or not settings.LLM_MODEL:
        return {"reply": "AI provider is not configured on this deployment.", "actions": []}
    system = (SHARED_CONTEXT + "\n\nYOU ARE: " + agent["name"] + " — " + agent["role"] + "\n"
              + agent["instructions"] + "\nALLOWED TOOLS: " + ", ".join(agent["tools"])
              + "\nRESTRICTIONS: " + ", ".join(agent["restrictions"])
              + "\nReturn ONLY JSON: {\"reply\":\"...\",\"actions\":[{\"tool\":\"name\",\"params\":{...}}]}. "
                "Prefer preview=true for mutations. Use at most " + str(MAX_ACTIONS_PER_AGENT) + " actions.")
    res = generate(f"WEBSITE CONTEXT:\n{json.dumps(context, ensure_ascii=False)[:1500]}\n\nREQUEST:\n{message}",
                   system=system, max_tokens=1200)
    text = (res.get("text") or "").strip()
    text = text.replace("```json", "").replace("```", "")
    start, end = text.find("{"), text.rfind("}")
    fallback = {"reply": FALLBACK_REPLY,
                "actions": [{"tool": FALLBACK_TOOL.get(agent["key"], "get_website_overview"), "params": {}}]}
    if start < 0 or end <= start:
        return {"reply": text[:800] or fallback["reply"],
                "actions": [] if text.strip() else fallback["actions"]}
    try:
        parsed = json.loads(text[start:end + 1])
    except (TypeError, ValueError):
        return fallback
    if not isinstance(parsed, dict):
        return fallback
    parsed["actions"] = [a for a in (parsed.get("actions") or []) if isinstance(a, dict)][:MAX_ACTIONS_PER_AGENT]
    if not parsed["actions"]:
        parsed["actions"] = fallback["actions"]
        parsed["reply"] = str(parsed.get("reply") or fallback["reply"])
    return parsed


def _log(db, task_id, agent_key, event, status, detail, user_email=""):
    db.add(models.AiExecutionLog(task_id=task_id, agent_key=agent_key, event=event,
                                 status=status, detail_json=json.dumps(detail, ensure_ascii=False, default=str),
                                 user_email=user_email))


def run_task(db: Session, message: str, user_email: str = "", session_id: int | None = None,
             agent_keys: list[str] | None = None, auto_publish: bool = False) -> dict:
    selected = [k for k in (agent_keys or route_intent(message)) if k in AGENTS][:MAX_AGENTS]
    task = models.AiTask(session_id=session_id, user_email=user_email, request=message[:2000],
                         status="running", agents_json=json.dumps(selected), result_json="{}")
    db.add(task); db.flush()
    context = TOOLS["get_website_overview"](db)
    replies: list[dict] = []
    approvals: list[str] = []

    try:
        for key in selected:
            agent = AGENTS[key]
            step = models.AiTaskStep(task_id=task.id, agent_key=key, action="plan", status="running")
            db.add(step); db.flush()
            try:
                plan = _plan(agent, message, context)
                actions = []
                for act in plan.get("actions", []):
                    tool = str(act.get("tool") or "")
                    if tool not in agent["tools"] or tool not in TOOLS:
                        actions.append({"tool": tool, "status": "blocked",
                                        "error": "Tool not allowed for this agent"})
                        continue
                    params = dict(act.get("params") or {})
                    # Server-side enforcement: identity and preview mode are never
                    # model-controlled. `setdefault` here would let a crafted action
                    # (or a prompt-injected request) set preview=false and publish
                    # live content with no approval row. Agent restrictions are
                    # enforced here too, not just listed in definitions.py.
                    may_publish = bool(auto_publish) and not any(
                        r in ("preview_required", "approval_required", "read_only")
                        for r in (agent.get("restrictions") or []))
                    params["task_id"] = task.id
                    params["agent_key"] = key
                    params["user_email"] = user_email
                    params["preview"] = not may_publish
                    try:
                        result = TOOLS[tool](db, **params)
                        if result.get("approval_id"):
                            approvals.append(result["approval_id"])
                        actions.append({"tool": tool, "status": "ok", **result})
                    except Exception as e:
                        actions.append({"tool": tool, "status": "failed", "error": str(e)[:300]})
                step.status = "done"
                step.output_json = json.dumps({"reply": plan.get("reply", ""), "actions": actions},
                                              ensure_ascii=False, default=str)
                replies.append({"agent": key, "name": agent["name"],
                                "reply": plan.get("reply", ""), "actions": actions})
                _log(db, task.id, key, "agent_step", "ok", {"actions": len(actions)}, user_email)
            except Exception as e:
                step.status = "failed"; step.error = str(e)[:500]
                _log(db, task.id, key, "agent_step", "failed", {"error": str(e)[:300]}, user_email)

        result = {"reply": "\n\n".join(f"**{r['name']}:** {r['reply']}" for r in replies if r["reply"])
                           or "No agent produced a reply.",
                  "agents": replies, "approvals": approvals, "task_id": task.id}
        task.status = "waiting_approval" if approvals else "done"
        task.result_json = json.dumps(result, ensure_ascii=False, default=str)
        db.commit()
        return result
    except Exception as e:
        task.status = "failed"; task.error = str(e)[:1000]
        db.commit()
        return {"reply": "Task failed; no changes were applied.", "agents": [], "approvals": [],
                "task_id": task.id, "error": str(e)[:300]}
