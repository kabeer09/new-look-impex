"""AI SEO assistant for products, collections and categories.

Generates SEO suggestions from VERIFIED entity data only. Suggestions are
returned for human review — this endpoint NEVER writes to the database.
No search-volume or ranking claims unless a data source provides them
(none is claimed here; suggestions are labelled accordingly)."""
from __future__ import annotations
import json
from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException

from . import models
from .auth import current_user, rate_limit, require_role
from .config import settings
from .database import get_db
from .llm import generate, llm_configured
from .text import slugify, truncate

router = APIRouter()

SEO_PROMPT = """You assist New Look Impex (Moradabad, India — brass & copper
handicrafts wholesaler). Given these VERIFIED facts about a {entity_type}:
{facts}
Return ONLY JSON with any of these keys: {{"name": string (concise product
name from the facts, e.g. material + item type), "seo_title": string
(<=60 chars), "seo_description": string (<=155 chars), "slug": string
(url-safe lowercase), "primary_keyword": string, "related_keywords":
[strings, max 8], "description": string (2-4 factual sentences, only from
the given facts), "alt_text": string, "internal_links": [relative URL paths
starting with /]}}.
Base everything ONLY on the given facts. NEVER invent certifications,
capacities, prices, MOQs, stock, rankings or search volumes. Omit keys you
cannot support from the facts."""

SEO_FIELDS = ("name", "seo_title", "seo_description", "slug",
              "primary_keyword", "related_keywords",
              "description", "alt_text", "internal_links")


def _load_entity(db: Session, entity_type: str, entity_id: int):
    if entity_type == "product":
        e = db.query(models.Product).filter(models.Product.id == entity_id).first()
        if not e:
            return None, {}
        cat = ""
        if e.category_id:
            c = db.query(models.Category).filter(
                models.Category.id == e.category_id).first()
            cat = c.name if c else ""
        facts = {"name": e.name, "category": cat, "material": e.material or None,
                 "finish": e.finish or None, "color": e.color or None,
                 "description": (e.description or "")[:800] or None,
                 "sku": e.sku or None,
                 "moq": e.moq or None, "lead_time": e.lead_time or None}
        current = {"seo_title": e.seo_title, "seo_description": e.seo_description,
                   "slug": e.slug,
                   "alt_text": None}
        return e, {"facts": facts, "current": current, "label": e.name}
    if entity_type == "collection":
        e = db.query(models.Collection).filter(models.Collection.id == entity_id).first()
        if not e:
            return None, {}
        return e, {"facts": {"name": e.name,
                             "description": (e.description or "")[:800] or None},
                   "current": {"seo_title": e.seo_title,
                               "seo_description": e.seo_description, "slug": e.slug},
                   "label": e.name}
    if entity_type == "category":
        e = db.query(models.Category).filter(models.Category.id == entity_id).first()
        if not e:
            return None, {}
        return e, {"facts": {"name": e.name,
                             "description": (e.description or "")[:800] or None},
                   "current": {"seo_title": e.seo_title,
                               "seo_description": e.seo_description, "slug": e.slug},
                   "label": e.name}
    return None, {}


def _singularize(phrase: str) -> str:
    """Naive singularizer for catalogue category names (Urlis→Urli,
    Diyas→Diya, Bowls→Bowl). Only strips a trailing 's' with guards so
    words like 'Brass'/'Glass' are never mangled. All words come from
    verified facts — no invention."""
    out = []
    for w in phrase.split():
        lw = w.lower()
        if lw.endswith("ss") or len(w) <= 3:
            out.append(w)
        elif lw.endswith("ies") and len(w) > 4:
            out.append(w[:-3] + "y")
        elif lw.endswith("s"):
            out.append(w[:-1])
        else:
            out.append(w)
    return " ".join(out)


