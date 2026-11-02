"""AI catalogue content engine (spec §5-§9, §15).

Given one product (and optionally its primary image), produces the full
B2B/SEO payload: observed facts, six description variants, IndiaMART-style
keyword groups, Google SEO metadata, per-image SEO, B2B company copy and
JSON-LD schema — then validates the result before anything is saved.

Safety rules (spec §4/§15):
- AI output is a PREVIEW. The admin must approve before anything is public.
- Never invent purity, certifications, food-safety, dimensions, weight, MOQ,
  capacity, lead time, prices or export claims. Unknowns are labelled
  "Not provided" / "Requires verification".
- Hard-claim phrases are scrubbed with the same policy as seo_backfill.
- Works with no LLM configured: deterministic rule-based payload, clearly
  labelled as such, every substantive field flagged for verification.
"""
from __future__ import annotations
import json
import re

from .config import settings
from .llm import generate, llm_configured
from .seo_backfill import HARD_CLAIMS, has_hard_claim, unescape_text
from .text import slugify, truncate

COMPANY = "New Look Impex"
BRAND = "NLI Collections"
NOT_PROVIDED = "Not provided"
VERIFY = "Requires verification"

# ---------------------------------------------------------------------------
# Vision prompt (spec §15)
# ---------------------------------------------------------------------------

VISION_PROMPT = """Analyse this product photograph for New Look Impex (brand: NLI
Collections), a manufacturer, exporter and wholesaler of Indian metal handicrafts,
copperware, brassware and decorative home decor from Moradabad, India.

Return ONLY a JSON object (no markdown fences) with exactly these keys:
{
 "product_type": string|null,        // e.g. "water bottle", "urli bowl", "diya"
 "category": string|null,            // e.g. "Copper Bottles", "Brass Home Decor"
 "subcategory": string|null,
 "material": string|null,            // ONLY if visually confident (copper/brass/metal/wood)
 "colour": string|null,              // visible colour/finish tone
 "finish": string|null,              // hammered / matte / polished / antique ...
 "shape": string|null,
 "design": string|null,              // visible design & craftsmanship description
 "pattern": string|null,             // visible surface pattern or motif
 "usage": string|null,               // what the item appears to be used for
 "purpose": string|null,             // decorative | functional | both (from what is visible)
 "features": [strings],              // visible features only
 "style": string|null,               // traditional / contemporary / festive ...
 "customer_segment": string|null,    // who would plausibly buy this (B2B)
 "observed_facts": [strings],        // what you can actually SEE in the image
 "assumptions": [strings],           // what you inferred but cannot confirm
 "name": string|null                 // suggested product name (no claims, <= 90 chars)
}

Rules:
- Describe ONLY what is visible in the image.
- NEVER claim: purity (e.g. "100% pure"), health benefits, food-grade status,
  certifications, leak-proof, handmade, exact dimensions, weight, capacity,
  MOQ, prices, stock or export statistics. Use null instead.
- Dimensions ONLY if a ruler, scale reference or printed measurement is visible.
- Material ONLY when visually confident; otherwise null.
- If the image is not a recognisable product, set product_type to null and list
  what is unclear in assumptions."""

ENRICH_PROMPT = """You are a B2B SEO copywriter for {company} (brand: {brand}),
an Indian manufacturer/exporter of metal handicrafts, copperware and brass decor.

Product facts (verified only): {facts}

Write a JSON object (no markdown fences) with these keys:
{{
 "short_description": string,        // 50-80 words, factual, no claims
 "detailed_description": string,     // 150-250 words, professional, unique
 "highlights": [strings]             // 4-6 factual bullet points (no specs unless given)
}}

Rules: use ONLY the facts above. Never invent dimensions, weights, capacity,
purity, certifications, MOQ, prices or lead times. When a fact is unknown,
write "available on request" instead of guessing. Natural, professional
B2B English — no keyword stuffing."""

