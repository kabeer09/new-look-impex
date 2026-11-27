"""Persistent 24/7 agent worker.

Runs from the backend process at startup, or as a standalone process with
`python -m app.worker`. Tasks are claimed with an exclusive, expiring database
lease so two workers never execute the same task. Unfinished tasks are
recovered after a restart. Global emergency stop and per-agent pause are
honoured before every claim.
"""
from __future__ import annotations
import json
import logging
import os
import socket
import threading
import time
import uuid
from datetime import datetime, timedelta, timezone

from . import models
from .database import SessionLocal
from .helpdesk import service as S

log = logging.getLogger("growth.worker")
WORKER_ID = os.environ.get("WORKER_ID") or f"{socket.gethostname()}-{uuid.uuid4().hex[:8]}"
POLL_SECONDS = max(2, int(os.environ.get("WORKER_POLL_SECONDS", "5")))
LEASE_SECONDS = max(60, int(os.environ.get("WORKER_LEASE_SECONDS", "900")))
TASK_TIMEOUT = max(60, int(os.environ.get("WORKER_TASK_TIMEOUT", "300")))

_STOP = threading.Event()
_THREAD: threading.Thread | None = None
DUMP = lambda v: json.dumps(v, ensure_ascii=False, default=str)


def _now():
    return datetime.utcnow().replace(tzinfo=None)


def get_state(key: str, default: str = "") -> str:
    db = SessionLocal()
    try:
        row = db.query(models.WorkerState).filter(models.WorkerState.key == key).first()
        return row.value if row else default
    finally:
        db.close()


def set_state(key: str, value: str):
    db = SessionLocal()
    try:
        row = db.query(models.WorkerState).filter(models.WorkerState.key == key).first()
        if row is None:
            row = models.WorkerState(key=key); db.add(row)
        row.value = str(value)[:2000]
        db.commit()
    finally:
        db.close()


def emergency_stop() -> bool:
    return get_state("emergency_stop", "false").lower() in ("true", "1", "yes")


def set_emergency_stop(value: bool) -> dict:
    set_state("emergency_stop", "true" if value else "false")
    return {"ok": True, "emergency_stop": bool(value)}


def paused_agents() -> set[str]:
    db = SessionLocal()
    try:
        return {r.agent_key for r in db.query(models.AgentControl).filter(models.AgentControl.paused.is_(True)).all()}
    finally:
        db.close()


def set_agent_paused(agent_key: str, paused: bool) -> dict:
    db = SessionLocal()
    try:
        row = db.query(models.AgentControl).filter(models.AgentControl.agent_key == agent_key).first()
        if row is None:
            row = models.AgentControl(agent_key=agent_key); db.add(row)
        row.paused = bool(paused)
        row.status = "paused" if paused else "idle"
        db.commit()
        return {"ok": True, "agent": agent_key, "paused": bool(paused)}
    finally:
        db.close()


def heartbeat():
    set_state("worker_heartbeat", _now().isoformat())
    set_state("worker_id", WORKER_ID)


def worker_status() -> dict:
    db = SessionLocal()
    try:
        controls = db.query(models.AgentControl).all()
        queued = db.query(models.AgentTask).filter(models.AgentTask.status.in_(["CREATED", "ASSIGNED"])).count()
        running = db.query(models.AgentTask).filter(models.AgentTask.status == "IN_PROGRESS").count()
        hb = db.query(models.WorkerState).filter(models.WorkerState.key == "worker_heartbeat").first()
        age = None
        if hb and hb.value:
            try:
                age = int((datetime.utcnow() - datetime.fromisoformat(hb.value)).total_seconds())
            except Exception:
                age = None
        return {
            "worker_id": WORKER_ID,
            "running": _THREAD is not None and _THREAD.is_alive(),
            "heartbeat": hb.value if hb else None,
            "heartbeat_age_seconds": age,
            "emergency_stop": emergency_stop(),
            "queued_tasks": queued,
            "running_tasks": running,
            "agents": [{"agent": c.agent_key, "paused": bool(c.paused), "status": c.status,
                        "last_heartbeat": c.last_heartbeat.isoformat() if c.last_heartbeat else None,
                        "last_error": c.last_error,
                        "completed": c.tasks_completed, "failed": c.tasks_failed} for c in controls],
        }
    finally:
        db.close()


