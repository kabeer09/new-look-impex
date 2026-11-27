"""Before/after records and safe rollback for approved website changes."""
from __future__ import annotations
from datetime import datetime
import json
from sqlalchemy.orm import Session

from .. import models

DUMP = lambda v: json.dumps(v, ensure_ascii=False, default=str)
J = lambda v, d=None: json.loads(v) if isinstance(v, str) and v.strip() else (d if d is not None else v)


def capture_before(db: Session, kind: str, proposed: dict, previous: dict | None = None) -> dict:
    previous = previous or {}
    if kind == "site_content":
        row = db.query(models.SiteContent).filter(models.SiteContent.key == proposed.get("key")).first()
        return {"existed": bool(row), "key": proposed.get("key"), "value": J(row.value, {}) if row else None}
    if kind == "seo_page":
        path = proposed.get("path") or "/"
        s = db.query(models.SeoPage).filter(models.SeoPage.path == path).first()
        return {"existed": bool(s), "path": path, "title": s.title if s else "",
                "meta_description": s.meta_description if s else "",
                "canonical": s.canonical if s else ""}
    if kind in ("product_change", "product_create"):
        # tools.update_product stores only changed fields in proposed_json; the
        # product id lives in previous_json. Resolve from both before snapshotting.
        pid = (proposed.get("id") or proposed.get("product_id")
               or previous.get("id") or previous.get("product_id"))
        p = db.query(models.Product).filter(models.Product.id == pid).first() if pid else None
        if p:
            fields = ("name", "short_description", "description", "seo_title", "seo_description",
                      "status", "category_id", "sku")
            return {"existed": True, **{k: getattr(p, k) for k in fields}}
        return {"existed": False}
    if kind == "banner_create":
        return {"existed": False}
    return {}


def record_change(db: Session, approval, before: dict, result: dict) -> models.WebsiteChange | None:
    if approval.kind not in ("site_content", "seo_page", "product_change", "product_create", "banner_create"):
        return None
    target = str(before.get("key") or before.get("path") or result.get("entity_id") or "")
    change = models.WebsiteChange(
        kind=approval.kind, target=target[:255], before_json=DUMP(before),
        after_json=DUMP({"proposed": J(approval.proposed_json, {}), "result": result}),
        approval_id=approval.id, applied_by=approval.decided_by or "agent",
        status="applied", verification="pending")
    db.add(change); db.flush()
    return change


def apply_rollback(db: Session, change_id: str, user_email: str) -> dict:
    change = db.query(models.WebsiteChange).filter(models.WebsiteChange.id == change_id).first()
    if not change:
        return {"ok": False, "error": "Change not found"}
    if change.status == "rolled_back":
        return {"ok": False, "error": "Already rolled back"}
    before = J(change.before_json, {})
    try:
        if change.kind == "site_content" and before.get("existed"):
            row = db.query(models.SiteContent).filter(models.SiteContent.key == before.get("key")).first()
            if row:
                row.value = DUMP(before.get("value") or {})
        elif change.kind == "site_content":
            row = db.query(models.SiteContent).filter(models.SiteContent.key == before.get("key")).first()
            if row:
                db.delete(row)
        elif change.kind == "seo_page":
            s = db.query(models.SeoPage).filter(models.SeoPage.path == before.get("path")).first()
            if s and before.get("existed"):
                s.title = before.get("title", "")
                s.meta_description = before.get("meta_description", "")
                s.canonical = before.get("canonical", "")
            elif s:
                db.delete(s)
        elif change.kind in ("product_change", "product_create"):
            after = J(change.after_json, {})
            proposed = after.get("proposed") or {}
            pid = (proposed.get("product_id") or proposed.get("id")
                   or (after.get("result") or {}).get("entity_id"))
            if change.kind == "product_create":
                # Undo a created product and its attached images.
                if pid:
                    for img in db.query(models.ProductImage).filter(models.ProductImage.product_id == pid).all():
                        db.delete(img)
                    p = db.query(models.Product).filter(models.Product.id == pid).first()
                    if p:
                        db.delete(p)
                else:
                    return {"ok": False, "error": "Created product id missing from change record"}
            elif before.get("existed") and pid:
                p = db.query(models.Product).filter(models.Product.id == pid).first()
                if p:
                    for k, v in before.items():
                        if k != "existed" and hasattr(p, k):
                            setattr(p, k, v)
            else:
                return {"ok": False, "error": "No captured before-state for this product change"}
        elif change.kind == "banner_create":
            after = J(change.after_json, {})
            bid = (after.get("result") or {}).get("entity_id")
            b = db.query(models.Banner).filter(models.Banner.id == bid).first()
            if b:
                b.is_active = False
        else:
            return {"ok": False, "error": f"Rollback not supported for {change.kind}"}
        change.status = "rolled_back"
        change.rolled_back_at = datetime.utcnow()
        db.add(models.AiExecutionLog(task_id=None, agent_key="helpdesk", event="rollback", status="ok",
                                     detail_json=DUMP({"change_id": change_id}), user_email=user_email))
        db.commit()
        return {"ok": True, "change_id": change_id, "kind": change.kind, "target": change.target}
    except Exception as e:
        db.rollback()
        return {"ok": False, "error": str(e)[:300]}
