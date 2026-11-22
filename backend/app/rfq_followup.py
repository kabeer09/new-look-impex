"""Automatic abandoned-RFQ follow-up — one gentle email, then stop.

A background task (started from the FastAPI lifespan, alongside the
campaign mailer) checks every 6 hours for quotation drafts the buyer
started but never sent, and sends each of them ONE "pick up where you
left off" email — the same copy as the manual admin remind button
(rfq.draft_followup_email), so buyers never get two different messages.

Honesty & restraint contract:
  * only `open` drafts with a real email address;
  * at most one follow-up per draft ever (`reminded_at` is the marker —
    the same marker the manual button uses, so the two never double-send);
  * drafts must be idle for at least FOLLOWUP_MIN_IDLE_HOURS (the buyer
    may still be filling the form) and no older than FOLLOWUP_MAX_AGE_DAYS;
  * capped at FOLLOWUP_MAX_PER_PASS per run — no blasts;
  * when SMTP is not configured the pass sends NOTHING and says so in the
    result — we never claim an email went out;
  * drafts are never modified beyond `reminded_at` (no status changes,
    no consent re-ticking).
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from . import models
from .database import SessionLocal
from .email import email_configured, send_email
from .rfq import draft_followup_email

log = logging.getLogger("rfq_followup")

CHECK_INTERVAL_SECONDS = 6 * 3600        # every 6 hours (same cadence as campaigns)
FOLLOWUP_MIN_IDLE_HOURS = 24              # leave the buyer at least a day in peace
FOLLOWUP_MAX_AGE_DAYS = 14                # don't chase two-week-old drafts
FOLLOWUP_MAX_PER_PASS = 20                # gentle, never a blast


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def check_once() -> dict:
    """One follow-up pass. Returns an honest summary (sent/skipped counts)."""
    out: dict = {"checked_at": _now().isoformat(), "sent": 0, "skipped": 0,
                 "failed": 0, "eligible": 0}
    if not email_configured():
        out["note"] = "SMTP not configured — no follow-ups sent"
        return out
    now = _now()
    idle_cutoff = now - timedelta(hours=FOLLOWUP_MIN_IDLE_HOURS)
    oldest = now - timedelta(days=FOLLOWUP_MAX_AGE_DAYS)
    db = SessionLocal()
    try:
        from .site_control import automation_enabled
        if not automation_enabled(db, "rfq_followup"):
            out["note"] = "Disabled in Site Control — no follow-ups sent"
            return out
        rows = (db.query(models.RfqDraft)
                .filter(models.RfqDraft.status == "open",
                        models.RfqDraft.reminded_at.is_(None),
                        models.RfqDraft.updated_at <= idle_cutoff,
                        models.RfqDraft.updated_at >= oldest)
                .order_by(models.RfqDraft.updated_at.asc())
                .limit(FOLLOWUP_MAX_PER_PASS).all())
        out["eligible"] = len(rows)
        for row in rows:
            if not row.business_email or "@" not in row.business_email:
                out["skipped"] += 1
                continue
            subject, body = draft_followup_email(row)
            ok, detail = send_email(row.business_email, subject, body)
            if ok:
                row.reminded_at = now
                db.add(models.WorkflowExecution(
                    workflow="rfq_draft_followup", status="success",
                    detail=f"draft:{row.id}"))
                out["sent"] += 1
            else:
                # Not marked reminded — the next pass may retry a transient
                # failure; the per-draft cap still holds because a successful
                # send is what sets reminded_at.
                db.add(models.WorkflowExecution(
                    workflow="rfq_draft_followup", status="error",
                    detail=f"draft:{row.id} — {detail}"))
                out["failed"] += 1
            db.commit()
        if out["sent"]:
            log.info("rfq follow-up: %s sent", out["sent"])
        return out
    finally:
        db.close()


async def _loop() -> None:
    await asyncio.sleep(90)   # let the app finish booting; run after the first campaign pass
    while True:
        try:
            check_once()
        except Exception as e:   # never let the automation die
            log.warning("rfq follow-up: %s", type(e).__name__)
        await asyncio.sleep(CHECK_INTERVAL_SECONDS)


def start_followup() -> None:
    try:
        asyncio.get_running_loop().create_task(_loop())
    except RuntimeError:
        pass
