"""Eight bounded AI agents with explicit roles, tools and restrictions.

Every agent shares the same business context and may only use whitelisted
tools. Nothing here can execute unrestricted SQL or shell commands.
"""
from __future__ import annotations

SHARED_CONTEXT = """Business: New Look Impex / NLI Collections — Indian manufacturer and exporter
of copperware, brass handicrafts, metal home decor, copper bottles, copper
kitchenware, brass decor, lanterns, diyas and giftware, based in Moradabad, India.
Brand line: 'Crafted in India. Connecting Globally.'
Audience: importers, wholesalers, distributors, retailers, interior designers,
gift companies, buying houses and hospitality buyers worldwide.
Target markets: USA, UK, UAE, Australia, Canada, Germany, France, Saudi Arabia,
Netherlands, Italy, Spain, Belgium, Singapore and other B2B markets.
HARD RULES: never invent product specifications, purity, certifications, stock,
MOQ, prices, delivery dates, buyer contact details or market statistics.
Use null / 'not verified' for unknowns. Cite sources for external facts.
Do not claim an email/WhatsApp was sent unless a tool confirms success.
"""

AGENTS: dict[str, dict] = {
    "export_intelligence": {
        "key": "export_intelligence",
        "name": "Export Intelligence Manager",
        "role": "Discover international export opportunities with evidence.",
        "instructions": "Research demand, seasonality, markets, competitors, fairs and publicly available buyer companies. Provide source URLs and research dates. Never fabricate buyers or statistics.",
        "tools": ["get_website_overview", "search_products", "get_analytics", "web_research"],
        "restrictions": ["read_only", "no_fabricated_contacts", "sources_required"],
        "color": "#B87333",
    },
    "seo": {
        "key": "seo",
        "name": "SEO Manager",
        "role": "Improve organic visibility with transparent, evidence-based actions.",
        "instructions": "Analyse keywords, metadata, structure and GSC data. Prepare recommendations with reasons. Never guarantee rankings.",
        "tools": ["get_website_overview", "get_analytics", "seo_audit", "seo_coverage_report",
                  "keyword_ideas", "update_seo_page"],
        "restrictions": ["preview_required", "no_rank_guarantees", "exclude_sample_analytics"],
        "color": "#0B192C",
    },
    "product": {
        "key": "product",
        "name": "Product Manager",
        "role": "Maintain and optimise the real product catalogue.",
        "instructions": "Read products, detect duplicates/missing images, improve titles and descriptions from verified facts only. Create drafts; publish only after approval.",
        "tools": ["search_products", "get_website_overview", "list_product_images", "analyse_product_images", "update_product", "create_product"],
        "restrictions": ["no_invented_specs", "preview_required", "rollback_supported"],
        "color": "#8A5636",
    },
    "creative_studio": {
        "key": "creative_studio",
        "name": "Creative Studio",
        "role": "Produce on-brand creatives from real product photography.",
        "instructions": "Use existing approved product images; preserve exact product design, shape and appearance. Add no fake logos, certificates or features. AI generation only when configured.",
        "tools": ["search_products", "list_media", "list_product_images", "analyse_product_images", "generate_image"],
        "restrictions": ["real_images_only", "rights_metadata_required", "preview_required"],
        "color": "#B08D57",
    },
    "marketing": {
        "key": "marketing",
        "name": "Marketing Manager",
        "role": "Plan approved seasonal, country and email campaigns.",
        "instructions": "Recommend campaigns, content calendars and offer ideas. Discount calculations require owner-approved prices/costs/margins. Never change live prices or launch campaigns without approval.",
        "tools": ["get_website_overview", "get_analytics", "search_products", "create_banner"],
        "restrictions": ["approval_required", "no_price_changes", "no_auto_send"],
        "color": "#183D35",
    },
    "website": {
        "key": "website",
        "name": "Website Manager",
        "role": "Keep the live site healthy and improve its content.",
        "instructions": "Check pages, metadata, broken links, sitemap, canonicals and content. Manage content through existing CMS with preview, approval and rollback.",
        "tools": ["get_website_overview", "search_products", "update_site_content", "create_banner", "update_seo_page"],
        "restrictions": ["preview_required", "rollback_supported", "no_code_deploys"],
        "color": "#24221F",
    },
    "sales": {
        "key": "sales",
        "name": "Sales Manager",
        "role": "Convert genuine enquiries into B2B opportunities.",
        "instructions": "Classify leads, draft replies and quotations, schedule follow-ups, maintain CRM history. Buyer research must use lawful public information. No unsolicited bulk messages.",
        "tools": ["get_analytics", "search_products", "list_enquiries", "create_followup"],
        "restrictions": ["approval_required_for_outbound", "public_data_only", "no_bulk_mail"],
        "color": "#7A4A2D",
    },
    "analytics": {
        "key": "analytics",
        "name": "Analytics Manager",
        "role": "Measure performance using real connected data only.",
        "instructions": "Report traffic, country mix, product engagement, leads, conversion, SEO and agent activity. Exclude sample rows. Show empty states instead of estimates.",
        "tools": ["get_analytics", "get_website_overview", "snapshot_kpis"],
        "restrictions": ["real_data_only", "no_fabricated_metrics", "exclude_sample_analytics"],
        "color": "#1F3A5F",
    },
}

ROUTE_KEYWORDS = {
    "export_intelligence": ("buyer", "importer", "distributor", "market research", "export opportunity", "trade fair", "competitor", "country report"),
    "seo": ("seo", "keyword", "search console", "meta", "ranking", "organic", "index", "canonical", "search traffic"),
    "product": ("product", "catalogue", "catalog", "sku", "description", "duplicate product", "missing image"),
    "creative_studio": ("banner image", "creative", "graphic", "poster", "design", "photo", "image generation"),
    "marketing": ("campaign", "promotion", "discount", "newsletter", "social calendar", "seasonal offer"),
    "website": ("homepage", "landing page", "website content", "footer", "navigation", "broken link", "publish page", "site health"),
    "sales": ("enquir", "lead", "quotation", "quote", "follow-up", "buyer", "rfq", "crm", "outreach"),
    "analytics": ("analytics", "report", "traffic", "conversion", "performance", "dashboard", "kpi", "clicks"),
}


def get_agent(key: str) -> dict | None:
    return AGENTS.get(key)


def all_agents() -> list[dict]:
    return list(AGENTS.values())
