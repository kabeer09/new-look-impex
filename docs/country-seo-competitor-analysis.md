# Country Page SEO — Competitor Analysis & Action Plan

> Research date: 21 Nov 2026. Method: live web search of public titles/snippets
> for B2B brass/copper handicraft queries in priority markets. No search volumes
> were available; keyword priorities are intent-based, not volume-ranked. No
> competitor copy, branding or images were reused.

## 1. What competitors are doing (observed)

| Market | Competitors found | Their SEO pattern |
| --- | --- | --- |
| USA | brasshandicraftsindia.com, razviexports.com, paragonmetal.com, yazati.com | "Brass Handicrafts Exporter / Manufacturer from India" in title; explicit B2B wording ("for B2B", "wholesalers, importers, retailers"); product-family terms (statues, decor, lamps); lists served regions in copy |
| UK | indianartvilla.com, king-international.com, globalvisionexport.com, rawsomeshack.in | Product-family pages ("copper bottles, jugs & brassware", "copper kitchenware"); country lists in copy (USA, UK, UAE, Canada, Australia); MOQ / capacity shown as trust signals |
| Germany | asianexportex.com/germany, asmetalcrafts.com/export/germany, indique.in/indian-handicrafts-germany.html, laxmicraftintl.com/export | Dedicated country URL per market; title = "Home Decor & Handicrafts Wholesaler and Exporter in Germany"; private label / OEM / custom finishes called out; in-house production chain described |
| UAE / Middle East | ifrahandicrafts.com, aahilinternational.com/metal-lantern, copperkingindia.com, lanterns.duqaa.com | Product-specific terms (brass lanterns, copper bottles, chafing dishes); "ISO certified", "MOQ 100 units", "15+ countries" as trust signals; gifting/hospitality positioning |

## 2. Patterns worth adopting (structure only)

- **Dedicated country URL** — already in place: `/usa`, `/uk`, `/uae`, `/au`, `/canada`, `/saudi-arabia`, `/japan`, `/singapore`, `/europe/<country>`.
- **Country + role in title/H1** — already in place on all 19 country pages.
- **Product-family keyword in H1** — partial gap. Competitors use "brass handicrafts", "copper bottles", "lanterns" in H1. Ours often say "Wholesale Copper & Brassware Manufacturer — USA Exporter" (generic). Next refinement: inject the market's leading product family into the H1 where honest (e.g. USA → "Brass Décor & Copperware", UAE → "Brass Lanterns & Copperware").
- **Buyer-type terms** — covered: wholesale, manufacturer, exporter, supplier, bulk, private label appears in FAQs. Could surface "private label" in meta descriptions for retail-buyer markets.
- **Country lists in copy** — deliberately avoided; one country per page is stronger for relevance and avoids doorway-page signals.

## 3. Claims deliberately NOT copied

Competitors use "#1", "leading", "ISO certified", "100% pure", "food-safe", fixed MOQs and delivery times. These are unverifiable or banned by the project's honesty rules (see `COMPETITOR_ANALYSIS.md` §5 and `backfill_draft_seo.py`). We do not fabricate them.

## 4. Fixes applied (21 Nov 2026)

| Issue found in audit | Fix |
| --- | --- |
| hreflang clusters were not fully reciprocal — the 8-market cluster pointed to `/europe`, but `/europe` declares the 12-tag Europe cluster | Removed `en-eu` from `REGIONAL_LANGUAGES`; two clean reciprocal clusters (8 short markets / 12 Europe including hub) |
| Meta descriptions were `intro[0].slice(0,155)` — often cut mid-word and read nearly identically across markets | Shared `lib/country-seo.ts` builds a unique description from each page's own H1 + first market-specific bullet, cut at a word boundary |
| Country pages had Organization / BreadcrumbList / FAQPage schema but no market signal | Added `WebPage` schema with `areaServed: Country` and `about` to all 19 country pages |
| Short regional pages had no in-content links to other markets (only footer) | Added an "Other markets we serve" section linking all 18 peer country pages from every short regional page |
| Sitemap | Already lists all 20 regional URLs (8 short + hub + 11 Europe); verified after the country pages were added |

## 5. Google Search Console — action required by owner

The app has Search Console OAuth/sync code, but no GSC credentials are configured in this environment, so **nothing was submitted or verified on your behalf**.

1. Verify `https://www.newlookimpex.store` in GSC (domain property preferred).
2. Submit `https://www.newlookimpex.store/sitemap.xml`.
3. After 2–4 weeks, review **Performance → Countries** and the query report filtered by page path (`/usa`, `/europe/germany`, …).
4. Record which markets gain impressions; deepen only the winning pages with genuine local detail (buyer terms, trade-show/market notes you can verify).
5. Re-check the hreflang report in GSC — it should show 8 tags on short pages and 12 on Europe pages, with no "missing return tag" errors.

## 6. Measurement plan (no invented targets)

| Signal | Source | Cadence |
| --- | --- | --- |
| Pages indexed per country path | GSC Coverage / Indexing | Monthly |
| Impressions & clicks by country | GSC Performance → Countries | Monthly |
| Queries containing market name + "manufacturer / supplier / exporter" | GSC query filter | Monthly |
| hreflang errors | GSC International Targeting / manual tag check | After deploy |
| Sitemap URLs discovered | GSC Sitemaps report | After submit |

## 7. Limitations

- No keyword volumes; all targets are intent-based from competitor title patterns.
- Competitor snippets are a point-in-time observation, not a full backlink/technical audit.
- Ranking improvements depend on crawl time, content depth, site authority and GSC verification — none can be guaranteed.
