"""Tests for the Growth Controller coordination layer."""
import time

from app import models
from app.database import SessionLocal
from app.growth import controller, service


def _cleanup(db, ids):
    for tid in ids:
        db.query(models.AiApproval).filter(models.AiApproval.task_id == tid).delete()
        db.query(models.AgentTask).filter(models.AgentTask.id == tid).delete()
    db.commit()


def test_schema_ready_reports_missing_columns():
    db = SessionLocal()
    state = controller.schema_ready(db)
    assert "ready" in state and isinstance(state["missing"], list)
    db.close()


def test_priority_and_owner_mapping():
    assert controller.priority_for("outage") == "P0"
    assert controller.priority_for("indexing_error") == "P1"
    assert controller.priority_for("content") == "P2"
    assert controller.owner_for("enquiries") == "sales"
    assert controller.owner_for("sitemap") == "seo"


def test_task_dedupe_and_component_conflict():
    db = SessionLocal()
    stamp = str(time.time_ns())
    comp = f"test-comp-{stamp}"
    ids = []
    try:
        first = controller.create_task(db, f"Audit enquiries {stamp}", comp, "enquiries_broken",
                                       {"n": 1}, agent="sales")
        ids.append(first["id"])
        assert first["ok"] and first["priority"] == "P0" and first["approval_required"]
        dupe = controller.create_task(db, f"Audit enquiries {stamp}", comp, "enquiries_broken",
                                      {"n": 2}, agent="sales")
        assert dupe.get("duplicate") is True
        conflict = controller.create_task(db, f"Other owner {stamp}", comp, "content",
                                          {"n": 3}, agent="product")
        assert conflict.get("conflict") is True
    finally:
        _cleanup(db, ids)
        db.close()


def test_report_result_and_regression_reopen():
    db = SessionLocal()
    stamp = str(time.time_ns())
    comp = f"test-comp-{stamp}"
    ids = []
    try:
        made = controller.create_task(db, f"Fix H1 {stamp}", comp, "content",
                                      {"before": "no h1"}, agent="product")
        ids.append(made["id"])
        report = controller.report_result(db, made["id"], {"after": "h1 present"}, True)
        assert report["status"] == "COMPLETED"
        reopened = controller.reopen_on_regression(db, comp, {"after": "h1 missing"})
        assert reopened["reopened"] is True
        task = db.query(models.AgentTask).filter(models.AgentTask.id == made["id"]).first()
        assert task.status == "CREATED" and task.retries == 1
    finally:
        _cleanup(db, ids)
        db.close()


def test_next_tasks_respects_priority():
    db = SessionLocal()
    stamp = str(time.time_ns())
    ids = []
    try:
        low = controller.create_task(db, f"Low priority {stamp}", f"p3-{stamp}", "design", {}, agent="website")
        high = controller.create_task(db, f"High priority {stamp}", f"p0-{stamp}", "outage", {}, agent="website")
        ids.extend([low["id"], high["id"]])
        titles = [t["title"] for t in controller.next_tasks(db, 10)]
        assert titles.index(f"High priority {stamp}") < titles.index(f"Low priority {stamp}")
    finally:
        _cleanup(db, ids)
        db.close()


def test_scheduler_jobs_are_honest_without_pagespeed_key(monkeypatch):
    db = SessionLocal()
    from app.config import settings
    monkeypatch.setattr(settings, "PAGESPEED_API_KEY", "")
    result = service._pagespeed_baseline(db)
    assert result["status"] == "not_configured"
    assert "no scores invented" in result["note"]
    db.close()
