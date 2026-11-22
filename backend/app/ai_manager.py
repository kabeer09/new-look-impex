"""AI Website Manager — real tool-calling agent for admin website management.

The LLM is used only to propose whitelisted tool calls. Every mutation goes
through _apply_change, which records before/after snapshots so changes can be
previewed, published and rolled back. No unrestricted DB or shell access.
"""
from __future__ import annotations
import json
import re
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import httpx

from . import models
from .auth import require_role
from .config import settings
from .database import get_db
from .llm import generate
from .media_store import save_file, public_url, validate_rights
from .text import slugify

router = APIRouter()

# Tools the agent is allowed to call. Read-only tools are always instant.
MUTATING_TOOLS = {
    "update_product", "create_product", "update_site_content",
    "create_banner", "update_seo_page",
}
TOOL_SPECS = [
    ("get_website_overview", "No params. Returns product/category/banner/page/enquiry counts and site settings."),
    ("search_products", "Params: query (string), limit (int, max 20). Finds products by name/SKU/tag."),
    ("get_analytics", "No params. Returns enquiry/RFQ counts and top countries."),
    ("update_product", "Params: product_id (int) or product_name (string), plus any of: name, short_description, description, seo_title, seo_description, featured (bool), status (published|draft|archived)."),
    ("create_product", "Params: name (required), category_slug (one of copper-bottles, copper-jugs-pitchers, copper-mugs-tumblers, copper-kitchenware, brass-kitchenware, decorative-bowls), description, short_description, seo_title, seo_description, image_urls (list of URLs from uploaded files), sku, status (draft|published). Never invent specs/prices/certifications."),
    ("update_site_content", "Params: key (string), value (any JSON). Common keys: hero {headline, subline, video}, home_faq [{q,a}], shop_category_tiles, announcement."),
    ("create_banner", "Params: title, subtitle, image_url (required), cta_text, cta_link, placement (default home_hero), is_active (bool)."),
    ("update_seo_page", "Params: path (e.g. /), title, description, canonical."),
]

SYSTEM_PROMPT = """You are the AI Website Manager for New Look Impex / NLI Collections, an Indian B2B brass & copper handicraft manufacturer and exporter based in Moradabad. Brand line: 'Crafted in India. Connecting Globally.' Audience: importers, wholesalers, distributors, retailers, interior designers, gift companies and hospitality buyers in USA, UK, Germany, UAE, France, Australia, Canada, Netherlands, Italy, Saudi Arabia, Spain, Belgium and other markets.

You manage the website by calling ONLY the tools listed below. You never invent product specifications, prices, MOQs, certifications, purity, dimensions or delivery claims. If information is missing, ask the user instead of guessing.

TOOLS:
""" + "\n".join(f"- {n}: {d}" for n, d in TOOL_SPECS) + """

RESPONSE FORMAT — return ONLY valid JSON, no markdown fences:
{"reply":"short natural reply to the user","actions":[{"tool":"tool_name","params":{...},"publish":false}],"need_info":[]}
Set "publish":true only for small, safe, explicitly requested changes. For new content, homepage/banner/SEO changes or anything destructive, use false so it can be previewed. Call read-only tools when you need context first.
"""


# ---------------- helpers ----------------

def _j(value: Any, default=None):
    try:
        return json.loads(value) if isinstance(value, str) and value.strip() else (default if default is not None else value)
    except (TypeError, ValueError):
        return default if default is not None else {}


def _dump(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, default=str)


def _revalidate(paths: list[str]) -> None:
    """Ask the frontend to purge cached pages after a publish/rollback.

    Best-effort and non-fatal: a cache miss only delays visibility, never
    corrupts content. The secret is the shared server-side NEXTAUTH_SECRET.
    """
    paths = [p for p in paths if p and p.startswith("/")]
    if not paths:
        return
    site = (settings.PUBLIC_SITE_URL or "").rstrip("/")
    if not site:
        return
    try:
        httpx.post(
            f"{site}/api/revalidate",
            json={"paths": sorted(set(paths))},
            headers={"x-revalidate-secret": settings.REVALIDATE_SECRET},
            timeout=10,
        )
    except Exception:
        pass


