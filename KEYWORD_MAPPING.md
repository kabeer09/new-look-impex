# Keyword Mapping — New Look Impex

> Every important page: URL → search intent → primary/secondary keywords →
> implemented SEO title, meta description, H1 → internal links → status.
> Keyword priorities are **intent-based** (no volume tool was available);
> validate volumes in Google Search Console / Keyword Planner before
> re-prioritising.

## 1. Homepage (B2B — Priority 1) ✅ live

| Field | Value |
| --- | --- |
| URL | `/` |
| Intent | B2B: find a brass/copper handicraft **manufacturer/exporter in Moradabad** for bulk buying |
| Primary keyword | brass and copper handicraft manufacturer in India |
| Secondary | Moradabad handicraft manufacturer · brass handicraft exporter from India · copper products manufacturer in India · metal handicraft exporter in India · brass and copper wholesale supplier · Indian handicraft manufacturer and exporter · brass home décor manufacturer · copper kitchenware wholesale supplier · Moradabad brass handicraft exporter |
| SEO title | `Brass & Copper Handicraft Manufacturer in Moradabad, India \| New Look Impex` (75 ch, absolute — bypasses the site template so brand appears once) |
| Meta description | `New Look Impex manufactures and exports brass handicrafts, copper bottles, kitchenware and metal home décor from Moradabad, India. Wholesale and bulk enquiries.` (160 ch) |
| H1 | `Brass & Copper Handicraft Manufacturer and Exporter in Moradabad, India` (single H1) |
| H2s | Our Manufacturing & Product Categories · featured range · showcase · trade process · FAQ sections |
| Internal links | 12 category + 92 product links **in prerendered HTML**; RFQ CTA |
| Schema | Organization, Manufacturer/WholesaleStore/LocalBusiness, WebSite, FAQPage (8 Q&As = visible FAQ) |
| Status | ✅ `8698ea4`, `e4efc40` |

## 2. NLI Collections brand page (B2C) ✅ live

| Field | Value |
| --- | --- |
| URL | `/nli-collections` |
| Intent | B2C: shop **handcrafted brass/copper home décor** from an Indian brand |
| Primary keywords | handcrafted brass home décor · copper home décor · brass decorative items |
| Secondary | brass tableware · copper bottles · brass serveware · handmade brass gifts · brass pooja items · luxury metal home décor |
| SEO title | `NLI Collections \| Premium Brass, Copper & Home Décor` (56 ch, absolute) |
| Meta description | `Discover handcrafted brass and copper home décor by NLI Collections. Elegant metal tableware, copper bottles and brass serveware from Moradabad, India.` |
| H1 | `NLI Collections — Handcrafted Brass & Copper for Beautiful Homes` |
| Internal links | 4 real collection CTAs (`/collections/*`), `/contact`; footer consumer CTA path-aware |
| Schema | Organization, BreadcrumbList, FAQPage (6 Q&As) — **no Product schema on a brand page** |
| Status | ✅ `6ae1f25` |

## 3. Product category pages ✅ live (17 slugs)

All under `/categories/<slug>` — dynamic `generateMetadata`, unique hand-written
titles (admin `seo_title`/`seo_description` override when set), server-rendered
editorial + FAQ + breadcrumbs + product links (`4ccaf14`).

| Slug | Primary keyword target | SEO title (base, template appends ` \| New Look Impex`) |
| --- | --- | --- |
| copper-bottles | copper bottle manufacturer India | Copper Bottles Manufacturer & Wholesale Supplier |
| copper-jugs-pitchers | copper jugs wholesale supplier | Copper Jugs & Pitchers — Manufacturer & Supplier |
| copper-mugs-tumblers | copper mugs wholesale | Copper Mugs & Tumblers — Wholesale Manufacturer |
| copper-kitchenware | copper cookware manufacturer | Copper Kitchenware Manufacturer & Exporter |
| brass-kitchenware | brass kitchenware manufacturer | Brass Kitchenware Manufacturer & Exporter |
| brass-urlis | brass urli manufacturer | Brass Urlis Manufacturer & Wholesale Supplier |
| copper-urlis | copper urli wholesale | Copper Urlis — Manufacturer & Wholesale Supplier |
| brass-diyas | brass diya manufacturer India | Brass Diyas Manufacturer & Bulk Supplier |
| metal-diyas | metal diya wholesale | Metal Diyas Manufacturer & Wholesale Supplier |
| brass-lanterns | brass lantern manufacturer | Brass Lanterns Manufacturer & Exporter |
| decorative-bowls | decorative brass bowls wholesale | Decorative Brass & Metal Bowls — Wholesale |
| festival-decor | festival décor wholesale | Festival Décor Manufacturer & Wholesale Supplier |
| corporate-gifting | brass corporate gifts | Corporate Gifting — Brass & Copper Gift Supplier |
| custom-bulk-orders | custom metal handicraft OEM | Custom Bulk Orders & OEM Metal Manufacturing |
| brass-handicrafts | brass handicraft manufacturer India | (noindex — served by `/brass-handicrafts`) |
| copper-handicrafts | copper handicraft manufacturer | (noindex — served by dedicated pages) |
| metal-home-decor | metal home décor manufacturer | (noindex — served by `/metal-home-decor`) |

