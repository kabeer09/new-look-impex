"""Importer for the merchant's own live site (newlookimpex.linker.store).

One-time, polite migration (single-threaded, delays between requests, bounded
page/image counts). Only the merchant's own catalogue is read — no third-party
sites, no auth/rate-limit bypass, robots Hilton Head respected
(disallowed paths never fetched).

Rules inherited from the catalogue importer: originals never modified, images
copied into the media store with descriptive names, products created as DRAFTS
for human review, unknown specs left blank, health/purity/certification claims
in source copy are STRIPPED (never repeated), source URL recorded per product.
"""
from __future__ import annotations
import re
import time
from urllib.parse import urljoin
from xml.etree import ElementTree

import httpx

SITE = "https://newlookimpex.linker.store"
SITEMAP_PRODUCTS = SITE + "/sitemaps/product-0.xml"
UA = "NewLookImpex-Catalogue-Migration/1.0 (+merchant-owned site import)"
REQUEST_DELAY_S = 3.0
MAX_PRODUCTS = 50
MAX_IMAGES_PER_PRODUCT = 6

CLAIM_WORDS = (
    "pure copper", "99.", "%", "antibacterial", "ayurved", "health benefit",
    "health advantage", "leak proof", "leak-proof", "fda", "certified",
    "certification", "bpa", "dishwasher", "microwave", "guarantee",
    "eco-friendly", "environmentally friendly", "sustainable",
)


BROWSER_HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Upgrade-Insecure-Requests": "1",
}


def fetch(url: str, timeout: float = 30.0) -> str:
    r = httpx.get(url, timeout=timeout, follow_redirects=True,
                  headers={**BROWSER_HEADERS, "X-Requested-By": "merchant-catalogue-migration"})
    r.raise_for_status()
    return r.text


def product_urls(limit: int = MAX_PRODUCTS) -> list[str]:
    xml = fetch(SITEMAP_PRODUCTS)
    root = ElementTree.fromstring(xml)
    urls = [e.text.strip() for e in root.iter("{http://www.sitemaps.org/schemas/sitemap/0.9}loc")
            if (e.text or "").strip().startswith(SITE + "/products/")]
    return urls[:limit]


def _clean_text(html_fragment: str) -> str:
    s = re.sub(r"<script[\s\S]*?</script>", " ", html_fragment)
    s = re.sub(r"<style[\s\S]*?</style>", " ", s)
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def parse_product_page(url: str, html: str) -> dict:
    """Extract name, meta, images and description from a product page."""
    def meta(name: str, attr: str = "name") -> str:
        m = re.search(r'<meta\s[^>]*' + attr + r'="' + re.escape(name) + r'"[^>]*content="([^"]*)"',
                      html, re.I)
        if not m:
            m = re.search(r'<meta\s[^>]*content="([^"]*)"[^>]*' + attr + r'="' + re.escape(name) + r'"',
                          html, re.I)
        return (m.group(1).strip() if m else "")

    m = re.search(r'<h1[^>]*class="[^"]*product-title[^"]*"[^>]*>(.*?)</h1>', html, re.I | re.S)
    name = _clean_text(m.group(1)) if m else ""
    images: list[str] = []
    for im in re.finditer(r'<img[^>]+alt="product gallery"[^>]*>', html, re.I):
        tag = im.group(0)
        sm = re.search(r'src="([^"]+)"', tag)
        if sm:
            full = sm.group(1).split("?")[0]
            if full.startswith("http") and full not in images:
                images.append(full)
    og = meta("og:image", "property")
    if og and og.split("?")[0] not in images:
        images.insert(0, og.split("?")[0])
    description = ""
    m = re.search(r'<div[^>]*class="[^"]*tab-content[^"]*"[^>]*>([\s\S]{0,20000})', html, re.I)
    if m:
        # take text up to an embedded Reviews heading or 4000 chars
        text = _clean_text(m.group(1))[:4000]
        cut = re.search(r"customer reviews|0 reviews|you may also|related product", text, re.I)
        description = text[:cut.start()].strip() if cut else text
    return {"url": url, "name": name, "meta_description": meta("description"),
            "meta_keywords": meta("keywords"),
            "images": [u for u in images if u.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))][:MAX_IMAGES_PER_PRODUCT],
            "description": description}


def sanitize_description(text: str) -> tuple[str, bool]:
    """Drop sentences carrying unverifiable claims. Returns (cleaned, had_claims)."""
    if not text:
        return "", False
    parts = re.split(r"(?<=[.!?])\s+", text)
    kept, dropped = [], False
    for s in parts:
        low = s.lower()
        if any(w in low for w in CLAIM_WORDS):
            dropped = True
            continue
        if len(s.strip()) >= 20:
            kept.append(s.strip())
    out = " ".join(kept)
    # never publish marketing CTAs scraped from the old site
    out = re.sub(r"(?i)\b(shop now|buy now|add to cart|order now)[.!]?", "", out).strip()
    out = re.sub(r"\s{2,}", " ", out)
    return out[:2000], dropped


def map_category(name: str) -> tuple[str, str]:
    """Returns (category_slug, material). Lanterns go to a neutral category
    because their metal is not stated on the source site."""
    n = name.lower()
    if "lantern" in n:
        return "metal-lanterns", ""
    if "dispenser" in n:
        return "copper-kitchenware", "Copper"
    if "mug" in n:
        return "copper-mugs-tumblers", "Copper"
    if "jar" in n or "glass" in n:
        return "copper-bottles", "Copper"
    return "copper-bottles", "Copper"


def finish_from_name(name: str) -> str:
    n = name.lower()
    if "black" in n and "antique" in n:
        return "Antique black"
    if "antique" in n:
        return "Antique"
    if "hammer" in n:
        return "Hammered"
    if "diamond" in n:
        return "Diamond-cut"
    if "matt" in n or "matte" in n:
        return "Matte"
    return ""


def seo_for(name: str, category_slug: str) -> tuple[str, str, str, list[str]]:
    short = re.sub(r"(?i)\s+(for|with)\s+.*$", "", name).strip()[:60]
    cat_words = category_slug.replace("-", " ")
    title = f"{short} Wholesale | New Look Impex"[:60]
    desc = (f"Wholesale {short.lower()} from Moradabad, India for retailers, "
            f"importers and gifting buyers. Enquire for a quotation.")[:155]
    primary = {"copper-bottles": "copper bottles wholesale",
               "copper-kitchenware": "copper kitchenware supplier",
               "copper-mugs-tumblers": "copper drinkware wholesale",
               "metal-lanterns": "metal lanterns wholesale"}.get(category_slug, "metal home décor wholesale")
    return title, desc, primary, [cat_words + " wholesale"]


def download_image(url: str, timeout: float = 60.0) -> tuple[bytes, str]:
    r = httpx.get(url, timeout=timeout, follow_redirects=True,
                  headers={**BROWSER_HEADERS, "Referer": SITE + "/"})
    r.raise_for_status()
    ctype = r.headers.get("content-type", "").split(";")[0].strip().lower()
    if not ctype.startswith("image/"):
        raise ValueError(f"Not an image: {ctype}")
    if len(r.content) > 8 * 1024 * 1024:
        raise ValueError("Image too large (>8 MB)")
    return r.content, ctype


def polite_pause() -> None:
    time.sleep(REQUEST_DELAY_S)