def _rule_based_name(facts: dict) -> str | None:
    category = str(facts.get("category") or "").strip()
    if not category:
        return None
    singular = _singularize(category)
    material = str(facts.get("material") or "").strip()
    finish = str(facts.get("finish") or "").strip()
    parts = []
    if finish:
        parts.append(finish)
    if material and material.lower() not in singular.lower().split():
        parts.append(material)
    parts.append(singular)
    name = " ".join(parts).strip()
    return name[:120] if name else None


def _rule_based_description(facts: dict, label: str) -> str | None:
    """Compose a factual description ONLY from verified facts + the
    business's real wholesale-enquiry model. No invented specifications."""
    bits: list[str] = []
    material = str(facts.get("material") or "").strip()
    finish = str(facts.get("finish") or "").strip()
    category = str(facts.get("category") or "").strip()
    cat_words = category.lower().split()
    head_bits = [finish] if finish else []
    if material and material.lower() not in cat_words:
        head_bits.append(material)
    item = _singularize(category).lower() if category else ""
    if head_bits or item:
        bits.append(f"{' '.join(head_bits)} {item}".strip().capitalize()
                    + " from Moradabad, India.")
    color = str(facts.get("color") or "").strip()
    if color:
        bits.append(f"Colour: {color}.")
    dims = str(facts.get("dimensions") or "").strip()
    if dims:
        bits.append(f"Dimensions: {dims}.")
    moq = str(facts.get("moq") or "").strip()
    if moq:
        bits.append(f"Minimum order quantity: {moq}.")
    if not bits:
        return None
    bits.append("Suitable for wholesale, retail and export enquiries. "
                "Contact New Look Impex for bulk requirements and a quotation.")
    text = " ".join(bits)
    return text[:1500]


def _parse(text: str) -> dict:
    try:
        t = text.strip()
        if t.startswith("```"):
            t = t.split("```")[1]
            if t.lstrip().startswith("json"):
                t = t.lstrip()[4:]
        obj = json.loads(t[t.find("{"):t.rfind("}") + 1])
        return obj if isinstance(obj, dict) else {}
    except Exception:
        return {}


