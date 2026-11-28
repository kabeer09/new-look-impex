# SEO Audit — New Look Impex (www.newlookimpex.store)

> B2B manufacturer/exporter site + NLI Collections B2C brand page + 6 regional
> storefronts. Audit date: November 2026. Data source: live crawl of all sitemap
> URLs (217 at audit time) plus backend API inspection.

## 1. Business & site facts (verified, never invented)

| Item | Value |
| --- | --- |
| Business | New Look Impex (brand: NLI Collections) |
| Location | Moradabad, Uttar Pradesh, India |
| GSTIN | 09AFKPA4462R1ZW |
| Model | RFQ only — no checkout, no listed prices (B2B) |
| Catalogue | 133 published products, 14 public categories |
| Contact | newlookimpex@gmail.com (official public/sales email; newlookimpex130@gmail.com remains the internal admin login only), WhatsApp +91 96900 53913, phones +91 9808588603 |
| Stack | Next.js 14 (Vercel) + FastAPI/PostgreSQL (Render) |

## 2. Critical issues found (all fixed)

| # | Issue | Evidence | Fix commit |
| --- | --- | --- | --- |
| 1 | **28 pages shared the default title + description** (all `/categories/*`, `/customisation`, `/catalogue`, `/request-quote`, `/contact`, `/gifting`, `/brass-collection`, `/copper-collection`, `/metal-home-decor`, `/urlis`, `/diyas-lanterns`) | Crawl: 28× `New Look Impex — Brass & Copper Handicrafts Wholesale \| Moradabad` | `3e9d850` |
| 2 | **5 duplicate regional pairs** — `/wholesale/<country>` duplicated `/usa`, `/uk`, `/uae`, `/canada`, `/europe` with identical titles, and `/wholesale/*` pages rendered debug text ("Slug: usa") instead of page content | Crawl + HTML inspection | `33a8b21` |
| 3 | **3 soft-404 URLs in sitemap** — `/categories/brass-handicrafts`, `/categories/copper-handicrafts`, `/categories/metal-home-decor` were listed in sitemap but the API 404s them | `sitemap.xml` vs `GET /api/public/categories/*` | `3e9d850` |
| 4 | **Homepage had no keyword H1** — H1 was "Elevate Every Interior. Timeless Copper & Brass Masterpieces." | HTML | `8698ea4` |
| 5 | **Homepage sold to consumers, not buyers** — Autumn Sale ticker, "FLAT 25% OFF", discount popup, fake "✓ Verified order" toasts, "Free shipping above $5,000" (contradicted the shipping policy) | HTML | `8698ea4` |
| 6 | **Category/product links not crawlable** — homepage grids rendered client-side only (0 links in prerendered HTML) | `.next/server/app/index.html` | `8698ea4` |
| 7 | **FAQPage schema ≠ visible FAQ** — 5 schema Q&As vs 8 visible | HTML | `e4efc40` |
| 8 | **`/au` page rendered empty** — passed `slug="australia"` to `CountryPage`, but the config key is `au`; page had no H1 or content | Live HTML: 0 `<h1>` | `33a8b21` |
| 9 | **Brand name doubled in titles** — `/about` → "About New Look Impex \| New Look Impex"; `/export` → "…\| New Look Impex \| New Look Impex" | Crawl | `3e9d850` |
| 10 | **Category pages had no crawlable content** — all copy, H1 and products were JavaScript-loaded | Live HTML | `4ccaf14` |

## 3. Technical baseline (verified post-fix)

| Check | Status |
| --- | --- |
| Unique titles across every sitemap URL | ✅ 208 URLs, 0 duplicate title groups (full crawl) |
| Unique meta descriptions on all priority pages | ✅ |
| Canonicals | ✅ self-canonical on indexable pages; `/wholesale/*` → short URL |
| Indexing directives | ✅ hidden category slugs `noindex, follow`; `/wholesale/*` `noindex, follow` |
| XML sitemap | ✅ `/sitemap.xml` — excludes hidden categories and `/wholesale/*` duplicates; 208 URLs |
| robots.txt | ✅ spec-valid, references llms.txt as comment (`d54d3ea`) |
| HTTP → HTTPS + www canonical host | ✅ sitemap normalises every URL to `https://www.newlookimpex.store` |
| Open Graph + Twitter cards | ✅ on homepage, brand page, category, regional and product pages |
| Structured data | ✅ Organization, WebSite, LocalBusiness/Manufacturer (homepage), FAQPage, BreadcrumbList, Product+Offer (product pages) — all parse as valid JSON |
| Hreflang | ✅ reciprocal 6-page cluster on regional pages only (`71bd99c`) |
| Redirects | ✅ product slug renames auto-create 308s via PATCH endpoints |
| Lighthouse SEO | ✅ 1.0 (measured earlier; re-check after deploy) |

## 4. Homepage (Priority 1) — before → after

