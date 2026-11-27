"""Configurable recurring jobs for the AI Command Centre.

Runs are best-effort and honest: jobs that require unconfigured integrations
record a 'not configured' status instead of inventing results.
"""
from __future__ import annotations
import csv
import json
import logging
import threading
from pathlib import Path
from datetime import datetime, timedelta, timezone

from . import models
from .database import SessionLocal
from .agents.tools import snapshot_kpis, get_analytics

log = logging.getLogger("agent_scheduler")
_STOP = threading.Event()

SCHEDULES = {
    "daily_health": ("Daily", "website availability, new enquiries, failed tasks"),
    "weekly_seo": ("Weekly", "SEO snapshot and keyword opportunities"),
    "weekly_export": ("Weekly", "export market research (needs web search API)"),
    "weekly_buyers": ("Weekly", "buyer discovery (needs public business data source)"),
    "weekly_competitor_review": ("Weekly", "competitor coverage + real GSC keyword review"),
    "monthly_report": ("Monthly", "business performance snapshot"),
}


def enabled(kind: str) -> bool:
    db = SessionLocal()
    try:
        row = db.query(models.SiteContent).filter(models.SiteContent.key == f"ai_schedule::{kind}").first()
        if row:
            try:
                return bool(json.loads(row.value))
            except (TypeError, ValueError):
                return True
        return kind in ("daily_health", "weekly_seo", "weekly_competitor_review", "monthly_report")
    finally:
        db.close()


def run_schedule(kind: str) -> dict:
    db = SessionLocal()
    try:
        if kind == "daily_health":
            snap = snapshot_kpis(db, period=datetime.utcnow().strftime("%Y-%m-%d"))
            db.commit()
            pending = db.query(models.AiTask).filter(models.AiTask.status == "failed").count()
            new_enq = db.query(models.Enquiry).filter(models.Enquiry.status == "new").count()
            return {"kind": kind, "status": "completed", "snapshot": snap,
                    "failed_tasks": pending, "new_enquiries": new_enq}
        if kind == "weekly_seo":
            a = get_analytics(db)
            snap = snapshot_kpis(db, period=datetime.utcnow().strftime("%Y-W%W"))
            db.commit()
            return {"kind": kind, "status": "completed", "snapshot": snap,
                    "clicks": a["clicks"], "impressions": a["impressions"],
                    "note": "Connect GSC to populate search metrics."}
        if kind in ("weekly_export", "weekly_buyers"):
            return {"kind": kind, "status": "not_configured",
                    "note": "No public web-search / buyer-data API is connected; no results are invented."}
        if kind == "weekly_competitor_review":
            # Only grounded signals: rows actually recorded in the research CSV
            # and GSC keyword rows actually synced into the database.
            folder = Path(__file__).resolve().parents[2] / "docs" / "competitor-research"
            files = sorted(folder.glob("batch*.csv")) if folder.exists() else []
            by_country: dict[str, int] = {}
            for f in files:
                try:
                    with f.open(encoding="utf-8-sig", newline="") as fh:
                        for row in csv.DictReader(fh):
                            c = (row.get("country") or "").strip()
                            if c:
                                by_country[c] = by_country.get(c, 0) + 1
                except (OSError, csv.Error) as e:
                    log.warning("competitor review: cannot read %s: %s", f, e)
            gsc = db.query(models.SeoKeyword).filter(models.SeoKeyword.source == "gsc").count()
            if not by_country:
                return {"kind": kind, "status": "not_configured",
                        "note": "No competitor research CSV found in docs/competitor-research; no findings invented."}
            return {"kind": kind, "status": "completed",
                    "research_files": [f.name for f in files],
                    "records_per_country": by_country,
                    "countries_covered": len(by_country),
                    "verified_gsc_keywords": gsc,
                    "note": ("Counts only. No search ranking, traffic, sales, backlink "
                             "or conversion figures are estimated.")}
        if kind == "monthly_report":
            snap = snapshot_kpis(db, period=datetime.utcnow().strftime("%Y-%m"))
            db.commit()
            return {"kind": kind, "status": "completed", "snapshot": snap}
        return {"kind": kind, "status": "unknown"}
    except Exception as e:
        return {"kind": kind, "status": "failed", "error": str(e)[:300]}
    finally:
        db.close()


def _growth_job(job: str):
    """Run a growth job in its own DB session. Dedupe is handled by run_job."""
    try:
        from .growth.service import run_job
        from .database import SessionLocal as _SL
        db = _SL()
        try:
            result = run_job(db, job, user="scheduler")
            if not result.get("duplicate"):
                log.info("growth %s: %s", job, result)
        finally:
            db.close()
    except Exception as e:
        log.warning("growth %s failed: %s", job, e)


def start_scheduler():
    """Background thread: continuous (5 min), daily, weekly, monthly.

    Jobs run from the server process — no browser tab or dashboard required.
    Each job is unique per period, so restarts never execute it twice.
    """
    def loop():
        last_day = None
        while not _STOP.wait(5 * 60):  # 5-minute tick, deduped per period
            now = datetime.now(timezone.utc)
            day = now.strftime("%Y-%m-%d")
            _growth_job("continuous_monitor")
            if day != last_day:
                last_day = day
                if enabled("daily_health"):
                    log.info("daily_health: %s", run_schedule("daily_health"))
                if now.weekday() == 0 and enabled("weekly_seo"):
                    log.info("weekly_seo: %s", run_schedule("weekly_seo"))
                if now.weekday() == 0 and enabled("weekly_competitor_review"):
                    log.info("weekly_competitor_review: %s", run_schedule("weekly_competitor_review"))
                if now.day == 1 and enabled("monthly_report"):
                    log.info("monthly_report: %s", run_schedule("monthly_report"))
                _growth_job("daily_seo")
                if now.weekday() == 0:
                    _growth_job("weekly_keywords")
                    _growth_job("weekly_collaboration")
                if now.day == 1:
                    _growth_job("monthly_audit")
                # Help Desk + growth reports every Friday 18:00 IST (12:30 UTC).
                ist = now + timedelta(hours=5, minutes=30)
                if ist.weekday() == 4 and 18 <= ist.hour < 19:
                    _growth_job("weekly_report")
                    try:
                        from .helpdesk.service import generate_weekly_report
                        from .database import SessionLocal as _SL
                        _db = _SL()
                        try:
                            log.info("helpdesk_weekly: %s", generate_weekly_report(_db))
                        finally:
                            _db.close()
                    except Exception as e:
                        log.warning("helpdesk_weekly failed: %s", e)
    t = threading.Thread(target=loop, daemon=True, name="ai-agent-scheduler")
    t.start()
