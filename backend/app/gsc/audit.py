"""Read-only indexing audit helpers. No change is published from here."""
from __future__ import annotations

import json
import re
from collections import Counter
from datetime import datetime, timezone
from urllib.parse import urlparse

import httpx

from .. import models

SITE = "https://www.newlookimpex.store"

IMPORTANT_URLS = [
    (SITE + "/", "high"),
    (SITE + "/products", "high"),
    (SITE + "/export", "high"),
    (SITE + "/copper-bottles", "high"),
    (SITE + "/brass-home-decor", "high"),
    (SITE + "/usa", "normal"), (SITE + "/uk", "normal"), (SITE + "/uae", "normal"),
    (SITE + "/canada", "normal"), (SITE + "/au", "normal"),
    (SITE + "/europe/germany", "normal"),
    (SITE + "/wholesale/uk", "normal"),
]

# Deliberate duplicate routes: canonical short URLs are indexed instead.
INTENTIONAL_NOINDEX_PREFIXES = ("/wholesale/",)


def _issue(issue_type, severity, classification, action, evidence):
    return {"issue_type": issue_type, "severity": severity,
            "classification": classification, "recommended_action": action,
            "evidence": evidence}


def classify(url: str, http_status: int = 200, robots_meta: str = "",
             x_robots: str = "", canonical: str = "", in_sitemap: bool = True,
             h1_count: int = 1, gsc_verdict: str = "") -> dict:
    """Classify one URL. Pure function — safe to unit test."""
    robots = f"{robots_meta} {x_robots}".lower()
    parsed = urlparse(url)
    base = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
    if http_status >= 400:
        return _issue("broken_url", "High", "auto",
                      "Fix or remove the broken URL after verifying the correct target.",
                      {"http_status": http_status})
    if "noindex" in robots:
        if canonical and canonical.rstrip("/") != url.rstrip("/") or \
                parsed.path.startswith(INTENTIONAL_NOINDEX_PREFIXES):
            return _issue("intentional_noindex", "Low", "none",
                          "Document as an intentional duplicate; do not remove noindex.",
                          {"canonical": canonical, "path": parsed.path})
        return _issue("accidental_noindex", "High", "auto",
                      "Remove the accidental noindex on this approved indexable page.",
                      {"robots_meta": robots_meta, "x_robots_tag": x_robots})
    if parsed.query and canonical and canonical.rstrip("/") == base.rstrip("/"):
        return _issue("alternate_canonical", "Low", "none",
                      "Keep the canonical; filtered parameters should not be indexed separately.",
                      {"canonical": canonical, "query": parsed.query})
    if "discovered" in gsc_verdict.lower() and "not indexed" in gsc_verdict.lower():
        return _issue("discovered_not_indexed", "Medium", "approval",
                      "Strengthen internal links and unique content, then re-inspect.",
                      {"gsc_verdict": gsc_verdict})
    if "unknown" in gsc_verdict.lower():
        return _issue("unknown_to_google", "Medium", "approval",
                      "Verify sitemap processing and internal links before requesting any action.",
                      {"gsc_verdict": gsc_verdict})
    if h1_count == 0 and not parsed.query:
        return _issue("missing_h1", "Medium", "auto",
                      "Add a truthful server-rendered H1 to this indexable page.", {"h1_count": 0})
    if not in_sitemap and canonical and canonical.rstrip("/") == url.rstrip("/"):
        return _issue("missing_from_sitemap", "Low", "auto",
                      "Add this canonical indexable URL to the page sitemap.", {"url": url})
    return _issue("none", "Low", "none", "No action required.", {})


def validate_sitemap(entries: list[str]) -> list[dict]:
    issues = []
    counts = Counter(entries)
    for u, n in counts.items():
        if n > 1:
            issues.append(_issue("duplicate_sitemap_url", "Low", "auto",
                                 "Remove the duplicate sitemap entry.", {"url": u, "count": n}))
    for u in entries:
        parsed = urlparse(u)
        if parsed.query:
            issues.append(_issue("query_param_in_sitemap", "Low", "auto",
                                 "Remove filtered query-parameter URL from the page sitemap.", {"url": u}))
        if parsed.netloc and parsed.netloc.lower() != "www.newlookimpex.store":
            issues.append(_issue("non_canonical_host", "Medium", "approval",
                                 "Confirm the preferred www host before changing URLs.", {"url": u}))
        if parsed.path.startswith(INTENTIONAL_NOINDEX_PREFIXES):
            issues.append(_issue("noindex_in_sitemap", "High", "auto",
                                 "Remove intentionally noindexed duplicate from the sitemap.", {"url": u}))
    return issues


def check_url(url: str) -> dict:
    """Live HTTP check of a known URL (no mutation, no indexing request)."""
    out = {"url": url, "http_status": 0, "redirect_chain": [], "canonical": "",
           "robots_meta": "", "x_robots": "", "title": "", "h1_count": 0, "words": 0}
    try:
        r = httpx.get(url, timeout=20, follow_redirects=True)
        out["http_status"] = r.status_code
        out["redirect_chain"] = [str(h.headers.get("location", "")) for h in r.history]
        out["x_robots"] = r.headers.get("x-robots-tag", "")
        html = r.text
        m = re.search(r'<link[^>]+rel="canonical"[^>]+href="([^"]+)"', html, re.I)
        out["canonical"] = m.group(1) if m else ""
        m = re.search(r'<meta[^>]+name="robots"[^>]+content="([^"]*)"', html, re.I)
        out["robots_meta"] = m.group(1) if m else ""
        m = re.search(r"<title>([^<]+)</title>", html, re.I)
        out["title"] = m.group(1) if m else ""
        out["h1_count"] = len(re.findall(r"<h1\b", html, re.I))
        text = re.sub(r"<script[\s\S]*?</script>|<style[\s\S]*?</style>|<[^>]+>", " ", html)
        out["words"] = len([w for w in text.split() if re.search(r"\w", w)])
    except httpx.HTTPError as e:
        out["error"] = type(e).__name__
    return out


def compare_inspection(previous: dict, current: dict) -> dict:
    keys = ("last_verdict", "last_index_status", "last_google_canonical", "last_user_canonical")
    changed = [k for k in keys if previous.get(k) != current.get(k)]
    return {"changed": bool(changed), "fields": changed, "previous": previous, "current": current}


def seed_queue(db) -> int:
    added = 0
    for url, priority in IMPORTANT_URLS:
        if not db.query(models.GscCrawlQueue).filter(models.GscCrawlQueue.url == url).first():
            db.add(models.GscCrawlQueue(url=url, priority=priority))
            added += 1
    db.commit()
    return added


def record_issue(db, url: str, issue: dict) -> bool:
    if issue["issue_type"] == "none":
        return False
    existing = (db.query(models.GscAuditIssue)
                .filter(models.GscAuditIssue.url == url,
                        models.GscAuditIssue.issue_type == issue["issue_type"],
                        models.GscAuditIssue.status.in_(["Pending", "Approved"])).first())
    if existing:
        existing.evidence_json = json.dumps(issue["evidence"], ensure_ascii=False)[:4000]
        existing.verified_at = datetime.now(timezone.utc).replace(tzinfo=None)
        db.commit()
        return False
    db.add(models.GscAuditIssue(
        url=url[:1024], issue_type=issue["issue_type"], severity=issue["severity"],
        classification=issue["classification"],
        evidence_json=json.dumps(issue["evidence"], ensure_ascii=False)[:4000],
        recommended_action=issue["recommended_action"], status="Pending",
        verified_at=datetime.now(timezone.utc).replace(tzinfo=None)))
    db.commit()
    return True