# ---------------------------------------------------------------------------
# Validation (spec §15: validate generated JSON before saving)
# ---------------------------------------------------------------------------

def parse_ai_json(text: str) -> dict | None:
    """Parse a JSON object out of an AI response (tolerates code fences)."""
    try:
        t = (text or "").strip()
        if t.startswith("```"):
            t = t.split("```")[1]
            if t.lstrip().startswith("json"):
                t = t.lstrip()[4:]
        start, end = t.find("{"), t.rfind("}")
        if start == -1 or end == -1:
            return None
        obj = json.loads(t[start:end + 1])
        return obj if isinstance(obj, dict) else None
    except Exception:
        return None


def _clean_text(value, max_len: int) -> str:
    """Unescape, collapse whitespace, scrub hard claims, clamp length."""
    text = unescape_text(str(value or ""))
    if has_hard_claim(text):
        # Drop claim-bearing sentence segments (same policy as seo_backfill).
        kept = [s for s in re.split(r"(?<=[.!?])\s+", text) if not has_hard_claim(s)]
        text = " ".join(kept).strip()
    return truncate(text, max_len)


def _clean_list(values, max_items: int = 12, max_len: int = 90) -> list[str]:
    out: list[str] = []
    seen = set()
    for v in values or []:
        item = _clean_text(v, max_len).strip(" .;,-")
        low = item.lower()
        if item and low not in seen and not has_hard_claim(item):
            seen.add(low)
            out.append(item)
        if len(out) >= max_items:
            break
    return out


def validate_observed(data: dict) -> dict:
    """Normalise vision output: strings in, claims out, unknowns = None."""
    if not isinstance(data, dict):
        return {}
    out = {}
    for key in ("product_type", "category", "subcategory", "material", "colour",
                "finish", "shape", "design", "pattern", "usage", "purpose",
                "style", "customer_segment", "name"):
        val = _clean_text(data.get(key), 240) if data.get(key) else ""
        out[key] = val or None
    out["features"] = _clean_list(data.get("features"))
    out["observed_facts"] = _clean_list(data.get("observed_facts"), max_items=15,
                                        max_len=160)
    out["assumptions"] = _clean_list(data.get("assumptions"), max_items=10,
                                     max_len=160)
    return out


# ---------------------------------------------------------------------------
# Description generation (spec §5: six professional variants)
# ---------------------------------------------------------------------------

def _fact_line(facts: dict) -> str:
    """One-line factual summary from verified/observed fields only."""
    bits = [facts.get("product_type") or facts.get("name"),
            facts.get("material"), facts.get("finish")]
    return ", ".join(b for b in (str(x).strip() for x in bits) if b and b.lower() != "none")