Dedicated category landing pages with their own unique metadata:
`/brass-collection`, `/copper-collection`, `/metal-home-decor`,
`/diyas-lanterns`, `/gifting`, `/urlis`, `/brass-handicrafts`,
`/brass-urli`, `/brass-diya`, `/brass-lanterns`, `/brass-home-decor`,
`/copper-bottles`, `/copper-kitchenware`, `/copper-water-bottles-wholesale`.

## 4. Service / conversion pages ✅ live

| URL | Primary keyword | SEO title |
| --- | --- | --- |
| `/request-quote` | wholesale quote brass copper | Request a Wholesale Quote — Brass & Copper RFQ |
| `/customisation` | custom OEM metal manufacturing | Custom Manufacturing & OEM — Bespoke Metalware |
| `/catalogue` | product catalogue brass copper | Download Product Catalogue — Brass & Copper |
| `/contact` | contact brass manufacturer Moradabad | Contact — Wholesale & Export Enquiries, Moradabad |
| `/categories` | brass copper product categories | Brass & Copper Product Categories — Wholesale |
| `/about` | brass copper manufacturer Moradabad (about) | About Us — Brass & Copper Manufacturer, Moradabad |
| `/export` | copper brass exporter India | Export — Copper & Brass Handicrafts from India |

## 5. Regional market pages ✅ live (B2B + retail intent, hreflang cluster)

| URL | Market | Primary keywords (from strategy Phase 5) | hreflang |
| --- | --- | --- | --- |
| `/usa` | USA | Indian brass handicraft manufacturer · wholesale copper bottles from India · brass home décor supplier India | en-us |
| `/uk` | UK | brass handicrafts wholesale supplier · Indian copper kitchenware supplier | en-gb |
| `/uae` | UAE | brass home décor wholesale supplier · copper bottles bulk supplier | en-ae |
| `/au` | Australia | Indian brass handicraft supplier · copper kitchenware wholesale | en-au |
| `/canada` | Canada | brass home décor supplier · copper drinkware wholesale | en-ca |
| `/europe` | Europe | brass decorative products manufacturer India · copper kitchenware supplier India | en-eu |

- Titles: `<Market> Wholesale Copper & Brassware … | New Look Impex` (from shared config).
- `/wholesale/<country>` duplicates: render identical content, `noindex, follow`,
  canonical → short URL, **absent from sitemap** (`33a8b21`).

## 6. Blog / topical authority (Phase 9 seed) ⚠️ review pending

Sitemap-listed articles (all live): `/blog/copper-vs-brass-homeware`,
`/blog/wholesale-ordering-checklist`, `/blog/seasonal-gifting-programme`,
`/blog/copper-bottles-wholesale-guide`, `/blog/copper-kitchenware-sourcing-india`,
`/blog/brass-handicrafts-moradabad-buyer-guide`, `/blog/brass-home-decor-retail-guide`,
`/blog/brass-lanterns-wholesale-guide`, `/blog/private-label-copper-brass-products`,
`/blog/questions-ask-indian-handicrafts-exporter`.

Each should map to one strategy article (sourcing guides, buyer guides, OEM) with
internal links to the category above. Depth/quality review is the next content
increment.

## 7. Product pages (133) ✅ Phase 1 product SEO

- Per-product SEO titles/descriptions/alt text improved via admin PATCH
  endpoints (`d14d13a`, `1f2db3c`).
- Product + Offer JSON-LD only where price/availability are genuine (RFQ site:
  most products intentionally show "price on request" semantics — no fake prices).
- Slug renames auto-create 308 redirects.
- Ongoing: use GSC query data to refine per-product titles as impressions appear.

## 8. What still needs owner action

1. GSC property + sitemap submission (needs owner verification).
2. GA4 property ID.
3. Validate keyword volumes (Keyword Planner / GSC) before re-ranking priorities.
4. Directory/trade-association listings (Priority 5 — real listings only).
5. Genuine factory photos/video for manufacturing credibility sections.
