"""Regression tests for the AI approval / worker / rollback safety fixes."""
import json
import uuid

from app import ai_manager, models, worker
from app.agents import orchestrator
from app.database import SessionLocal
from app.growth import rollback
from app.helpdesk import service as helpdesk


def _uid():
    return uuid.uuid4().hex[:12]


def test_orchestrator_forces_preview_and_identity(monkeypatch):
    """A crafted LLM action cannot set preview=false or forge identity params."""
    monkeypatch.setattr(orchestrator.settings, "LLM_API_KEY", "test-key")
    monkeypatch.setattr(orchestrator.settings, "LLM_API_BASE", "https://example.invalid/v1")
    monkeypatch.setattr(orchestrator.settings, "LLM_MODEL", "test-model")
    monkeypatch.setattr(orchestrator, "generate", lambda *a, **kw: {
        "text": json.dumps({"reply": "ok", "actions": [{
            "tool": "update_site_content",
            "params": {"key": "hero", "value": {"headline": "x"},
                       "preview": False, "user_email": "attacker@example.com"},
        }]})})
    captured = {}

    def fake_tool(db, **params):
        captured.update(params)
        return {"ok": True, "approval_id": "approval-1"}

    monkeypatch.setitem(orchestrator.TOOLS, "update_site_content", fake_tool)
    db = SessionLocal()
    try:
        result = orchestrator.run_task(db, "update the homepage", "admin@test.example",
                                       None, ["website"], False)
        assert captured["preview"] is True
        assert captured["user_email"] == "admin@test.example"
        assert result["approvals"] == ["approval-1"]
    finally:
        db.rollback()
        db.close()


def test_product_change_rollback_uses_previous_json():
    """product id lives in previous_json; rollback must still restore the value."""
    suffix = _uid()
    db = SessionLocal()
    product = approval = change = None
    try:
        original = f"Rollback fixture {suffix}"
        product = models.Product(name=original, slug=f"rollback-{suffix}", status="draft")
        db.add(product)
        db.commit()
        db.refresh(product)
        approval = models.AiApproval(
            kind="product_change", status="executed", decided_by="admin@test.example",
            previous_json=json.dumps({"id": product.id, "name": original}),
            proposed_json=json.dumps({"name": "Changed by agent"}))
        db.add(approval)
        db.flush()
        before = rollback.capture_before(db, "product_change",
                                         json.loads(approval.proposed_json),
                                         json.loads(approval.previous_json))
        assert before["existed"] is True
        assert before["name"] == original
        change = rollback.record_change(db, approval, before,
                                        {"ok": True, "entity_id": product.id})
        db.commit()
        product.name = "Changed by agent"
        db.commit()
        result = rollback.apply_rollback(db, change.id, "admin@test.example")
        assert result["ok"], result
        db.refresh(product)
        assert product.name == original
    finally:
        if change:
            db.query(models.AiExecutionLog).filter(models.AiExecutionLog.detail_json.contains(change.id)).delete()
            db.query(models.WebsiteChange).filter(models.WebsiteChange.id == change.id).delete()
        if approval:
            db.query(models.AiApproval).filter(models.AiApproval.id == approval.id).delete()
        if product:
            db.query(models.Product).filter(models.Product.id == product.id).delete()
        db.commit()
        db.close()


def test_atomic_claim_prevents_duplicate_worker_execution():
    tid = f"task-{_uid()}"
    a, b = SessionLocal(), SessionLocal()
    try:
        a.add(models.AgentTask(id=tid, title="Exclusive claim test",
                               assigned_agent="seo", status="CREATED"))
        a.commit()
        assert worker._claim_atomically(a, tid, worker._now()) is True
        a.commit()  # SQLite serialises writers; a real worker commits its claim
        assert worker._claim_atomically(b, tid, worker._now()) is False
    finally:
        a.rollback()
        b.rollback()
        b.query(models.AgentTask).filter(models.AgentTask.id == tid).delete()
        b.commit()
        a.close()
        b.close()


def test_restricted_task_is_blocked_even_in_full_auto():
    tid = f"task-{_uid()}"
    db = SessionLocal()
    try:
        db.add(models.AgentTask(id=tid, title="delete_product from catalogue",
                                description="delete_product 42", assigned_agent="product",
                                status="CREATED"))
        db.commit()
        result = helpdesk.run_task_now(db, tid, "admin@test.example", "full_auto")
        assert result["status"] == "BLOCKED"
        task = db.query(models.AgentTask).filter(models.AgentTask.id == tid).first()
        assert task.status == "FAILED"
    finally:
        db.query(models.AgentMessage).filter(models.AgentMessage.task_id == tid).delete()
        db.query(models.AgentTask).filter(models.AgentTask.id == tid).delete()
        db.commit()
        db.close()


def test_weekly_competitor_review_uses_only_recorded_data():
    from app.agent_scheduler import run_schedule
    result = run_schedule("weekly_competitor_review")
    assert result["kind"] == "weekly_competitor_review"
    assert result["status"] in ("completed", "not_configured")
    if result["status"] == "completed":
        assert isinstance(result["countries_covered"], int)
        assert isinstance(result["verified_gsc_keywords"], int)
        assert "No search ranking" in result["note"]


def test_seo_agent_reports_only_verified_coverage():
    from app.agents.tools import seo_coverage_report
    db = SessionLocal()
    try:
        report = seo_coverage_report(db)
        for key in ("published_products", "products_missing_seo_title", "products_missing_seo_description",
                    "products_without_images", "images_missing_alt_text", "published_seo_pages",
                    "verified_gsc_keywords", "candidate_keywords"):
            assert isinstance(report[key], int), key
        assert "No Google rankings" in report["note"]
    finally:
        db.close()


def test_ai_manager_records_history_for_direct_publish(monkeypatch):
    from app.agents import tools as shared_tools
    suffix = _uid()
    monkeypatch.setitem(shared_tools.TOOLS, "update_site_content",
                        lambda db, **kw: {"ok": True, "preview": False,
                                          "key": f"test-{suffix}"})
    db = SessionLocal()
    try:
        result = ai_manager._run_tool(db, "update_site_content",
                                      {"key": f"test-{suffix}", "value": {"headline": "Hi"}},
                                      None, "admin@test.example", force_publish=True)
        assert result["ok"] is True
        history = (db.query(models.WebsiteChangeHistory)
                   .filter(models.WebsiteChangeHistory.entity_id == f"test-{suffix}").first())
        assert history is not None
        assert history.status == "published"
        change = (db.query(models.WebsiteChange)
                  .filter(models.WebsiteChange.target == f"test-{suffix}").first())
        assert change is not None
    finally:
        db.query(models.WebsiteChange).filter(models.WebsiteChange.target == f"test-{suffix}").delete()
        db.query(models.WebsiteChangeHistory).filter(
            models.WebsiteChangeHistory.entity_id == f"test-{suffix}").delete()
        db.query(models.AiActionLog).filter(models.AiActionLog.params_json.contains(suffix)).delete()
        db.commit()
        db.close()