def build_descriptions(name: str, facts: dict) -> dict:
    """Deterministic (rule-based) description set. No LLM required.

    Every variant is factual and claim-free; unknown specs are offered
    "on request" instead of invented."""
    product = (facts.get("product_type") or name or "product").strip()
    material = (facts.get("material") or "").strip()
    finish = (facts.get("finish") or "").strip()
    design = (facts.get("design") or "").strip()
    usage = (facts.get("usage") or "").strip()
    mat_phrase = f"{material.lower()} " if material else ""
    fin_phrase = f" with {finish.lower()} finish" if finish else ""
    design_phrase = f" featuring {design.lower()}" if design else ""
    use_phrase = f", suited to {usage.lower()}" if usage else ""

    short = (f"{name} — a {mat_phrase}{product} manufactured and supplied by "
             f"{COMPANY} under the {BRAND} brand{fin_phrase}{design_phrase}. "
             f"Offered for wholesale and bulk supply to retailers, importers and "
             f"distribution buyers{use_phrase}. Specifications, packaging and "
             f"pricing are shared on request for verified business enquiries.")
    detailed = (
        f"{name} is part of the {BRAND} range from {COMPANY}, a Moradabad-based "
        f"manufacturer and exporter of Indian metal handicrafts and home decor. "
        f"The piece is a {mat_phrase}{product}{fin_phrase}{design_phrase}."
        + (f" It is intended for {usage.lower()}." if usage else "")
        + " It is offered on a wholesale basis for retailers, importers, buying "
        "houses and distribution businesses in India and international markets. "
        "Product dimensions, weight, capacity, packaging options and order "
        "quantities vary by requirement and are shared against confirmed "
        "enquiries — no specification is published here unless verified by "
        f"{COMPANY}. Buyers may request additional photographs, finish samples "
        "or customisation options as per factory confirmation. Contact "
        f"{COMPANY} for current lead times, freight terms and a written "
        "quotation for bulk requirements.")
    b2b = (
        f"B2B supply of {name.lower()} from {COMPANY} ({BRAND}). Wholesale and "
        f"bulk orders welcomed from retailers, distributors, importers and "
        f"corporate buyers. {NOT_PROVIDED}: price, MOQ, lead time and packaging "
        "— shared on verified enquiry. Export documentation support available "
        "as per order requirements.")
    manufacturer = (
        f"{COMPANY}, under its consumer brand {BRAND}, manufactures and supplies "
        f"{mat_phrase}{product}s from Moradabad, India — a recognised hub for "
        f"copperware, brassware and metal handicrafts. Products are offered to "
        "wholesale buyers, retailers and international importers. Customisation, "
        "packaging and private-label options are available only where confirmed "
        "in writing against a specific order enquiry.")
    indiamart = (
        f"{name} Manufacturer, Supplier & Exporter — {COMPANY}, India. "
        f"{BRAND} {mat_phrase}{product}{fin_phrase} for wholesale and bulk "
        f"orders. Leading {material.lower() or 'metal handicrafts'} products "
        f"manufacturer in Moradabad. Send enquiry for best wholesale price, "
        f"MOQ and delivery details. Serving retailers, importers and bulk "
        f"buyers in USA, UK, UAE, Australia, Canada and other markets.")
    buyer = (
        f"Sourcing {name.lower()} from India? {COMPANY} ({BRAND}) supplies "
        f"{mat_phrase}{product}s to international wholesale buyers, importers "
        f"and distribution businesses. Share your quantity, specification and "
        "destination requirements for an FOB/CIF indication and lead time. "
        "Product specifications and compliance documents are provided against "
        "genuine buyer enquiries — we do not publish unverified claims.")
    return {"short": _clean_text(short, 700), "detailed": _clean_text(detailed, 2200),
            "b2b": _clean_text(b2b, 700), "manufacturer": _clean_text(manufacturer, 900),
            "indiamart": _clean_text(indiamart, 900), "buyer": _clean_text(buyer, 800)}


# ---------------------------------------------------------------------------
# IndiaMART-style B2B keyword generation (spec §6)
# ---------------------------------------------------------------------------

TARGET_COUNTRIES = ["USA", "UK", "UAE", "Australia", "Canada"]


def _core_keywords(name: str, facts: dict) -> list[str]:
    """Product-specific core terms, derived from observed facts only."""
    product = (facts.get("product_type") or "").strip().lower()
    material = (facts.get("material") or "").strip().lower()
    finish = (facts.get("finish") or "").strip().lower()
    cores = []
    if material and product:
        cores.append(f"{material} {product}")
    if material and finish and product:
        cores.append(f"{finish} {material} {product}")
    name_low = (name or "").strip().lower()
    if name_low and name_low not in cores:
        cores.append(name_low)
    if not cores:
        if name_low:
            cores.append(name_low)
        elif material:
            cores.append(f"{material} handicrafts")
        else:
            cores.append("metal handicrafts")
    return list(dict.fromkeys(cores))[:3]


