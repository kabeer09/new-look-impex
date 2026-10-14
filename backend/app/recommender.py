"""Evidence-based recommendation generator with dedupe."""
from __future__ import annotations
import hashlib
import json
from sqlalchemy.orm import Session
from .models import SeoRecommendation, TrackedKeyword, WebsitePage


def dedupe_key(kind: str, url: str, keyword: str) -> str:
    return hashlib.sha256(f"{kind}|{url.lower().strip()}|{keyword.lower().strip()}".encode()).hexdigest()[:48]


def add_recommendation(db: Session, *, title: str, explanation: str, evidence: str, url: str = "",
                       target_keyword: str = "", benefit: str, confidence: str = "medium",
                       priority: str = "medium", effort: str = "medium", proposed: dict | None = None,
                       risks: str = "", kind: str = "general", result_plan: str = "") -> tuple[object, bool]:
    key = dedupe_key(kind, url, target_keyword or title)
    existing = db.query(SeoRecommendation).filter(
        SeoRecommendation.dedupe_key == key,
        SeoRecommendation.status.in_(["new", "pending", "approved", "scheduled", "published", "monitoring"])).first()
    if existing:
        return existing, False
    rec = SeoRecommendation(title=title, explanation=explanation, evidence=evidence, url=url,
                            target_keyword=target_keyword, expected_benefit="(Estimate) " + benefit,
                            confidence=confidence, priority=priority, effort=effort,
                            proposed_change=json.dumps(proposed or {}), risks=risks,
                            requires_approval=True, status="new", result_plan=result_plan, dedupe_key=key)
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec, True


def generate_from_keyword(db: Session, kw: TrackedKeyword) -> list:
    """Create 1-3 evidence-based recommendations for a keyword. No schedule-churn."""
    out = []
    pages = db.query(WebsitePage).all()
    best = None
    if kw.target_url:
        best = next((p for p in pages if p.url == kw.target_url), None)
    if not best and pages and kw.keyword:
        terms = [t for t in kw.keyword.lower().split() if len(t) > 3]
        def overlap(p):
            blob = f"{p.title} {p.h1} {p.url}".lower()
            return sum(1 for t in terms if t in blob)
        best = max(pages, key=overlap) if pages else None
        if best and overlap(best) == 0:
            best = None
    factors = json.loads(kw.opportunity_factors or "{}")
    if not best:
        rec, created = add_recommendation(
            db, kind="new-page", url="", target_keyword=kw.keyword,
            title=f"Evaluate new page opportunity: {kw.keyword}",
            explanation=f"No existing page clearly targets '{kw.keyword}'. Verify demand, then consider a focused page for {kw.country or 'target markets'}.",
            evidence=f"Opportunity score {kw.opportunity_score}; factors {json.dumps(factors)[:400]}. No matching page in catalogue ({len(pages)} pages checked).",
            benefit="A useful focused page may capture relevant wholesale queries over time; impact depends on competition and content quality.",
            confidence="medium", priority="high" if (kw.opportunity_score or 0) >= 55 else "medium",
            effort="high", risks="Do not create thin/duplicate country pages. Page must add genuine buyer value.",
            proposed={"action": "draft_page", "keyword": kw.keyword, "country": kw.country},
            result_plan="After publishing, wait 4–8 weeks then compare GSC impressions/clicks/position for the target query vs pre-publish baseline.")
        out.append(rec)
    else:
        rec, created = add_recommendation(
            db, kind="improve-page", url=best.url, target_keyword=kw.keyword,
            title=f"Optimise {best.url} for '{kw.keyword}'",
            explanation=f"Best existing match is {best.url}. Strengthen title/meta/H1, specs, FAQs and internal links around buyer intent.",
            evidence=f"Opportunity score {kw.opportunity_score}; matched page title '{best.title[:80]}'.",
            benefit="Better alignment with buyer queries may improve CTR and relevance gradually.",
            confidence="medium", priority="medium", effort="medium",
            risks="Avoid keyword stuffing; keep URLs stable (no redirect unless consolidating).",
            proposed={"action": "optimise_page", "url": best.url, "keyword": kw.keyword},
            result_plan="Wait 3–6 weeks, compare GSC clicks/impressions/CTR/position for target query on this URL.")
        out.append(rec)
    return out