def recover_stale(db: Session) -> int:
    """Release expired leases and requeue tasks left running by a dead worker."""
    cutoff = _now() - timedelta(seconds=LEASE_SECONDS)
    leases = (db.query(models.AgentTaskLease)
              .filter((models.AgentTaskLease.expires_at.is_(None)) | (models.AgentTaskLease.expires_at < cutoff)).all())
    released = 0
    for lease in leases:
        task = db.query(models.AgentTask).filter(models.AgentTask.id == lease.task_id).first()
        if task and task.status == "IN_PROGRESS":
            # Conditional UPDATE: another worker may have finished/requeued it
            # between our SELECT and this write.
            changed = (db.query(models.AgentTask)
                       .filter(models.AgentTask.id == task.id,
                               models.AgentTask.status == "IN_PROGRESS")
                       .update({models.AgentTask.status: "CREATED",
                                models.AgentTask.error: "Recovered after worker restart / lease expiry",
                                models.AgentTask.updated_at: _now()},
                               synchronize_session=False))
            released += 1 if changed else 0
        db.delete(lease)
    # tasks stuck IN_PROGRESS with no lease at all (e.g. old process crashed)
    stale = (db.query(models.AgentTask)
             .filter(models.AgentTask.status == "IN_PROGRESS",
                     models.AgentTask.updated_at < cutoff).all())
    for t in stale:
        has_lease = db.query(models.AgentTaskLease).filter(models.AgentTaskLease.task_id == t.id).first()
        if not has_lease:
            changed = (db.query(models.AgentTask)
                       .filter(models.AgentTask.id == t.id,
                               models.AgentTask.status == "IN_PROGRESS")
                       .update({models.AgentTask.status: "CREATED",
                                models.AgentTask.error: "Recovered after worker restart",
                                models.AgentTask.updated_at: _now()},
                               synchronize_session=False))
            released += 1 if changed else 0
    db.commit()
    return released


def _claim_atomically(db: Session, task_id: str, now) -> bool:
    """Flip CREATED/ASSIGNED -> IN_PROGRESS only if we win the row-level race.

    A plain read-then-write lets two workers (the in-process worker and the
    standalone Render worker) execute the same task. The conditional UPDATE is
    atomic on both SQLite (writer serialization) and Postgres (row lock).
    """
    changed = (db.query(models.AgentTask)
               .filter(models.AgentTask.id == task_id,
                       models.AgentTask.status.in_(["CREATED", "ASSIGNED"]))
               .update({models.AgentTask.status: "IN_PROGRESS",
                        models.AgentTask.updated_at: now},
                       synchronize_session=False))
    return changed == 1


def claim_task(db: Session, paused: set[str]) -> models.AgentTask | None:
    candidates = (db.query(models.AgentTask)
                  .filter(models.AgentTask.status.in_(["CREATED", "ASSIGNED"]))
                  .order_by(models.AgentTask.created_at.asc()).limit(100).all())
    rank = {"critical": 0, "high": 1, "normal": 2, "low": 3}
    candidates.sort(key=lambda t: (rank.get((t.priority or "normal").lower(), 2), t.created_at or _now()))
    now = _now()
    for t in candidates:
        if t.assigned_agent in paused:
            continue
        if not S.deps_done(db, t.id):
            if t.status != "WAITING_FOR_AGENT":
                t.status = "WAITING_FOR_AGENT"; db.commit()
            continue
        existing = db.query(models.AgentTaskLease).filter(models.AgentTaskLease.task_id == t.id).first()
        if existing and (existing.expires_at is None or existing.expires_at > now):
            continue
        if not _claim_atomically(db, t.id, now):
            continue  # another worker claimed it first
        if existing:
            db.delete(existing); db.flush()
        db.add(models.AgentTaskLease(task_id=t.id, worker_id=WORKER_ID,
                                     leased_at=now, expires_at=now + timedelta(seconds=LEASE_SECONDS)))
        db.commit()
        return t
    return None


