"""Automated sale-campaign email blasts — zero manual work.

A background task (started from the FastAPI lifespan) checks the live
campaign every 6 hours and sends, exactly once per campaign:

  1. ANNOUNCEMENT — when a seasonal sale starts ("Sale Starts Now").
  2. REMINDER — in the final 3 days ("Last Chance — ends 19 November").

Recipients: every distinct consented email in `enquiries` (newsletter
subscribers + B2B enquirers who ticked consent). Each blast is recorded
in the `campaign_sends` table so it never repeats, even across restarts
or deploys. The evergreen WELCOME10 is never blasted (it's already in
every subscriber's welcome email).
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from .database import SessionLocal
from . import models
from .campaigns import active_campaign
from .email import (campaign_email_html, campaign_email_text, email_configured,
                    send_campaign_batch)

log = logging.getLogger("campaign_mailer")

CHECK_INTERVAL_SECONDS = 6 * 3600   # every 6 hours
REMINDER_WINDOW_SECONDS = 3 * 86400  # final 3 days


def _recipients(db) -> list[str]:
    rows = (db.query(models.Enquiry.email)
            .filter(models.Enquiry.consent.is_(True))
            .distinct().all())
    return sorted({(r[0] or "").strip().lower() for r in rows
                   if r[0] and "@" in r[0]})


def _already_sent(db, code: str) -> bool:
    return db.query(models.CampaignSend).filter(
        models.CampaignSend.code == code).first() is not None


def _record(db, code: str, camp: dict, kind: str, recipients: int, sent_ok: int) -> None:
    db.add(models.CampaignSend(code=code, campaign=camp["name"], kind=kind,
                               recipients=recipients, sent_ok=sent_ok))
    try:
        db.commit()
    except Exception:  # race with another worker — the unique code already won
        db.rollback()


def _blast(db, code: str, camp: dict, kind: str) -> dict | None:
    if _already_sent(db, code):
        return None
    recipients = _recipients(db)
    if not recipients:
        return {"kind": kind, "skip": "no subscribers"}
    subject = (f"{camp['emoji']} {camp['name']} is ON — {camp['percent']}% OFF everything"
               if kind == "announcement" else
               f"⏳ Last chance: {camp['name']} ends {camp['ends_label']} — {camp['percent']}% OFF")
    sent_ok, failed, detail = send_campaign_batch(
        recipients, subject,
        campaign_email_html(camp, kind), campaign_email_text(camp, kind))
    _record(db, code, camp, kind, len(recipients), sent_ok)
    db.add(models.WorkflowExecution(
        workflow=f"campaign_{kind}", status="success" if sent_ok else "failed",
        detail=f"{camp['code']} -> {sent_ok}/{len(recipients)} ({detail})"[:200]))
    db.commit()
    log.info("campaign %s %s: %s/%s delivered", camp["code"], kind, sent_ok, len(recipients))
    return {"kind": kind, "code": camp["code"], "sent": sent_ok,
            "failed": failed, "recipients": len(recipients)}


def check_once() -> dict:
    """One automation pass: announce a running sale, remind before it ends."""
    out: dict = {"checked_at": datetime.now(timezone.utc).isoformat(), "sent": []}
    if not email_configured():
        out["skip"] = "SMTP not configured"
        return out
    camp = active_campaign()
    if camp["ends_label"] == "always on":
        out["skip"] = "evergreen campaign — no blasts"
        return out
    now = datetime.utcnow()
    ends = datetime.fromisoformat(camp["ends_at"])
    seconds_left = (ends - now).total_seconds()
    if seconds_left <= 0:
        out["skip"] = "window already closed"
        return out
    db = SessionLocal()
    try:
        if (r := _blast(db, f"{camp['code']}:announcement", camp, "announcement")):
            out["sent"].append(r)
        if seconds_left <= REMINDER_WINDOW_SECONDS:
            if (r := _blast(db, f"{camp['code']}:reminder", camp, "reminder")):
                out["sent"].append(r)
        return out
    finally:
        db.close()


async def _loop() -> None:
    await asyncio.sleep(25)  # let the app finish booting before the first pass
    while True:
        try:
            result = check_once()
            if result.get("sent"):
                log.info("campaign mailer: %s", result["sent"])
        except Exception as e:  # never let the automation die
            log.warning("campaign mailer: %s", type(e).__name__)
        await asyncio.sleep(CHECK_INTERVAL_SECONDS)


def start_mailer() -> None:
    try:
        asyncio.get_running_loop().create_task(_loop())
    except RuntimeError:
        pass