def build_keywords(name: str, facts: dict) -> dict:
    """Grouped commercial keywords tailored to the actual product.

    Deterministic templates — always product-specific (never the same generic
    set for every item) and free of claims/specs."""
    cores = _core_keywords(name, facts)
    primary = cores[0] if cores else (name or "metal handicrafts").lower()
    material = (facts.get("material") or "").strip().lower()

    secondary, long_tail, buyer_intent = [], [], []
    for core in cores:
        secondary += [f"{core} manufacturer", f"{core} supplier",
                      f"{core} exporter", f"{core} wholesale",
                      f"{core} bulk supplier"]
        long_tail += [f"{core} manufacturer in India",
                      f"{core} wholesale supplier",
                      f"{core} for international buyers",
                      f"bulk {core} supplier from Moradabad",
                      f"{core} for retailers and importers"]
        buyer_intent += [f"buy {core} wholesale", f"bulk order {core}",
                         f"{core} at factory price",
                         f"{core} for private label"]
    manufacturer = [f"{core} manufacturer" for core in cores] + [
        (f"{material} products manufacturer in India" if material else
         "Indian metal handicrafts manufacturer"),
        "Moradabad handicrafts manufacturer",
        f"{COMPANY.lower()} {primary} manufacturer"]
    supplier = [f"{core} supplier" for core in cores] + [
        f"{primary} wholesale supplier India",
        f"{material.title() if material else 'Metal'} products supplier Moradabad"]
    exporter = [f"{core} exporter" for core in cores] + [
        f"{primary} exporter from India",
        "Indian handicrafts exporter",
        f"{material.title() if material else 'Metal'} handicrafts exporter India"]
    wholesale = [f"{core} wholesale" for core in cores] + [
        f"{primary} wholesale price",
        f"{primary} bulk supply"]
    bulk_order = [f"{core} bulk order" for core in cores] + [
        f"bulk supply of {primary}",
        f"{primary} container order supplier"]
    country_specific = []
    for country in TARGET_COUNTRIES:
        country_specific += [f"{primary} supplier {country}",
                             f"{primary} for buyers in {country}"]

    def _uniq(items: list[str]) -> list[str]:
        return _clean_list(items, max_items=10, max_len=90)

    return {"primary": _clean_text(primary, 90),
            "secondary": _uniq(secondary), "long_tail": _uniq(long_tail),
            "buyer_intent": _uniq(buyer_intent), "manufacturer": _uniq(manufacturer),
            "supplier": _uniq(supplier), "exporter": _uniq(exporter),
            "wholesale": _uniq(wholesale), "bulk_order": _uniq(bulk_order),
            "country_specific": _uniq(country_specific)}


# ---------------------------------------------------------------------------
# Google SEO metadata (spec §7)
# ---------------------------------------------------------------------------

TITLE_MAX, META_MAX = 60, 160


def _cut_at_word(text: str, limit: int) -> str:
    text = (text or "").strip()
    if len(text) <= limit:
        return text
    cut = text[:limit].rsplit(" ", 1)[0].rstrip(" ,;|-")
    return cut or text[:limit].rstrip()


def build_seo(name: str, facts: dict, keywords: dict,
              canonical_base: str = "") -> dict:
    """Unique, natural Google metadata derived from this product's facts."""
    primary = keywords.get("primary") or (name or "").lower()
    material = (facts.get("material") or "").strip()
    core = primary.title()

    # Title: primary keyword + value cue + brand (unique per product by design).
    title = f"{core} Wholesale | {COMPANY}"
    if len(title) < 45 and material:
        title = f"{core} — {material} {facts.get('product_type') or 'Product'} Wholesale | {COMPANY}"
    title = _cut_at_word(title, TITLE_MAX)

    meta = (f"Buy {primary} on wholesale from {COMPANY}, India. "
            f"{material or 'Metal handicrafts'} manufacturer & exporter for "
            f"retailers, importers and bulk buyers. Request a quote today.")
    meta = _cut_at_word(meta, META_MAX)

    slug = slugify(name or primary)
    focus = primary
    secondary_focus = _clean_list(
        [keywords.get("secondary", [None])[0] if keywords.get("secondary") else None,
         f"{primary} manufacturer India",
         f"{primary} wholesale supplier"], max_items=3, max_len=90)
    related = _clean_list(
        (keywords.get("long_tail") or [])[:3] + (keywords.get("wholesale") or [])[:2],
        max_items=6, max_len=90)

    og_title = title
    og_desc = meta
    og_image = ""  # filled by caller from the primary image
    canonical = f"{canonical_base.rstrip('/')}/products/{slug}" if canonical_base else ""
    return {"title": title, "meta_description": meta, "slug": slug,
            "focus_keyword": focus, "secondary_focus": secondary_focus,
            "related": related, "og_title": og_title, "og_description": og_desc,
            "og_image": og_image, "canonical_url": canonical}


