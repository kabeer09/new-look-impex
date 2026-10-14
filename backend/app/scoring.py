"""Transparent keyword opportunity scoring. No fabricated volumes/ranks."""
from __future__ import annotations

TARGET_COUNTRIES = {"australia", "united states", "united kingdom", "united arab emirates", "canada", "india", "usa", "uk", "uae", "us"}
B2B_SIGNALS = ["wholesale", "supplier", "manufacturer", "exporter", "importer", "bulk", "distributor", "b2b", "corporate gift", "procurement", "moradabad", "india"]
PRODUCT_SIGNALS = ["brass", "copper", "urli", "diya", "lantern", "bowl", "décor", "decor", "handicraft", "gift", "home"]


def classify_intent(kw: str) -> str:
    k = kw.lower()
    if any(w in k for w in ["buy", "price", "wholesale", "bulk order", "supplier near", "order"]):
        return "transactional"
    if any(w in k for w in ["best", "vs", "review", "top", "compare", "supplier", "manufacturer", "importer", "distributor"]):
        return "commercial"
    if any(w in k for w in ["how", "what", "guide", "ideas", "meaning", "history", "care"]):
        return "informational"
    if any(w in k for w in ["new look impex", "login", "contact"]):
        return "navigational"
    return "commercial"


def business_relevance(kw: str) -> float:
    k = kw.lower()
    prod = sum(1 for s in PRODUCT_SIGNALS if s in k)
    b2b = sum(1 for s in B2B_SIGNALS if s in k)
    score = 0.25 + min(prod, 3) * 0.15 + min(b2b, 2) * 0.15
    return round(min(score, 1.0), 3)


def commercial_score(kw: str, intent: str) -> float:
    k = kw.lower()
    base = {"transactional": 0.9, "commercial": 0.7, "informational": 0.3, "navigational": 0.2}.get(intent, 0.5)
    if any(w in k for w in ["wholesale", "bulk", "manufacturer", "supplier", "importer"]):
        base = min(1.0, base + 0.1)
    return round(base, 3)


def score_keyword(*, keyword: str, intent: str | None = None, country: str = "",
                  impressions: int | None = None, clicks: int | None = None,
                  ctr: float | None = None, position: float | None = None,
                  has_page: bool = False, business_rel: float | None = None,
                  commercial: float | None = None) -> dict:
    """Returns {score, factors, explanation}. All inputs nullable; missing => null-safe."""
    intent = intent or classify_intent(keyword)
    br = business_rel if business_rel is not None else business_relevance(keyword)
    ci = commercial if commercial is not None else commercial_score(keyword, intent)
    factors: dict[str, float | str | None] = {"business_relevance": br, "commercial_intent": ci}
    parts = [br * 0.30, ci * 0.25]
    expl = [f"Business relevance {br} (product/B2B term match).",
            f"Commercial intent {ci} (intent={intent})."]
    # GSC evidence
    if impressions and impressions > 0:
        imp_pts = min(1.0, impressions / 1000.0)  # 1000+ impressions => full
        parts.append(imp_pts * 0.15)
        factors["impressions_evidence"] = round(imp_pts, 3)
        expl.append(f"{impressions} GSC impressions → demand evidence {imp_pts:.2f}.")
    else:
        factors["impressions_evidence"] = None
        expl.append("No impression data — scored without demand evidence.")
    if position is not None:
        try:
            p = float(position)
            if p <= 3: pos = 0.4
            elif p <= 10: pos = 1.0  # striking distance
            elif p <= 20: pos = 0.8
            elif p <= 50: pos = 0.5
            else: pos = 0.2
            parts.append(pos * 0.15)
            factors["position_factor"] = pos
            expl.append(f"Avg position {p} → position factor {pos}.")
        except (TypeError, ValueError):
            factors["position_factor"] = None
    else:
        factors["position_factor"] = None
        expl.append("No position data — no ranking assumption made.")
    if ctr is not None and impressions:
        try:
            c = float(ctr)
            bench = 0.03
            ctr_pts = 1.0 if c < bench else 0.3  # low CTR = headroom
            parts.append(ctr_pts * 0.05)
            factors["ctr_headroom"] = ctr_pts
            expl.append(f"CTR {c:.2%} vs ~3% benchmark → headroom {ctr_pts}.")
        except (TypeError, ValueError):
            factors["ctr_headroom"] = None
    else:
        factors["ctr_headroom"] = None
    # content gap
    gap = 0.0 if has_page else 1.0
    parts.append(gap * 0.05)
    factors["content_gap"] = gap
    expl.append("Page already targets topic." if has_page else "No targeting page — content gap.")
    # country relevance
    if country and country.strip().lower() in TARGET_COUNTRIES:
        parts.append(0.05)
        factors["country_relevance"] = 1.0
        expl.append(f"Country '{country}' is a target market.")
    else:
        factors["country_relevance"] = 0.0 if country else None
        if country:
            expl.append(f"Country '{country}' outside core target list — lower priority.")
    score = round(max(0.0, min(1.0, sum(parts))) * 100, 1)
    return {"score": score, "factors": factors, "explanation": " ".join(expl), "intent": intent,
            "business_relevance": br, "commercial_intent": ci}
