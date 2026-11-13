# International SEO Strategy — New Look Impex

> Target markets: USA, UK, UAE, Australia, Canada, Europe.
> Objective: appear in international buyers' searches for Indian brass/copper
> handicraft manufacturers, wholesale suppliers and exporters — without
> doorway pages, duplicate country content or B2C/B2B intent mixing.

## 1. Market architecture (two channels, one domain)

| Layer | URLs | Audience | Role |
| --- | --- | --- | --- |
| Global B2B | `/`, `/about`, `/export`, `/categories/*`, `/products/*` | International importers, retailers, distributors | Manufacturer/exporter authority — targets "manufacturer in India / Moradabad" head terms |
| Market pages | `/usa`, `/uk`, `/uae`, `/au`, `/canada`, `/europe` | Buyers searching with a market lens | Market-specific copy, buyer bullets, FAQs, category emphasis + local spelling |
| Market duplicates | `/wholesale/<country>` | same as above | Render identical content, `noindex, follow`, canonical → short URL (consolidation, not competition) |
| B2C brand | `/nli-collections` | Individual consumers | Separate keyword set (handcrafted brass home décor etc.) — deliberately **outside** the export cluster |

This follows the strategy's final recommendation: main domain = authoritative
B2B manufacturer/exporter site; regional pages keep their separate positioning;
NLI Collections carries consumer intent so the two never fight for the same query.

## 2. hreflang implementation (`71bd99c`)

Reciprocal cluster declared in `regional-meta.ts` → `REGIONAL_LANGUAGES`,
emitted by Next.js on all six market pages:

| hreflang | URL |
| --- | --- |
| `en-us` | `https://www.newlookimpex.store/usa` |
| `en-gb` | `https://www.newlookimpex.store/uk` |
| `en-ae` | `https://www.newlookimpex.store/uae` |
| `en-au` | `https://www.newlookimpex.store/au` |
| `en-ca` | `https://www.newlookimpex.store/canada` |
| `en-eu` | `https://www.newlookimpex.store/europe` |

Design decisions:

- **Fully reciprocal** — every page in the set lists all six alternates including
  itself (Google requirement). Verified live: 6 tags per page (`verify_hreflang.py`).
- **No `x-default`** — deliberate. The cluster is market pages only; an x-default
  would pull the global B2B homepage into a consumer/market cluster it doesn't
  match. Revisit only if a genuine "rest of world" equivalent page exists.
- **Homepage and `/nli-collections` excluded** — different content and audience;
  hreflang on non-equivalent pages is treated as a hint violation.
- **`/wholesale/*` excluded** — noindexed duplicates, not indexable alternates.
- Emitted as `<link rel="alternate" hrefLang="…">` in the real `<head>`; HTML
  attribute names are case-insensitive, parsers normalize `hrefLang` → `hreflang`
  (verified: tags sit at positions 2443–2934, inside `<head>`, not in RSC payload).

## 3. Market-specific keyword targets (Phase 5 mapping)

Each market page's copy and metadata targets its assigned cluster — naturally
in headings, intro paragraphs, bullets and FAQs (never stuffed):

| Market | hreflang | Target keywords (strategy Phase 5) |
| --- | --- | --- |
| USA | `en-us` | Indian brass handicraft manufacturer · wholesale copper bottles from India · brass home décor supplier India · metal décor wholesale exporter |
| UK | `en-gb` | brass handicrafts wholesale supplier · Indian copper kitchenware supplier · brass decorative items manufacturer · Indian metal home décor exporter |
| UAE | `en-ae` | brass home décor wholesale supplier · copper bottles bulk supplier · Indian handicraft exporter UAE · brass lantern manufacturer |
| Australia | `en-au` | Indian brass handicraft supplier · copper kitchenware wholesale · metal home décor importer supplier |
| Canada | `en-ca` | brass home décor supplier · copper drinkware wholesale · Indian handicraft manufacturer |
| Europe | `en-eu` | brass decorative products manufacturer India · metal home accessories exporter · copper kitchenware supplier India · sustainable handcrafted metal décor |

English spelling variants respected: *decor* in US-facing copy, *décor* /
*home accessories* elsewhere. No search volumes were available — these are
intent-based targets to validate in GSC per-country reporting.

## 4. Anti-doorway safeguards

The strategy explicitly forbids country-name-swap pages. Each regional page
carries genuinely market-specific content from the shared `country-data.ts`:

- Unique H1 (market named) and meta description.
- 2+ market-specific intro paragraphs.
- Market-specific buyer bullets (trade terminology, buyer concerns).
- Market-specific FAQ set (each market's Q&As differ).
- Market-specific category emphasis (which ranges suit that market).
- Server-rendered product list filtered to that market's categories (36 crawlable
  product links in HTML per page — `01f5e48`).

Same content also powers the noindexed `/wholesale/*` twins, so there is exactly
one content source per market — no drift possible.

## 5. What is intentionally NOT internationalized

| Page | Reason |
| --- | --- |
| `/` (B2B homepage) | Global manufacturer/exporter positioning — targets geography-neutral head terms; market pages link into it |
| `/nli-collections` | B2C brand page, different audience; adding hreflang would conflate B2B and B2C intents |
| `/categories/*`, `/products/*` | Single global catalogue; RFQ model prices per order, no currency localization claimed |
| Currency/shipping localization | **Not claimed** — shipping is quoted per order per `/shipping-export`; no localized pricing exists to expose |

## 6. International targeting signals

- **Canonical host**: every URL normalized to `https://www.newlookimpex.store`
  (www + HTTPS) in sitemap and canonicals — consistent geo/hub signal.
- **ccTLDs**: none used (single .store domain) — hreflang carries the market
  targeting instead of subfolders/domains.
- **Google Search Console**: geo-targeting and per-country performance reports
  require owner property — **pending manual action**, not claimed as done.
- **Open Graph locale**: market pages carry market-named titles/URLs in OG tags.

## 7. Verification status

| Check | Script | Result |
| --- | --- | --- |
| 6 hreflang tags reciprocal on all 6 market pages | `verify_hreflang.py` | ✅ ALL PASS |
| 0 hreflang on `/`, `/nli-collections`, `/about` | `verify_hreflang.py` | ✅ ALL PASS |
| Market pages indexable, self-canonical, H1, FAQ+breadcrumb schema, 36 SSR product links | `verify_regional2.py` | ✅ ALL PASS |
| `/wholesale/*` noindex + canonical to short URL | `verify_regional2.py` | ✅ ALL PASS |
| `/wholesale/*` absent from sitemap | `verify_p2.py` | ✅ PASS |

## 8. Owner actions remaining

1. Verify GSC property; submit `sitemap.xml`; watch per-country impressions/clicks.
2. Confirm market priorities (e.g. USA vs UAE first) once query data arrives —
   then deepen the winning markets' pages with genuine market detail.
3. Validate keyword volumes in Keyword Planner before re-ranking the table in §3.
4. Backlink/directory work per market (Priority 5) — real listings only.