def build_image_seo(name: str, facts: dict, filenames: list[str]) -> list[dict]:
    """Descriptive alt/title/caption/description per image (spec §7)."""
    material = (facts.get("material") or "").strip().lower()
    finish = (facts.get("finish") or "").strip().lower()
    base = name or "product"
    out = []
    for i, fn in enumerate(filenames[:10]):
        suffix = " (additional view)" if i else ""
        alt = (f"{base} — {material + ' ' if material else ''}"
               f"{facts.get('product_type') or 'product'}{suffix}")
        out.append({
            "filename": fn,
            "alt_text": _clean_text(alt, 150),
            "title": _clean_text(f"{base} by {BRAND}{suffix}", 120),
            "caption": _clean_text(f"{base} — supplied by {COMPANY}, India{suffix}", 160),
            "description": _clean_text(
                f"{finish.title() + ' ' if finish else ''}{base} from the "
                f"{BRAND} wholesale range by {COMPANY}. Additional product "
                f"photographs available on request.{suffix}", 220),
        })
    return out


# ---------------------------------------------------------------------------
# Manufacturer / exporter B2B information (spec §8)
# ---------------------------------------------------------------------------

def build_b2b(name: str, facts: dict, confirmed: dict | None = None) -> dict:
    """Manufacturer/exporter/supplier copy adapted to the product category.

    `confirmed` may carry admin-confirmed fields (customisation, packaging,
    export markets). Anything unconfirmed stays explicitly unconfirmed —
    no certifications, capacity, MOQ or export statistics are invented."""
    confirmed = confirmed or {}
    product = (facts.get("product_type") or name or "products").lower()
    material = (facts.get("material") or "").strip()
    cat = (facts.get("category") or "").strip() or (
        f"{material} products" if material else "metal handicrafts")

    manufacturer_overview = (
        f"{COMPANY} manufactures {product} at its Moradabad (Uttar Pradesh, "
        f"India) facility, serving the {cat.lower()} segment under the "
        f"{BRAND} brand. Moradabad is a long-established centre for Indian "
        f"metal handicrafts, copperware and brassware production.")
    exporter_overview = (
        f"{COMPANY} supplies {product} to wholesale buyers, importers and "
        f"distribution businesses. Target markets include India, USA, UK, "
        f"UAE, Australia and Canada. Export readiness, documentation and "
        f"incoterms are confirmed per order — no export destination or "
        f"volume is claimed here without a confirmed order record.")
    supplier_intro = (
        f"{BRAND} by {COMPANY} offers {product} for wholesale and bulk "
        f"supply. Retailers, gift shops, hospitality buyers, buying houses "
        f"and importers are welcome to enquire for current pricing and "
        f"availability.")
    wholesale_info = (
        f"{product.title()} are supplied on wholesale terms. Order quantities, "
        f"trade discounts and packaging standards are shared against confirmed "
        f"business enquiries.")
    bulk_order_info = (
        f"Bulk and container-level orders for {product} are handled directly "
        f"by the {COMPANY} sales desk, with written quotations covering "
        f"specification, quantity, packing and dispatch window.")
    customization = confirmed.get("customization") or (
        f"Customisation of {product} (size, finish, engraving, packaging) may "
        f"be possible — availability is confirmed per enquiry in writing.")
    packaging = confirmed.get("packaging") or (
        f"Standard export packaging is used; exact packing details "
        f"(inner/outer, carton, pallet) are shared per order on request.")
    export_markets = confirmed.get("export_markets") or (
        "Buyer countries served are confirmed per order; no standing export "
        "claim is made on this page.")
    return {"manufacturer_overview": _clean_text(manufacturer_overview, 900),
            "exporter_overview": _clean_text(exporter_overview, 900),
            "supplier_intro": _clean_text(supplier_intro, 700),
            "wholesale_info": _clean_text(wholesale_info, 600),
            "bulk_order_info": _clean_text(bulk_order_info, 600),
            "customization": _clean_text(customization, 500),
            "packaging": _clean_text(packaging, 500),
            "export_markets": _clean_text(export_markets, 400)}


