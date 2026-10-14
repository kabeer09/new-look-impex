"""Configurable LLM provider abstraction. Works with none configured."""
from __future__ import annotations
import json
import httpx
from .config import settings


def llm_configured() -> bool:
    return bool(settings.LLM_API_KEY and settings.LLM_API_BASE and settings.LLM_MODEL)


def image_configured() -> bool:
    """Image generation needs the same OpenAI-compatible base + key.
    No separate image provider is configured — report honestly when absent."""
    return llm_configured()


def analyze_image(image_bytes: bytes, mime: str, prompt: str,
                  max_tokens: int = 1200) -> dict:
    """Vision analysis via OpenAI-compatible chat completions.
    Returns {text, configured} or {text: "", configured, error}. Never raises."""
    if not llm_configured():
        return {"text": "", "configured": False,
                "note": "No LLM provider configured; use rule-based output."}
    try:
        import base64
        b64 = base64.b64encode(image_bytes).decode()
        r = httpx.post(f"{settings.LLM_API_BASE.rstrip('/')}/chat/completions", timeout=90,
                       headers={"Authorization": f"Bearer {settings.LLM_API_KEY}"},
                       json={"model": settings.LLM_MODEL,
                             "messages": [
                                 {"role": "system",
                                  "content": "You are a product-data assistant for a B2B handicrafts exporter. "
                                             "Return ONLY valid JSON, no markdown fences. "
                                             "Never invent dimensions, materials, prices, MOQs, stock, "
                                             "certifications, or manufacturing details — use null for unknowns."},
                                 {"role": "user", "content": [
                                     {"type": "text", "text": prompt},
                                     {"type": "image_url",
                                      "image_url": {"url": f"data:{mime};base64,{b64}"}}]}],
                             "max_tokens": max_tokens, "temperature": 0.2})
        r.raise_for_status()
        data = r.json()
        text = data["choices"][0]["message"]["content"]
        return {"text": text, "configured": True}
    except Exception as e:
        return {"text": "", "configured": True, "error": str(e)[:500]}


def generate_image_bytes(prompt: str) -> dict:
    """Generate concept imagery via OpenAI-compatible /images/generations.
    Returns {image_bytes, mime} or {image_bytes: None, error}. Never raises.
    Output is CONCEPT imagery — callers must flag it as such."""
    if not image_configured():
        return {"image_bytes": None,
                "error": "No image-generation provider configured. "
                         "Set LLM_API_KEY, LLM_API_BASE and LLM_MODEL."}
    try:
        import base64
        r = httpx.post(f"{settings.LLM_API_BASE.rstrip('/')}/images/generations",
                       timeout=120,
                       headers={"Authorization": f"Bearer {settings.LLM_API_KEY}"},
                       json={"model": settings.LLM_MODEL, "prompt": prompt,
                             "n": 1, "size": "1024x1024",
                             "response_format": "b64_json"})
        r.raise_for_status()
        data = r.json()["data"][0]
        if "b64_json" in data:
            return {"image_bytes": base64.b64decode(data["b64_json"]),
                    "mime": "image/png"}
        url = data.get("url", "")
        if not url:
            return {"image_bytes": None, "error": "Provider returned no image."}
        img = httpx.get(url, timeout=60)
        img.raise_for_status()
        return {"image_bytes": img.content,
                "mime": img.headers.get("content-type", "image/png").split(";")[0]}
    except Exception as e:
        return {"image_bytes": None, "error": str(e)[:500]}


def generate(prompt: str, system: str = "You are an SEO assistant for a B2B handicrafts exporter.", max_tokens: int = 800) -> dict:
    """Returns {text, provider, model, configured}. Never raises on missing config — returns rule-based fallback flag."""
    if not llm_configured():
        return {"text": "", "provider": settings.LLM_PROVIDER, "model": settings.LLM_MODEL,
                "configured": False, "note": "No LLM provider configured; use rule-based output."}
    try:
        r = httpx.post(f"{settings.LLM_API_BASE.rstrip('/')}/chat/completions", timeout=60,
                       headers={"Authorization": f"Bearer {settings.LLM_API_KEY}"},
                       json={"model": settings.LLM_MODEL,
                             "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
                             "max_tokens": max_tokens, "temperature": 0.4})
        r.raise_for_status()
        data = r.json()
        text = data["choices"][0]["message"]["content"]
        return {"text": text, "provider": settings.LLM_PROVIDER, "model": settings.LLM_MODEL, "configured": True}
    except Exception as e:
        return {"text": "", "provider": settings.LLM_PROVIDER, "model": settings.LLM_MODEL,
                "configured": True, "error": str(e)[:500]}


SEED_KEYWORDS = [
    "Brass handicrafts manufacturer India", "Copper handicrafts supplier India",
    "Brass urli wholesale", "Copper urli supplier", "Brass diya wholesale",
    "Metal diya supplier", "Indian brass home décor wholesale", "Copper decorative bowls",
    "Brass home décor supplier Australia", "Indian handicrafts wholesale UK",
    "Brass décor importer UAE", "Custom metal corporate gifts",
]


def keyword_ideas(seed: str, country: str = "", n: int = 8) -> dict:
    """LLM ideas if configured, else deterministic rule-based expansions (labelled as estimates)."""
    res = generate(f"Generate {n} B2B SEO keyword ideas related to '{seed}' for buyers in {country or 'target markets'}. "
                   "Focus wholesale/importer/manufacturer intent for copper & brass handicrafts. Return JSON list of strings.",
                   max_tokens=500)
    if res.get("text"):
        try:
            # try parse JSON list out of response
            t = res["text"]
            start, end = t.find("["), t.rfind("]")
            if start != -1 and end != -1:
                items = json.loads(t[start:end + 1])
                return {"ideas": [str(x)[:120] for x in items][:n], "source": "ai", "model": settings.LLM_MODEL}
        except Exception:
            pass
        return {"ideas": [l.strip("- •\t ")[:120] for l in res["text"].splitlines() if len(l.strip()) > 3][:n],
                "source": "ai", "model": settings.LLM_MODEL}
    modifiers = ["wholesale", "bulk supplier", "manufacturer India", "exporter Moradabad",
                 "importer", "for retailers", "corporate gifting", "custom design"]
    ideas = [f"{seed} {m}".strip()[:120] for m in modifiers][:n]
    if country:
        ideas += [f"{seed} {country} wholesale".strip()[:120]]
    return {"ideas": ideas[:n], "source": "rule-based (no LLM configured — estimates, not measured data)",
            "model": None}
