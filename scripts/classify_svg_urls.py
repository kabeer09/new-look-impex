"""Classify SVG URLs exported from Google Search Console.

Usage:
  python scripts/classify_svg_urls.py gsc_svg_export.csv > docs/svg-indexing-report.md

The CSV must contain a column named "URL" (GSC Pages report export). This script
does NOT invent URLs, and makes no changes to the website, sitemap or robots.txt.
"""
from __future__ import annotations

import csv
import sys
import urllib.parse
from collections import Counter, defaultdict

import httpx

SITE = "https://www.newlookimpex.store"
SITEMAP = SITE + "/sitemap.xml"
ROBOTS = SITE + "/robots.txt"


def load_urls(path: str) -> list[str]:
    with open(path, newline="", encoding="utf-8-sig") as fh:
        reader = csv.DictReader(fh)
        key = next((k for k in (reader.fieldnames or []) if k.strip().lower() in ("url", "page", "address")), None)
        if not key:
            raise SystemExit("CSV needs a URL/Page column")
        return [row[key].strip() for row in reader if row.get(key, "").strip()]


def category(url: str) -> str:
    path = urllib.parse.urlparse(url).path.lower()
    name = path.rsplit("/", 1)[-1]
    if "logo" in name or "brand" in name:
        return "Logo / brand asset"
    if "flag" in name or any(code in name for code in ("us", "uk", "ae", "au", "ca", "de", "fr")):
        return "Flag / country icon"
    if "icon" in name or "favicon" in name or "sprite" in name:
        return "UI icon / sprite"
    if "product" in name or "catalogue" in name:
        return "Product / catalogue asset"
    if "illustration" in name or "decor" in name or "banner" in name:
        return "Illustration / decorative"
    return "Other / needs manual review"


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    urls = load_urls(sys.argv[1])
    sitemap_urls = set()
    robots = ""
    try:
        text = httpx.get(SITEMAP, timeout=20).text
        sitemap_urls = {line.strip() for line in text.split("<loc>") if "</loc>" in line for line in [line.split("</loc>")[0]]}
    except Exception as exc:
        print(f"<!-- sitemap fetch failed: {type(exc).__name__} -->")
    try:
        robots = httpx.get(ROBOTS, timeout=20).text
    except Exception:
        robots = ""

    groups: dict[str, list[str]] = defaultdict(list)
    for u in urls:
        groups[category(u)].append(u)

    print("# SVG indexing classification (generated)")
    print(f"\nInput URLs: {len(urls)} · Sitemap URLs: {len(sitemap_urls)} · SVG in sitemap: "
          f"{sum(1 for u in sitemap_urls if u.lower().endswith('.svg'))}")
    print("\n| Category | Count | In sitemap | Notes |")
    print("|---|---:|---:|---|")
    for cat, items in sorted(groups.items(), key=lambda kv: -len(kv[1])):
        in_map = sum(1 for u in items if u in sitemap_urls)
        note = ("Keep as asset; no standalone indexing goal" if cat != "Other / needs manual review"
                else "Review individually")
        print(f"| {cat} | {len(items)} | {in_map} | {note} |")
    print("\n## Per-URL detail")
    print("\n| URL | Category | In sitemap | Robots allows | Suggested action |")
    print("|---|---|---|---|---|")
    for u in urls:
        cat = category(u)
        action = ("Remove from page sitemap only if incorrectly listed; keep the file referenced by HTML"
                  if cat != "Other / needs manual review" else "Inspect manually; do not blanket-block or delete")
        print(f"| {u} | {cat} | {'yes' if u in sitemap_urls else 'no'} | "
              f"{'yes' if 'Allow: /' in robots else 'check'} | {action} |")


if __name__ == "__main__":
    main()