def _paths_for_change(entity_type: str, proposed: dict, entity_id: str = "") -> list[str]:
    if entity_type in ("site_content", "banner"):
        return ["/"]
    if entity_type == "product":
        paths = ["/products", "/products?page=1"]
        if proposed.get("path"):
            paths.append(str(proposed["path"]))
        if proposed.get("slug"):
            paths.append(f"/products/{proposed['slug']}")
        return paths
    if entity_type == "seo_page":
        return [str(proposed.get("path") or "/")]
    return ["/"]


def _extract_json(text: str) -> dict:
    if not text:
        return {}
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text)
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end <= start:
        return {}
    try:
        return json.loads(text[start:end + 1])
    except (TypeError, ValueError):
        return {}


def _overview(db: Session) -> dict:
    q = lambda m: db.query(m).count()
    return {
        "products": q(models.Product),
        "published_products": db.query(models.Product).filter(models.Product.status == "published").count(),
        "categories": q(models.Category),
        "collections": q(models.Collection),
        "banners": q(models.Banner),
        "seo_pages": q(models.SeoPage) if hasattr(models, "SeoPage") else 0,
        "enquiries": q(models.Enquiry),
        "rfqs": q(models.RFQ),
        "site_url": settings.PUBLIC_SITE_URL,
    }


def _find_product(db: Session, params: dict):
    pid = params.get("product_id")
    if pid:
        try:
            return db.query(models.Product).filter(models.Product.id == int(pid)).first()
        except (TypeError, ValueError):
            return None
    name = str(params.get("product_name") or params.get("name") or "").strip()
    if not name:
        return None
    exact = db.query(models.Product).filter(models.Product.name.ilike(name)).first()
    if exact:
        return exact
    return db.query(models.Product).filter(models.Product.name.ilike(f"%{name}%")).first()


PRODUCT_FIELDS = {
    "name", "short_description", "description", "seo_title", "seo_description",
    "featured", "status", "sku", "material", "finish", "category_id",
}


def _snapshot(row) -> dict:
    if row is None:
        return {}
    cols = getattr(row, "__table__", None)
    return {c.name: getattr(row, c.name) for c in cols.columns} if cols is not None else {}


def _apply_change(db: Session, entity_type: str, values: dict, entity_id: str | None = None):
    """Apply a proposed value dict. Returns the entity id as string."""
    if entity_type == "product":
        pid = int(entity_id) if entity_id else None
        row = db.query(models.Product).filter(models.Product.id == pid).first() if pid else None
        if row is None:
            row = models.Product(
                name=values.get("name", "Untitled product"),
                slug=slugify(values.get("name", "untitled-product")),
                status=values.get("status", "draft"),
                price_on_request=True,
                price_visibility="on_request",
            )
            db.add(row); db.flush()
        for key, val in values.items():
            key = str(key).strip()
            if key == "category_slug" or key not in PRODUCT_FIELDS:
                if key == "category_slug" and val:
                    cat = db.query(models.Category).filter(models.Category.slug == str(val)).first()
                    if cat:
                        row.category_id = cat.id
                continue
            if key == "featured":
                val = str(val).lower() in ("true", "1", "yes")
            if key == "status" and val not in ("published", "draft", "archived"):
                val = "draft"
            setattr(row, key, val)
        # images for newly created products
        urls = values.get("image_urls") or []
        if isinstance(urls, str):
            urls = [urls]
        for i, url in enumerate(urls[:12]):
            if not db.query(models.ProductImage).filter(models.ProductImage.product_id == row.id,
                                                       models.ProductImage.url == url).first():
                db.add(models.ProductImage(product_id=row.id, url=url[:1024],
                                           alt_text=f"{row.name} image {i+1}",
                                           is_primary=(i == 0),
                                           sort_order=i, source="own",
                                           permission="Uploaded via AI Website Manager"))
        db.flush()
        return str(row.id)

    if entity_type == "site_content":
        key = values.get("key")
        row = db.query(models.SiteContent).filter(models.SiteContent.key == key).first()
        if row is None:
            row = models.SiteContent(key=key)
            db.add(row)
        row.label = values.get("label") or key.replace("_", " ").title()
        row.value = _dump(values.get("value"))
        db.flush()
        return str(row.id)

    if entity_type == "banner":
        bid = int(entity_id) if entity_id else None
        row = db.query(models.Banner).filter(models.Banner.id == bid).first() if bid else None
        if row is None:
            row = models.Banner(placement=values.get("placement", "home_hero"),
                                image_url=values.get("image_url") or "")
            db.add(row); db.flush()
        for k in ("placement", "title", "subtitle", "image_url", "cta_text", "cta_link", "sort_order", "is_active"):
            if k in values and values[k] is not None:
                setattr(row, k, values[k])
        db.flush()
        return str(row.id)

    if entity_type == "seo_page":
        path = values.get("path") or entity_id
        row = db.query(models.SeoPage).filter(models.SeoPage.path == path).first() if hasattr(models, "SeoPage") else None
        if row is None and hasattr(models, "SeoPage"):
            row = models.SeoPage(path=path, title="", description="")
            db.add(row); db.flush()
        if row is not None:
            for k in ("title", "description", "canonical"):
                if k in values:
                    setattr(row, k, values[k])
            db.flush()
            return str(row.id)
        # fallback: store in site_content so the change is still real and reversible
        key = f"seo_page::{path}"
        row = db.query(models.SiteContent).filter(models.SiteContent.key == key).first()
        if row is None:
            row = models.SiteContent(key=key); db.add(row)
        row.label = f"SEO page {path}"
        row.value = _dump(values)
        db.flush()
        return str(row.id)

    raise ValueError(f"Unsupported entity type: {entity_type}")