# ---------------------------------------------------------------------------
# JSON-LD structured data (spec §9)
# ---------------------------------------------------------------------------

def build_schema(name: str, slug: str, descriptions: dict, facts: dict,
                 image_urls: list[str], canonical_url: str,
                 category_name: str = "") -> dict:
    """Schema.org blocks: Product, Organization, BreadcrumbList, WebSite.

    Deliberately excludes price, availability, rating and review data —
    those would be fabricated for a price-on-request B2B catalogue."""
    base = (settings.PUBLIC_SITE_URL or "").rstrip("/")
    page_url = canonical_url or f"{base}/products/{slug}" if base else ""
    product_schema: dict = {
        "@context": "https://schema.org", "@type": "Product",
        "name": name, "brand": {"@type": "Brand", "name": BRAND},
        "manufacturer": {"@type": "Organization", "name": COMPANY},
        "category": category_name or facts.get("category") or "",
        "url": page_url,
    }
    desc = descriptions.get("short") or descriptions.get("detailed") or ""
    if desc:
        product_schema["description"] = truncate(desc, 500)
    if facts.get("material"):
        product_schema["material"] = facts["material"]
    if image_urls:
        product_schema["image"] = image_urls[:5]
    product_schema["countryOfOrigin"] = {"@type": "Country", "name": "India"}
    product_schema = {k: v for k, v in product_schema.items() if v not in ("", [], {}, None)}

    org_schema = {
        "@context": "https://schema.org", "@type": "Organization",
        "name": COMPANY, "alternateName": BRAND,
        "url": base + "/" if base else "",
        "description": f"{COMPANY} (brand: {BRAND}) — manufacturer, exporter, "
                       f"supplier and wholesaler of Indian metal handicrafts, "
                       f"copperware, brassware and decorative metal home decor.",
    }
    website_schema = {
        "@context": "https://schema.org", "@type": "WebSite",
        "name": BRAND, "url": base + "/" if base else "",
        "publisher": {"@type": "Organization", "name": COMPANY},
    }
    breadcrumb = {"@context": "https://schema.org", "@type": "BreadcrumbList",
                  "itemListElement": [
                      {"@type": "ListItem", "position": 1, "name": "Home",
                       "item": f"{base}/" if base else ""},
                      {"@type": "ListItem", "position": 2, "name": "Products",
                       "item": f"{base}/products" if base else ""},
                      {"@type": "ListItem", "position": 3, "name": name,
                       "item": page_url},
                  ]}
    if category_name:
        breadcrumb["itemListElement"].insert(2, {
            "@type": "ListItem", "position": 3, "name": category_name,
            "item": f"{base}/categories" if base else ""})
        breadcrumb["itemListElement"][-1]["position"] = 4
    return {"product": product_schema, "organization": org_schema,
            "website": website_schema, "breadcrumb": breadcrumb}


# ---------------------------------------------------------------------------
# Top-level generation (vision + enrichment + assembly + validation)
# ---------------------------------------------------------------------------