| Element | Before | After |
| --- | --- | --- |
| Title (106 ch) | Brass & Copper Products Manufacturer, Exporter & Wholesale Supplier in Moradabad, India \| New Look Impex | **Brass & Copper Handicraft Manufacturer in Moradabad, India \| New Look Impex** (75 ch) |
| Meta description | 304 ch keyword-stuffed | 160 ch |
| H1 | Elevate Every Interior… (no keyword) | Brass & Copper Handicraft Manufacturer and Exporter in Moradabad, India |
| Sale messaging | Autumn Sale, 25% OFF, popup, fake toasts | removed — B2B trade ticker |
| SSR links | 0 category / 0 product | 12 category + 92 product links in HTML |
| FAQ schema | 5 Q&As (drifted) | 8 Q&As, generated from shared `home-faq.ts` |

## 5. NLI Collections B2C page (`/nli-collections`) — before → after

| Element | Before | After |
| --- | --- | --- |
| Title | New Look Impex — Brass & Copper Handicrafts Wholesale \| Moradabad | **NLI Collections \| Premium Brass, Copper & Home Décor** (56 ch) |
| H1 | NLI Collections (bare) | NLI Collections — Handcrafted Brass & Copper for Beautiful Homes |
| Hero CTAs | 3 links to soft-404 collections | 4 links to real, API-verified collections |
| MOQ badge | "MOQ applies" on cards | removed |
| Footer | "Wholesale enquiries only" | path-aware: consumer CTA + "Crafted in Moradabad, India \| By New Look Impex" |
| Schema | Organization | Organization + BreadcrumbList + FAQPage |

## 6. Known limitations / manual follow-up

1. **Google Search Console** — prep complete (HTML verification file
   `google34d4c8e34e2e9884.html` serves 200; robots.txt declares the sitemap;
   sitemap verified at 208 URLs). Adding the property and submitting the
   sitemap happens in the owner's GSC UI — **not claimed as done**. Track
   afterwards: impressions, clicks, queries, avg. position, indexed pages,
   country split.
2. **GA4** — the two GTM containers were removed (both returned 404 and loaded
   ~182 KB of unused JS). The root layout now loads `gtag.js` directly with
   `G-0DP6C543VP` (override via `NEXT_PUBLIC_GA4_MEASUREMENT_ID`). Confirm
   real-time data receipt in the GA4 UI; no analytics claim is made here.
3. **Test suite** — local backend pytest has pre-existing failures unrelated to
   SEO work (`app.auth._hits` removed but referenced by old fixtures; missing
   source images in `tests/` for the image-catalogue fixture). Sitemap/category
   behaviour verified with a dedicated 13-check script instead (all pass).
4. **Keyword volumes** — no volume tool was available; keyword priorities in
   `KEYWORD_MAPPING.md` are intent-based, not volume-validated.
5. **Core Web Vitals** — measure in PageSpeed Insights / GSC after deploy; no
   claims made here.
6. **Manufacturing evidence** — process copy and the four genuine registration/
   industry logos are live on `/about` (`5e3b340`); workshop photography and
   video must come from the owner (cannot be fabricated).
7. **Post-audit fix** — Organization schema referenced a 404 `/logo.png`;
   corrected to `/logo-newlookimpex.jpg` (200) in `65a7bcf`, along with removal
   of unverified `factory-direct` / `food-safe` claims site-wide.

## 7. Follow-up gap closure (November 26, 2026)

Code audit re-checked the docs against the live source and closed these gaps:

| Gap found | Fix |
| --- | --- |
| Homepage keyword H1 existed only in docs — the hero fell back to the brand line | `HomeClient.tsx` fallback now uses the documented manufacturer/exporter H1 (admin edits still win) |
| Sale bar + discount popup mounted globally on the B2B site | `SalesPromoGate` renders them only on `/nli-collections` and `/collections/*`; unused hard-coded "20% off" banner removed |
| NLI brand-pin products were client-fetched (no product links in first HTML) | `/nli-collections/page.tsx` now server-fetches 16 pins; product names/images/links are crawlable |
| Organization JSON-LD duplicated with divergent phone/logo fields | single shared `lib/seo/structured-data.ts` used by root layout + homepage; unverified employee-count claim removed |
| Root metadata emitted a site-wide hreflang cluster with `x-default` | removed; only the reciprocal market clusters emit hreflang, matching the international strategy |
| Dedicated leaf landing pages rendered FAQs without FAQPage/BreadcrumbList schema | both schemas generated from the visible copy in `DedicatedCategoryPage.tsx` |
| `/shop` redirect-only route had no metadata | `noindex, nofollow` added |
| Agent SEO work had no grounded coverage tool | `seo_coverage_report` added to the SEO agent (real DB counts only, no rankings/traffic estimates) |

Remaining owner-side items are unchanged: GSC property/submission, GA4 data
confirmation, keyword-volume validation, genuine factory media, backlinks.