def _run_tool(db: Session, name: str, params: dict, session_id: int, email: str,
              force_publish: bool | None = None) -> dict:
    """Validate and execute one whitelisted tool. Returns a result summary."""
    params = params if isinstance(params, dict) else {}
    if name not in [s[0] for s in TOOL_SPECS]:
        raise ValueError(f"Unknown tool: {name}")

    if name == "get_website_overview":
        return {"ok": True, "message": "Website overview retrieved.", "data": _overview(db)}
    if name == "search_products":
        q = str(params.get("query") or "").strip()
        limit = min(int(params.get("limit") or 10), 20)
        rows = (db.query(models.Product)
                .filter(models.Product.name.ilike(f"%{q}%") | models.Product.sku.ilike(f"%{q}%"))
                .limit(limit).all()) if q else db.query(models.Product).limit(limit).all()
        return {"ok": True, "message": f"Found {len(rows)} products.",
                "data": [{"id": r.id, "name": r.name, "status": r.status, "slug": r.slug} for r in rows]}
    if name == "get_analytics":
        return {"ok": True, "message": "Analytics retrieved.", "data": {
            "enquiries": db.query(models.Enquiry).count(),
            "rfqs": db.query(models.RFQ).count(),
            "events": db.query(models.AnalyticsEvent).count(),
        }}

    if name == "update_product":
        row = _find_product(db, params)
        if row is None:
            raise ValueError("Product not found. Provide product_id or an exact product_name.")
        proposed = {k: v for k, v in params.items()
                    if k in PRODUCT_FIELDS and v not in (None, "")}
        if "category_slug" in params:
            proposed["category_slug"] = params["category_slug"]
        if not proposed:
            raise ValueError("No product fields supplied to update.")
        previous = {k: _snapshot(row).get(k) for k in proposed}
        entity, entity_id, label = "product", str(row.id), f"Update product: {row.name}"
    elif name == "create_product":
        if not str(params.get("name") or "").strip():
            raise ValueError("A product name is required.")
        proposed = {k: v for k, v in params.items() if v not in (None, "")}
        proposed.setdefault("status", "draft")
        previous, entity, entity_id, label = {}, "product", None, f"Create product: {proposed['name']}"
    elif name == "update_site_content":
        key = str(params.get("key") or "").strip()
        if not key:
            raise ValueError("A content key is required.")
        row = db.query(models.SiteContent).filter(models.SiteContent.key == key).first()
        proposed = {"key": key, "value": params.get("value"), "label": params.get("label")}
        previous = {"key": key, "value": _j(row.value) if row else None}
        entity, entity_id, label = "site_content", str(row.id) if row else None, f"Update site content: {key}"
    elif name == "create_banner":
        if not str(params.get("image_url") or "").strip():
            raise ValueError("An image_url is required for a banner. Upload an image in chat first.")
        proposed = {k: v for k, v in params.items() if v not in (None, "")}
        proposed.setdefault("placement", "home_hero")
        previous, entity, entity_id, label = {}, "banner", None, f"Create banner: {proposed.get('title', 'Untitled')}"
    elif name == "update_seo_page":
        path = str(params.get("path") or "/").strip()
        proposed = {"path": path}
        for k in ("title", "description", "canonical"):
            if k in params:
                proposed[k] = params[k]
        previous, entity, entity_id, label = {"path": path}, "seo_page", path, f"Update SEO: {path}"
    else:
        raise ValueError(f"Tool not implemented: {name}")

    publish = force_publish if force_publish is not None else bool(params.get("_publish", False))
    change = models.WebsiteChangeHistory(
        session_id=session_id, user_email=email, entity_type=entity,
        entity_id=entity_id or "", label=label,
        previous_json=_dump(previous), proposed_json=_dump(proposed),
        status="published" if publish else "pending",
    )
    db.add(change); db.flush()
    db.add(models.AiActionLog(
        session_id=session_id, user_email=email, tool=name,
        params_json=_dump(params), result_json=_dump({"change_id": change.id, "published": publish}),
        status="published" if publish else "pending"))
    if publish:
        new_id = _apply_change(db, entity, proposed, entity_id)
        change.entity_id = new_id
        change.published_at = datetime.now(timezone.utc).replace(tzinfo=None)
        _revalidate(_paths_for_change(entity, proposed, new_id))
    db.commit()
    return {"ok": True, "published": publish, "change_id": change.id,
            "label": label, "proposed": proposed,
            "message": ("Applied: " if publish else "Preview ready for: ") + label}


