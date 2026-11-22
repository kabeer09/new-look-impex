"""AI-assisted product categorisation — suggestions only, never auto-published.

Reads VERIFIED product facts (name, material, description, sku) and ranks the
existing published categories, so a buyer-facing category genuinely groups
copper with copper and brass with brass. Nothing is written to the database:
an admin reviews each suggestion and applies it explicitly via the normal
PATCH /api/products/{id} endpoint. No invention of material, specs or claims.

Rule-based first and deterministic; an LLM, when configured, may add a second
opinion but is never the sole source of truth and is clearly labelled.
"""
from __future__ import annotations

import json
import re
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException

from . import models
from .auth import current_user, require_role, rate_limit
from .database import get_db
from .llm import generate, llm_configured

router = APIRouter()

# Keyword signals per existing category slug. Ordered; first strong material
# match wins, then the most specific product-type signal.
TYPE_SIGNALS: dict[str, list[str]] = {
    "copper-bottles": ["bottle", "water bottle", "flask"],
    "copper-jugs-pitchers": ["jug", "pitcher", "pitcher", "surahi"],
    "copper-mugs-tumblers": ["mug", "tumbler", "glass", "cup"],
    "copper-kitchenware": ["cookware", "pans", "pan", "handi", "pot", "kadai", "saucepan", "kitchenware"],
    "brass-kitchenware": ["brass cookware", "brass utensil", "thali", "dinner set", "brass kitchenware"],
    "brass-urlis": ["urli", "uruli"],
    "copper-urlis": ["copper urli", "copper uruli"],
    "brass-diyas": ["diya", "deepam", "oil lamp", "puja", "pooja"],
    "metal-diyas": ["metal diya", "diya"],
    "brass-lanterns": ["lantern", "lamp", "akhand", "hanging light"],
    "decorative-bowls": ["bowl", "decorative bowl", "vase", "planter", "centerpiece"],
    "festival-decor": ["festive", "festival", "decor", "gifting decor"],
    "corporate-gifting": ["corporate", "gift set", "gift box", "gifting", "set of"],
    "custom-bulk-orders": ["custom", "bulk", "oem", "private label"],
}

MATERIAL_PREFIX = {"Copper": "copper", "Brass": "brass"}


def _normalize(value: str) -> str:
    return " " + re.sub(r"[^a-z0-9]+", " ", (value or "").lower()).strip() + " "


def _rule_suggest(name: str, material: str, description: str, categories: list[models.Category]) -> list[dict]:
    """Rank existing categories by material affinity + product-type keywords."""
    text = _normalize(f"{name} {description}")
    mat = (material or "").strip().lower()
    prefix = MATERIAL_PREFIX.get((material or "").strip().capitalize())
    results: list[dict] = []
    by_slug = {c.slug: c for c in categories}

    for slug, signals in TYPE_SIGNALS.items():
        cat = by_slug.get(slug)
        if not cat:
            continue
        score = 0
        hit: str | None = None
        for sig in signals:
            if f" {sig} " in text or text.strip().endswith(sig + " "):
                score += 3
                hit = sig
                break
        # A type keyword must actually match — material affinity alone must not
        # create a suggestion (otherwise every copper item "matches" copper-urlis).
        if hit is None:
            continue
        # Material affinity refines confidence: the category name agrees with
        # the verified material (copper items -> copper categories, brass -> brass).
        cat_name = (cat.name or "").lower()
        if prefix and prefix in cat_name:
            score += 2
        if mat and mat in cat_name:
            score += 2
        if score > 0:
            confidence = "high" if score >= 5 else ("medium" if score == 4 else "low")
            results.append({
                "category_id": cat.id,
                "slug": cat.slug,
                "name": cat.name,
                "score": score,
                "confidence": confidence,
                "reason": f"Material '{material or 'unspecified'}' + keyword '{hit}'" if hit else f"Material '{material or 'unspecified'}' affinity",
            })

    results.sort(key=lambda r: -r["score"])
    return results[:5]


def _llm_opinion(facts: dict, options: list[dict]) -> str:
    """Optional second opinion. Forces a pick from `options` only — no invention."""
    if not llm_configured():
        return ""
    allowed = ", ".join(f"{o['slug']} ({o['name']})" for o in options) or "none"
    prompt = (
        "Choose the single best category slug for this product from this allowed list ONLY: "
        f"{allowed}. Product facts: {json.dumps(facts)[:1200]}. "
        "Return ONLY the slug, or the word NONE if unsure. No other text."
    )
    try:
        res = generate(
            f"Return ONLY the best category slug from this allowed list: {allowed}. Product facts: {json.dumps(facts)[:1200]}",
            system="You categorise products into an existing list. Reply with one slug only. Never invent categories.",
            max_tokens=60,
        )
        text = (res.get("text") or "").strip().strip('"').lower()
        for o in options:
            if text.startswith(o["slug"]):
                return o["slug"]
    except Exception:
        pass
    return ""