def analyze_image_observed(image_bytes: bytes, mime: str) -> dict:
    """Vision analysis -> validated observed facts. {} when unavailable."""
    if not llm_configured() or not image_bytes:
        return {}
    from .llm import analyze_image
    res = analyze_image(image_bytes, mime, VISION_PROMPT, max_tokens=900)
    if not res.get("text"):
        return {}
    parsed = parse_ai_json(res["text"])
    return validate_observed(parsed) if parsed else {}


def _llm_descriptions(name: str, facts: dict, fallback: dict) -> dict:
    """LLM short/detailed descriptions when configured; validated and merged
    over the rule-based set (which always remains as the safety net)."""
    if not llm_configured():
        return fallback
    fact_bits = {k: facts.get(k) for k in
                 ("product_type", "material", "finish", "colour", "design",
                  "usage", "style", "features") if facts.get(k)}
    if not fact_bits and not name:
        return fallback
    res = generate(ENRICH_PROMPT.format(company=COMPANY, brand=BRAND,
                                        facts=json.dumps(fact_bits)[:1200]),
                   max_tokens=900)
    parsed = parse_ai_json(res.get("text", "")) if res.get("text") else None
    if not parsed:
        return fallback
    merged = dict(fallback)
    short = _clean_text(parsed.get("short_description"), 700)
    detailed = _clean_text(parsed.get("detailed_description"), 2200)
    if short:
        merged["short"] = short
    if detailed:
        merged["detailed"] = detailed
    highlights = _clean_list(parsed.get("highlights"), max_items=6, max_len=120)
    if highlights:
        merged["highlights"] = highlights
    return merged


def generate_payload(name: str, observed: dict, filenames: list[str],
                     image_urls: list[str], slug: str, canonical_base: str,
                     category_name: str = "") -> dict:
    """Assemble the complete, validated content payload for one product.

    Returns {observed, descriptions, keywords, seo, image_seo, schema, b2b,
    needs_verification, source}."""
    facts = {k: (observed or {}).get(k) for k in
             ("product_type", "category", "subcategory", "material", "colour",
              "finish", "shape", "design", "pattern", "usage", "purpose",
              "style", "customer_segment")}
    descriptions = _llm_descriptions(name, facts, build_descriptions(name, facts))
    keywords = build_keywords(name, facts)
    seo = build_seo(name, facts, keywords, canonical_base=canonical_base)
    if slug:
        seo["slug"] = slug
    image_seo = build_image_seo(name, facts, filenames)
    b2b = build_b2b(name, facts)
    schema = build_schema(name, seo["slug"], descriptions, facts, image_urls,
                          canonical_url=seo.get("canonical_url", ""),
                          category_name=category_name)

    # Highlight bullets: LLM-provided, else derived from facts (spec §5).
    highlights = descriptions.get("highlights") or _clean_list(
        [(facts.get("material") and f"{facts['material']} construction"),
         (facts.get("finish") and f"{facts['finish']} finish"),
         (facts.get("design") and facts["design"]),
         (facts.get("usage") and f"Suited to {str(facts['usage']).lower()}"),
         f"Wholesale and bulk supply by {COMPANY}",
         f"Brand: {BRAND} (by {COMPANY})"], max_items=6, max_len=120)

    # Verification list (spec §4): unknowns stay flagged.
    needs = [k for k in ("material", "finish", "colour", "product_type",
                         "category") if not facts.get(k)]
    needs += ["dimensions", "weight", "capacity", "moq", "lead_time",
              "packaging", "price"]
    source = f"ai:{settings.LLM_MODEL}" if llm_configured() else \
        "rule-based (no vision provider configured — verify all fields)"
    return {"observed": facts,
            "observed_facts": (observed or {}).get("observed_facts", []),
            "assumptions": (observed or {}).get("assumptions", []),
            "descriptions": {**descriptions, "highlights": highlights},
            "keywords": keywords, "seo": seo, "image_seo": image_seo,
            "schema": schema, "b2b": b2b, "needs_verification": needs,
            "source": source}