# ---------------- endpoints ----------------

@router.get("/api/ai-manager/overview")
def ai_overview(db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    return _overview(db)


@router.get("/api/ai-manager/sessions")
def list_sessions(db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    rows = db.query(models.AiChatSession).order_by(models.AiChatSession.updated_at.desc()).limit(50).all()
    return {"items": [{"id": r.id, "title": r.title,
                       "updated_at": r.updated_at.isoformat() if r.updated_at else None} for r in rows]}


@router.post("/api/ai-manager/sessions", status_code=201)
def create_session(body: dict, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    row = models.AiChatSession(title=str(body.get("title") or "New conversation")[:255],
                               user_email=u.email)
    db.add(row); db.commit(); db.refresh(row)
    return {"id": row.id, "title": row.title}


@router.delete("/api/ai-manager/sessions/{sid}")
def delete_session(sid: int, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    row = db.query(models.AiChatSession).filter(models.AiChatSession.id == sid).first()
    if not row:
        raise HTTPException(404, "Session not found")
    db.delete(row); db.commit()
    return {"deleted": sid}


@router.get("/api/ai-manager/sessions/{sid}/messages")
def list_messages(sid: int, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    rows = (db.query(models.AiChatMessage).filter(models.AiChatMessage.session_id == sid)
            .order_by(models.AiChatMessage.id).all())
    return {"items": [{"id": r.id, "role": r.role, "content": r.content,
                       "actions": _j(r.actions_json, []), "attachments": _j(r.attachments_json, []),
                       "created_at": r.created_at.isoformat() if r.created_at else None} for r in rows]}


@router.post("/api/ai-manager/upload")
async def upload(file: UploadFile = File(...), rights: str = Form("own"),
                 db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    content = await file.read()
    if not content:
        raise HTTPException(400, "Empty file")
    rs = validate_rights(rights or "own")
    meta = save_file(file.filename or "upload.bin", content, file.content_type or "application/octet-stream")
    db.add(models.MediaFile(filename=meta["filename"], original_name=(file.filename or "")[:255],
                            content_type=file.content_type or "", size=len(content),
                            source="AI Website Manager", permission=rs,
                            has_thumb=bool(meta.get("has_thumb")), has_webp=bool(meta.get("has_webp"))))
    db.commit()
    return {"url": public_url(meta["filename"]), "filename": meta["filename"],
            "content_type": file.content_type or ""}


@router.post("/api/ai-manager/chat")
def chat(body: dict, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    sid = body.get("session_id")
    message = str(body.get("message") or "").strip()
    if not message:
        raise HTTPException(400, "Message is required")
    attachments = body.get("attachments") or []
    if not isinstance(attachments, list):
        attachments = []
    auto_publish = bool(body.get("auto_publish", False))

    session = db.query(models.AiChatSession).filter(models.AiChatSession.id == sid).first() if sid else None
    if session is None:
        session = models.AiChatSession(title=message[:60] or "New conversation", user_email=u.email)
        db.add(session); db.flush()

    db.add(models.AiChatMessage(session_id=session.id, role="user", content=message,
                                attachments_json=_dump(attachments)))
    db.commit()

    recent = (db.query(models.AiChatMessage)
              .filter(models.AiChatMessage.session_id == session.id)
              .order_by(models.AiChatMessage.id.desc()).limit(8).all())
    history = "\n".join(f"{m.role}: {m.content[:400]}" for m in reversed(recent))
    context = json.dumps(_overview(db), ensure_ascii=False)
    prompt = (f"WEBSITE CONTEXT:\n{context}\n\nCONVERSATION:\n{history}\n\n"
              f"CURRENT USER REQUEST:\n{message}\n\n"
              "Return only the JSON object described in your instructions.")

    res = generate(prompt, system=SYSTEM_PROMPT, max_tokens=1800)
    parsed = _extract_json(res.get("text", ""))
    reply = str(parsed.get("reply") or "I understand. I could not produce a response; please try again.")
    action_summaries = []
    if not res.get("configured") and not parsed.get("actions"):
        # Honest fallback — no fake actions, just explain configuration state.
        reply = ("The AI provider is not configured on this deployment, so I cannot generate changes "
                 "automatically. The website manager is installed, but you must set LLM_API_KEY / "
                 "LLM_API_BASE / LLM_MODEL on the backend. " + message)
    for act in parsed.get("actions", [])[:8]:
        if not isinstance(act, dict):
            continue
        name = str(act.get("tool") or "")
        params = act.get("params") or {}
        publish = auto_publish or bool(act.get("publish", False))
        try:
            result = _run_tool(db, name, params, session.id, u.email, force_publish=publish)
            action_summaries.append({"tool": name, "status": "ok", **{k: result.get(k) for k in
                                     ("message", "published", "change_id", "label", "proposed") if k in result}})
        except Exception as e:
            db.add(models.AiActionLog(session_id=session.id, user_email=u.email, tool=name,
                                      params_json=_dump(params), result_json="{}",
                                      status="failed", error=str(e)[:500]))
            db.commit()
            action_summaries.append({"tool": name, "status": "failed", "error": str(e)[:300]})

    db.add(models.AiChatMessage(session_id=session.id, role="assistant", content=reply,
                                actions_json=_dump(action_summaries)))
    session.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    return {"session_id": session.id, "reply": reply, "actions": action_summaries,
            "provider": res.get("provider"), "configured": res.get("configured")}


@router.get("/api/ai-manager/actions")
def list_actions(status: str = "", limit: int = 100, db: Session = Depends(get_db),
                 u=Depends(require_role("admin", "editor"))):
    q = db.query(models.AiActionLog)
    if status:
        q = q.filter(models.AiActionLog.status == status)
    rows = q.order_by(models.AiActionLog.id.desc()).limit(min(limit, 200)).all()
    return {"items": [{"id": r.id, "tool": r.tool, "status": r.status,
                       "params": _j(r.params_json, {}), "result": _j(r.result_json, {}),
                       "error": r.error, "user_email": r.user_email,
                       "created_at": r.created_at.isoformat() if r.created_at else None} for r in rows]}


@router.get("/api/ai-manager/changes")
def list_changes(status: str = "pending", db: Session = Depends(get_db),
                 u=Depends(require_role("admin", "editor"))):
    q = db.query(models.WebsiteChangeHistory)
    if status and status != "all":
        q = q.filter(models.WebsiteChangeHistory.status == status)
    rows = q.order_by(models.WebsiteChangeHistory.id.desc()).limit(100).all()
    return {"items": [{"id": r.id, "entity_type": r.entity_type, "entity_id": r.entity_id,
                       "label": r.label, "status": r.status,
                       "previous": _j(r.previous_json, {}), "proposed": _j(r.proposed_json, {}),
                       "created_at": r.created_at.isoformat() if r.created_at else None} for r in rows]}


@router.post("/api/ai-manager/changes/{cid}/publish")
def publish_change(cid: int, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    row = db.query(models.WebsiteChangeHistory).filter(models.WebsiteChangeHistory.id == cid).first()
    if not row:
        raise HTTPException(404, "Change not found")
    if row.status not in ("pending", "failed"):
        raise HTTPException(400, "Change is not pending")
    try:
        new_id = _apply_change(db, row.entity_type, _j(row.proposed_json, {}), row.entity_id or None)
        row.entity_id = new_id
        row.status = "published"
        row.published_at = datetime.now(timezone.utc).replace(tzinfo=None)
        db.add(models.AiActionLog(session_id=row.session_id, user_email=u.email,
                                  tool="publish_change", params_json=_dump({"change_id": cid}),
                                  result_json=_dump({"entity": new_id}), status="completed"))
        db.commit()
        _revalidate(_paths_for_change(row.entity_type, _j(row.proposed_json, {}), str(new_id)))
        return {"published": cid, "entity_id": new_id}
    except Exception as e:
        db.rollback()
        row.status = "failed"
        db.commit()
        raise HTTPException(500, f"Publish failed: {e}")


@router.post("/api/ai-manager/changes/{cid}/rollback")
def rollback_change(cid: int, db: Session = Depends(get_db), u=Depends(require_role("admin", "editor"))):
    row = db.query(models.WebsiteChangeHistory).filter(models.WebsiteChangeHistory.id == cid).first()
    if not row:
        raise HTTPException(404, "Change not found")
    if row.status != "published":
        raise HTTPException(400, "Only published changes can be rolled back")
    try:
        previous = _j(row.previous_json, {})
        if not previous:
            # create-type change: remove the created entity
            entity, eid = row.entity_type, row.entity_id
            model = {"product": models.Product, "banner": models.Banner,
                     "site_content": models.SiteContent}.get(entity)
            if model and eid and str(eid).isdigit():
                target = db.query(model).filter(model.id == int(eid)).first()
                if target:
                    db.delete(target)
        else:
            _apply_change(db, row.entity_type, previous, row.entity_id or None)
        row.status = "reverted"
        db.add(models.AiActionLog(session_id=row.session_id, user_email=u.email,
                                  tool="rollback_change", params_json=_dump({"change_id": cid}),
                                  result_json="{}", status="reverted"))
        db.commit()
        _revalidate(_paths_for_change(row.entity_type, _j(row.proposed_json, {}), row.entity_id or ""))
        return {"rolled_back": cid}
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Rollback failed: {e}")


@router.put("/api/ai-manager/settings")
def save_settings(body: dict, db: Session = Depends(get_db), u=Depends(require_role("admin",))):
    allowed = {"auto_publish_simple", "max_upload_mb", "default_language"}
    for key, value in body.items():
        if key not in allowed:
            continue
        row = db.query(models.SiteContent).filter(models.SiteContent.key == f"ai_manager::{key}").first()
        if row is None:
            row = models.SiteContent(key=f"ai_manager::{key}")
            db.add(row)
        row.label = f"AI Manager {key}"
        row.value = _dump(value)
    db.commit()
    return {"saved": [k for k in body if k in allowed]}