@router.post("/api/seo/ai-generate")
def ai_generate(payload: dict, db: Session = Depends(get_db),
                u=Depends(require_role("admin", "editor"))):
    rate_limit(f"ai-seo:{u.email}", 20, 600)
    entity_type = str(payload.get("entity_type", "")).strip().lower()
    if entity_type not in ("product", "collection", "category"):
        raise HTTPException(400, "entity_type must be product, collection or category.")
    try:
        entity_id = int(payload.get("entity_id", 0))
    except (TypeError, ValueError):
        raise HTTPException(400, "entity_id must be an integer.")
    fields = payload.get("fields") or list(SEO_FIELDS)
    fields = [f for f in fields if f in SEO_FIELDS]
    if not fields:
        raise HTTPException(400, "No generable fields requested.")
    # Unsaved drafts: accept caller-supplied verified facts instead of a DB row.
    draft_facts = payload.get("facts") if entity_id == 0 else None
    if draft_facts is not None and not isinstance(draft_facts, dict):
        raise HTTPException(400, "facts must be an object.")
    if entity_id == 0 and not draft_facts:
        raise HTTPException(400, "Provide entity_id or facts {name?, description?, ...}.")
    entity, info = (None, {}) if draft_facts else _load_entity(db, entity_type, entity_id)
    if entity is None and not draft_facts:
        raise HTTPException(404, f"{entity_type} not found")
    if draft_facts:
        label = str(draft_facts.get("name") or "Untitled product")[:200]
        info = {"facts": {k: v for k, v in {
            "name": draft_facts.get("name"),
            "category": draft_facts.get("category"),
            "material": draft_facts.get("material"),
            "finish": draft_facts.get("finish"),
            "color": draft_facts.get("color"),
            "dimensions": draft_facts.get("dimensions"),
            "weight": draft_facts.get("weight"),
            "description": str(draft_facts.get("description") or "")[:800] or None,
            "sku": draft_facts.get("sku"),
            "moq": draft_facts.get("moq"),
            "lead_time": draft_facts.get("lead_time")}.items() if v},
            "current": {}, "label": label}
    facts = {k: v for k, v in info["facts"].items() if v}
    suggestions: dict = {}
    source = "rule-based"
    if llm_configured():
        res = generate(SEO_PROMPT.format(entity_type=entity_type,
                                         facts=json.dumps(facts)[:2000]),
                       max_tokens=700)
        parsed = _parse(res.get("text", "")) if res.get("text") else {}
        if parsed:
            source = f"ai:{settings.LLM_MODEL}"
            for f in fields:
                if parsed.get(f):
                    v = parsed[f]
                    suggestions[f] = v if isinstance(v, list) else str(v)[:2000]
    if not suggestions:
        # Transparent rule-based fallback from verified facts only.
        label = info["label"]
        if "name" in fields and (not label or label == "Untitled product"):
            rb_name = _rule_based_name(facts)
            if rb_name:
                suggestions["name"] = rb_name
                label = rb_name
        if "description" in fields:
            rb_desc = _rule_based_description(facts, label)
            if rb_desc:
                suggestions["description"] = rb_desc
        if "seo_title" in fields:
            suggestions["seo_title"] = truncate(f"{label} — Wholesale | New Look Impex", 60)
        if "seo_description" in fields:
            mat = facts.get("material", "metal")
            suggestions["seo_description"] = truncate(
                f"Wholesale {str(label).lower()} ({mat}) from Moradabad, India "
                "for retailers, importers & gifting buyers. Enquire for a quotation.", 155)
        if "slug" in fields:
            suggestions["slug"] = slugify(label)
        if "primary_keyword" in fields and facts.get("material"):
            suggestions["primary_keyword"] = \
                f"{facts['material']} {facts.get('category', 'handicrafts')} wholesale".strip()
        if "alt_text" in fields:
            suggestions["alt_text"] = f"{label} — wholesale product photo"
    # Warnings: missing + duplicate metadata (products scope).
    current = info["current"]
    missing = [k for k in ("name", "seo_title", "seo_description", "slug",
                           "description", "alt_text")
               if k in fields and not (current.get(k) or "").strip()]
    if "alt_text" in fields and entity_type == "product" and entity is not None:
        has_img = db.query(models.ProductImage).filter(
            models.ProductImage.product_id == entity.id).first()
        if has_img and not (has_img.alt_text or "").strip() and "alt_text" not in missing:
            missing.append("alt_text")
    duplicates: list[str] = []
    if entity is not None:
        for f in ("seo_title", "seo_description"):
            if f in fields and (current.get(f) or "").strip():
                q = db.query(models.Product).filter(
                    func.lower(getattr(models.Product, f)) == current[f].strip().lower(),
                    models.Product.id != (entity.id if entity_type == "product" else -1))
                others = [p.name for p in q.limit(4).all()]
                if others:
                    duplicates.append(f"{f} also used by: {', '.join(others[:3])}")
    if entity_type == "product" and entity is not None and "internal_links" in fields and \
            "internal_links" not in suggestions:
        links = []
        if entity.category_id:
            c = db.query(models.Category).filter(
                models.Category.id == entity.category_id).first()
            if c:
                links.append(f"/categories/{c.slug}")
        colls = db.query(models.Collection).join(
            models.ProductCollection,
            models.ProductCollection.collection_id == models.Collection.id) \
            .filter(models.ProductCollection.product_id == entity.id).limit(3).all()
        links += [f"/collections/{cl.slug}" for cl in colls]
        if links:
            suggestions["internal_links"] = links
    return {"entity_type": entity_type, "entity_id": entity_id,
            "suggestions": suggestions,
            "warnings": {"missing": missing, "duplicates": duplicates},
            "source": source,
            "note": "Suggestions only — nothing was saved. Apply via the editor."}