@router.get("/api/admin/category-audit")
def category_audit(db: Session = Depends(get_db), u=Depends(current_user)):
    """List published products with their current category and the top rule-based
    suggestion, so an admin can spot copper-in-brass / brass-in-copper mismatches
    at a glance. Read-only."""
    products = db.query(models.Product).filter(models.Product.status == "published").all()
    categories = db.query(models.Category).all()
    cat_by_id = {c.id: c for c in categories}
    rows = []
    for p in products:
        current = cat_by_id.get(p.category_id)
        sugg = _rule_suggest(p.name or "", p.material or "", p.description or "", categories)
        top = sugg[0] if sugg else None
        mismatched = bool(top and current and top["category_id"] != current.id and top["confidence"] in ("high", "medium"))
        rows.append({
            "product_id": p.id,
            "name": p.name,
            "sku": p.sku or "",
            "material": p.material or "",
            "current": {"id": current.id, "slug": current.slug, "name": current.name} if current else None,
            "suggested": {"id": top["category_id"], "slug": top["slug"], "name": top["name"], "confidence": top["confidence"]} if top else None,
            "mismatch": mismatched,
        })
    mismatches = sum(1 for r in rows if r["mismatch"])
    return {"total": len(rows), "mismatches": mismatches, "rows": rows,
            "note": "Rule-based signals from name + material + description. Review before applying; nothing is auto-changed."}


@router.post("/api/admin/category-match")
def category_match(body: dict,
                   db: Session = Depends(get_db),
                   u=Depends(require_role("admin", "editor"))):
    """Suggest a category for one product. Read-only — no writes, no auto-publish."""
    rate_limit(f"cat-match:{u.email}", 30, 600)
    try:
        pid = int(body.get("product_id", 0))
    except (TypeError, ValueError):
        raise HTTPException(400, "product_id must be an integer")

    product = db.query(models.Product).filter(models.Product.id == pid).first()
    if not product:
        raise HTTPException(404, "Product not found")

    categories = db.query(models.Category).all()
    facts = {
        "name": product.name,
        "material": product.material or "",
        "description": (product.description or "")[:600],
        "sku": product.sku or "",
    }
    suggestions = _rule_suggest(product.name or "", product.material or "", product.description or "", categories)
    current = None
    if product.category_id:
        c = db.query(models.Category).filter(models.Category.id == product.category_id).first()
        current = {"category_id": product.category_id, "slug": c.slug if c else "", "name": c.name if c else ""}

    llm = _llm_opinion(facts, suggestions)
    return {
        "product_id": pid,
        "product": {"name": product.name, "sku": product.sku, "material": product.material, "status": product.status},
        "current": current,
        "suggestions": suggestions,
        "llm_choice": llm or None,
        "source": "rule-based" + ("+llm" if llm else ""),
        "note": "Suggestions only. Review and apply via the dedicated apply endpoint; nothing is auto-published or invented.",
    }


@router.post("/api/admin/category-match/apply")
def category_match_apply(body: dict,
                         db: Session = Depends(get_db),
                         u=Depends(require_role("admin"))):
    """Admin-reviewed application of a suggested category. Single purpose:
    verifies both records and sets only category_id. No other product fields
    are touched, and nothing is guessed or auto-applied."""
    try:
        pid = int(body.get("product_id", 0))
        cid = int(body.get("category_id", 0))
    except (TypeError, ValueError):
        raise HTTPException(400, "product_id and category_id must be integers")
    if not pid or not cid:
        raise HTTPException(400, "product_id and category_id are required")

    product = db.query(models.Product).filter(models.Product.id == pid).first()
    if not product:
        raise HTTPException(404, "Product not found")
    cat = db.query(models.Category).filter(models.Category.id == cid).first()
    if not cat:
        raise HTTPException(404, "Category not found")

    old = product.category_id
    product.category_id = cid
    db.add(models.WorkflowExecution(
        workflow="category_match_apply",
        status="success",
        detail=f"product {pid}: category {old} -> {cid} by {u.email}",
    ))
    db.commit()
    return {"product_id": pid, "category_id": cid, "category": cat.name,
            "previous_category_id": old, "applied_by": u.email}