def _touch_agent(db: Session, key: str, ok: bool, error: str = ""):
    row = db.query(models.AgentControl).filter(models.AgentControl.agent_key == key).first()
    if row is None:
        row = models.AgentControl(agent_key=key); db.add(row)
    row.status = "error" if not ok else "idle"
    row.last_heartbeat = _now()
    row.last_error = error[:1000]
    if ok:
        row.tasks_completed = (row.tasks_completed or 0) + 1
    else:
        row.tasks_failed = (row.tasks_failed or 0) + 1
    db.commit()


def execute_once() -> bool:
    """Claim and execute at most one task. Returns True if a task was processed.

    Execution runs in a bounded thread: a hanging LLM call can no longer block
    the worker forever. On timeout the task is marked FAILED and the lease is
    deliberately kept, so no other worker can start a duplicate while the
    original thread may still be writing. Lease expiry recovers it later.
    """
    if emergency_stop():
        return False
    db = SessionLocal()
    try:
        task = claim_task(db, paused_agents())
        if task is None:
            return False
        key, tid = task.assigned_agent, task.id
    finally:
        db.close()
    started = time.time()
    holder: dict = {}

    def _target():
        exec_db = SessionLocal()
        try:
            holder["result"] = S.run_task_now(exec_db, tid, "worker@local", "approval_required")
        except Exception as e:
            holder["result"] = {"ok": False, "error": str(e)[:500]}
        finally:
            try: exec_db.close()
            except Exception: pass

    thread = threading.Thread(target=_target, daemon=True, name=f"agent-task-{tid}")
    thread.start()
    thread.join(TASK_TIMEOUT)
    timed_out = thread.is_alive()
    result = holder.get("result") or {"ok": False, "error": "Task produced no result"}
    elapsed = time.time() - started
    db = SessionLocal()
    try:
        t = db.query(models.AgentTask).filter(models.AgentTask.id == tid).first()
        if timed_out or elapsed > TASK_TIMEOUT:
            reason = f"Timeout after {int(elapsed)}s"
            _touch_agent(db, key, False, reason)
            if t and t.status == "IN_PROGRESS":
                t.status = "FAILED"; t.error = reason
            # Keep the lease: the timed-out thread may still be committing.
        else:
            ok = bool(result.get("ok"))
            _touch_agent(db, key, ok, str(result.get("error") or ""))
            lease = db.query(models.AgentTaskLease).filter(models.AgentTaskLease.task_id == tid).first()
            if lease:
                db.delete(lease)
        db.commit()
    finally:
        db.close()
    return True


def _run_loop():
    log.info("worker started (%s)", WORKER_ID)
    while not _STOP.wait(POLL_SECONDS):
        try:
            db = SessionLocal()
            try:
                recovered = recover_stale(db)
            finally:
                db.close()
            if recovered:
                log.info("recovered %d stale task(s)", recovered)
            heartbeat()
            execute_once()
            if emergency_stop():
                set_state("worker_state", f"paused at {_now().isoformat()}")
                log.info("worker paused by emergency stop")
                while emergency_stop() and not _STOP.wait(POLL_SECONDS):
                    heartbeat()
        except Exception as e:
            log.warning("worker tick failed: %s", e)
    log.info("worker stopped")


def start_worker() -> threading.Thread | None:
    global _THREAD
    if _THREAD is not None and _THREAD.is_alive():
        return _THREAD
    _STOP.clear()
    _THREAD = threading.Thread(target=_run_loop, daemon=True, name="growth-agent-worker")
    _THREAD.start()
    return _THREAD


def stop_worker():
    _STOP.set()
    return {"ok": True}


def run_worker_forever():
    logging.basicConfig(level=logging.INFO)
    start_worker()
    try:
        while True:
            time.sleep(30)
    except KeyboardInterrupt:
        stop_worker()


if __name__ == "__main__":
    run_worker_forever()
