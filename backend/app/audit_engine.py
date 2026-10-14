"""Rule-based SEO audit engine using real crawled HTML. No invented scores."""
from __future__ import annotations
import httpx
from bs4 import BeautifulSoup


CHECKS = ["title", "meta_description", "h1", "canonical", "images_alt", "internal_links",
          "word_count", "structured_data", "robots_sitemap", "status"]


def audit_url(url: str, html: str | None = None, status_code: int | None = None) -> dict:
    issues: list[dict] = []
    checks: dict = {}
    soup = BeautifulSoup(html or "", "lxml")
    title = (soup.title.string.strip() if soup.title and soup.title.string else "")
    checks["title"] = {"value": title[:120], "length": len(title)}
    if not title:
        issues.append({"check": "title", "severity": "high", "message": "Missing <title> tag."})
    elif len(title) < 20 or len(title) > 65:
        issues.append({"check": "title", "severity": "medium", "message": f"Title length {len(title)} chars; aim 30–60."})
    meta = soup.find("meta", attrs={"name": "description"})
    desc = (meta.get("content", "").strip() if meta else "")
    checks["meta_description"] = {"length": len(desc)}
    if not desc:
        issues.append({"check": "meta_description", "severity": "high", "message": "Missing meta description."})
    elif len(desc) < 70 or len(desc) > 165:
        issues.append({"check": "meta_description", "severity": "low", "message": f"Meta description {len(desc)} chars; aim 120–155."})
    h1s = [h.get_text(strip=True) for h in soup.find_all("h1")]
    checks["h1"] = {"count": len(h1s), "values": h1s[:3]}
    if len(h1s) == 0:
        issues.append({"check": "h1", "severity": "high", "message": "Missing H1 heading."})
    elif len(h1s) > 1:
        issues.append({"check": "h1", "severity": "medium", "message": f"{len(h1s)} H1 tags found; use exactly one."})
    canon = soup.find("link", attrs={"rel": "canonical"})
    checks["canonical"] = {"present": bool(canon), "href": (canon.get("href", "") if canon else "")}
    if not canon:
        issues.append({"check": "canonical", "severity": "low", "message": "No canonical tag found."})
    imgs = soup.find_all("img")
    missing_alt = sum(1 for i in imgs if not (i.get("alt") or "").strip())
    checks["images_alt"] = {"images": len(imgs), "missing_alt": missing_alt}
    if imgs and missing_alt:
        issues.append({"check": "images_alt", "severity": "medium", "message": f"{missing_alt}/{len(imgs)} images missing alt text."})
    links = [a.get("href", "") for a in soup.find_all("a", href=True)]
    internal = [h for h in links if h.startswith("/") or (url.split("/")[2] in h if "://" in url and len(url.split("/")) > 2 else False)]
    checks["internal_links"] = {"total_links": len(links), "internal": len(internal)}
    if len(internal) < 3 and html:
        issues.append({"check": "internal_links", "severity": "low", "message": "Few internal links detected (<3)."})
    text = soup.get_text(" ", strip=True)
    wc = len(text.split())
    checks["word_count"] = {"count": wc}
    if html and wc < 200:
        issues.append({"check": "word_count", "severity": "medium", "message": f"Thin content: ~{wc} words (<200)."})
    ld = soup.find_all("script", attrs={"type": "application/ld+json"})
    checks["structured_data"] = {"json_ld_blocks": len(ld)}
    if html and not ld and any(w in text.lower() for w in ["brass", "copper", "price", "wholesale"]):
        issues.append({"check": "structured_data", "severity": "low", "message": "No Product/FAQ structured data found on a product-like page."})
    checks["status"] = {"status_code": status_code}
    if status_code and status_code >= 400:
        issues.append({"check": "status", "severity": "high", "message": f"HTTP {status_code} error."})
    # score: 100 minus weighted penalties, None if no html and no status
    if html is None and status_code is None:
        score = None
    else:
        w = {"high": 20, "medium": 8, "low": 3}
        score = max(0, 100 - sum(w.get(i["severity"], 5) for i in issues))
    return {"url": url, "checks": checks, "issues": issues, "score": score}


def fetch_and_audit(url: str, timeout: float = 12.0) -> dict:
    try:
        r = httpx.get(url, timeout=timeout, follow_redirects=True,
                      headers={"User-Agent": "NewLookImpex-SEO-Audit/1.0"})
        return audit_url(str(r.url), r.text, r.status_code)
    except Exception as e:  # network blocked etc — mark unavailable, don't invent
        return {"url": url, "checks": {"status": {"error": str(e)[:300]}}, "issues": [
            {"check": "status", "severity": "medium", "message": f"Could not fetch page: {str(e)[:200]}. Marked unavailable."}],
            "score": None}
