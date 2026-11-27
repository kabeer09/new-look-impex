"""Verified product-image folder access for AI agents.

Reads new photos from the merchant's local images/ folder, never inventing
specifications. Uses the existing vision + catalogue_ai pipeline to produce
SEO title, meta description, keywords and alt text. Nothing publishes without
approval.
"""
from __future__ import annotations
import os
from pathlib import Path
from .definitions import SHARED_CONTEXT

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp"}


def folder_path() -> Path:
    configured = os.environ.get("PRODUCT_SCAN_DIR") or "images"
    p = Path(configured)
    if not p.is_absolute():
        p = Path(__file__).resolve().parents[2].parent / p
    return p


def list_new_images(limit: int = 12) -> dict:
    """List image files present in the folder (safe read-only tool)."""
    p = folder_path()
    if not p.exists():
        return {"ok": False, "error": f"Image folder not found: {p}", "items": []}
    files = sorted(f for f in p.rglob("*") if f.suffix.lower() in IMAGE_EXT)
    return {"ok": True, "folder": str(p), "total": len(files),
            "items": [{"name": f.name, "path": str(f),
                       "size_kb": round(f.stat().st_size / 1024, 1)} for f in files[:limit]]}


def analyse_images(names: list[str] | None = None, limit: int = 3) -> dict:
    """Analyse selected images with the existing vision pipeline.

    Returns product drafts with SEO metadata and an explicit verification list.
    Never writes to the catalogue — the agent proposes them as approvals.
    """
    from ..llm import analyze_image, llm_configured
    from ..catalogue_ai import generate_payload
    from ..text import slugify
    from ..config import settings

    p = folder_path()
    if not p.exists():
        return {"ok": False, "error": "Image folder not found", "items": []}
    files = sorted(f for f in p.rglob("*") if f.suffix.lower() in IMAGE_EXT)
    if names:
        wanted = set(names)
        files = [f for f in files if f.name in wanted or str(f) in wanted]
    files = files[:max(1, min(int(limit or 3), 6))]
    if not files:
        return {"ok": False, "error": "No matching images found", "items": []}

    items = []
    for f in files:
        try:
            data = f.read_bytes()
            mime = "image/jpeg" if f.suffix.lower() in (".jpg", ".jpeg") else \
                   "image/png" if f.suffix.lower() == ".png" else "image/webp"
            vision = analyze_image(data, mime,
                "Describe ONLY what is visible: product type, material if evident, "
                "colour, finish, shape, design and likely usage. Use null for unknowns. "
                "Return JSON only.", max_tokens=700)
            observed = {}
            if vision.get("text"):
                import json, re
                txt = vision["text"].replace("```json", "").replace("```", "")
                a, b = txt.find("{"), txt.rfind("}")
                if a >= 0 and b > a:
                    try:
                        observed = json.loads(txt[a:b+1])
                    except Exception:
                        observed = {}
            stem = f.stem
            name = str(observed.get("product_type") or "Handcrafted brass and copper product")
            payload = generate_payload(name=name, observed=observed, filenames=[f.name],
                                       image_urls=[], slug=slugify(stem)[:80],
                                       canonical_base=settings.PUBLIC_SITE_URL)
            seo = payload.get("seo") or {}
            items.append({
                "image": f.name, "suggested_name": name,
                "seo_title": seo.get("title") or seo.get("seo_title") or "",
                "meta_description": seo.get("description") or seo.get("meta_description") or "",
                "keywords": payload.get("keywords", {}).get("groups", [])[:6] if isinstance(payload.get("keywords"), dict) else [],
                "alt_text": (payload.get("image_seo") or [{}])[0].get("alt_text", "") if isinstance(payload.get("image_seo"), list) else "",
                "needs_verification": payload.get("needs_verification", []),
                "source": payload.get("source"),
                "configured": llm_configured(),
            })
        except Exception as e:
            items.append({"image": f.name, "error": str(e)[:200]})
    return {"ok": True, "folder": str(p), "analysed": len(items), "items": items,
            "note": "Drafts only — use create_product with approval to save. Unknown fields stay flagged."}
