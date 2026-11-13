# Technical SEO Report — New Look Impex

Stack: Next.js 14 App Router (Vercel) · FastAPI + PostgreSQL (Render) ·
middleware (host/redirect handling) · no CDN-level rewrites beyond Vercel defaults.

## 1. Crawlability & indexability

| Item | Finding | Action taken |
| --- | --- | --- |
| Essential content in HTML | Homepage grids, category pages and regional product lists were JavaScript-loaded → empty HTML for crawlers | Server-side fetch + pass-as-props: homepage (`8698ea4`), categories (`4ccaf14`), regional (`01f5e48`) |
| Soft 404s in sitemap | 3 category URLs 404 at the API but were advertised in sitemap | Shared `HIDDEN_CATEGORIES` constant used by list endpoint, detail endpoint and sitemap (`3e9d850`) — 13-check verification script: ALL PASS |
| Duplicate regional URLs | `/wholesale/<country>` duplicated `/usa` etc. | Full content + canonical → short URL + `noindex, follow` + removed from sitemap (`33a8b21`) |
| Empty page | `/au` had no H1/content (slug mismatch `australia` vs `au`) | Fixed (`33a8b21`) |
| Unknown category slugs | 404-state pages could be indexed | `robots: noindex, follow` in `generateMetadata` |
| robots.txt | Valid; llms.txt referenced as comment | `d54d3ea` |
| HTTP→HTTPS + www | Sitemap normalises every URL to `https://www.newlookimpex.store` (legacy vercel host re-pointed, dead legacy paths dropped) | pre-existing, verified |

## 2. Titles, descriptions, canonicals

- **Full 217-URL crawl** found 28 pages sharing the default title/description
  and 5 duplicate regional pairs → all fixed (`3e9d850`, `33a8b21`).
- **Post-fix crawl: 208 URLs, 0 duplicate titles, 0 missing descriptions,
  0 brand-doubled titles, all canonicals correct.**
- Title mechanics: `(public)/layout.tsx` uses `title.template: "%s | New Look Impex"`;
  homepage & `/nli-collections` use `title.absolute` so brand appears once.
  Category titles ≤ 52 chars base + template suffix ≤ ~70 chars.
- Admin `seo_title`/`seo_description` (PATCH/API) always override code defaults.

## 3. Structured data (all JSON parses valid)

| Schema | Where | Notes |
| --- | --- | --- |
| Organization | homepage, `/nli-collections`, regional pages | verified business facts only |
| LocalBusiness / Manufacturer / WholesaleStore | homepage | GSTIN, Moradabad location |
| WebSite | homepage | |
| FAQPage | homepage (8), `/nli-collections` (6), categories (3 each), regional (per-market FAQs) | **generated from the same source as visible copy** — can never drift |
| BreadcrumbList | categories, products, regional, NLI brand | visible breadcrumb nav added alongside |
| Product + Offer | product detail pages | only with genuine price/availability; RFQ products omit price rather than invent it |
| Merchant feed | `/merchant/products.xml` | `e50b408` |

Explicitly NOT used: AggregateRating, reviews, awards, certifications,
shipping guarantees — no genuine data exists.

## 4. Sitemap

- Source: `backend/app/main.py` `/sitemap.xml` (dynamic from DB + static list).
- Contains: 133 published products, 14 categories (hidden excluded),
  collections, ~40 static/regional/blog pages, 6 regional short URLs.
- Excludes: hidden categories, `/wholesale/*` duplicates, drafts, legacy dead paths.
- Frontend also exposes `/sitemap` (HTML index page for users).
- Verified live: excludes the 3 soft-404s, includes products/categories/RFQ (`p2_verify2.txt`).

## 5. Redirects

- Product slug renames → automatic 308 via PATCH endpoints (`d14d13a`).
- Sitemap URL normalisation re-points legacy host URLs.
- No URL was changed in this SEO project without a redirect/canonical plan —
  regional duplicates were canonicalised rather than deleted.

## 6. Headings & content structure

| Page | H1 count | Hierarchy notes |
| --- | --- | --- |
| Homepage | 1 | keyword H1; H2s: categories, featured, showcase, process, FAQ |
| Categories | 1 | hero H1 + editorial H2 + FAQ H2/dl + related H2 |
| Regional | 1 | hero H1 + products H2 + buyer questions H2 |
| NLI brand | 1 | hero H1 + 8 H2 sections |
| Product | 1 | (pre-existing) |

Duplicate H2s on homepage fixed (`e4efc40`). Superlatives/fake claims removed.

## 7. Images

- Descriptive `alt` text on category hero, product images (Phase 1 PATCH pass
  improved alt text per product).
- Filenames: product images retained as imported (renaming 133+ files would
  break existing URLs — deferred; alt text carries the semantics).
- Lazy loading: below-fold `loading="lazy"` (native) on grid images; hero images eager.
- Modern formats/compression: images served as originally uploaded via media
  store; no bulk re-encode performed (risk to existing URLs) — recommend
  owner-side WebP/AVIF pass as an enhancement, not a blocker.
- `<img>` (not `next/image`) used for API-hosted media to avoid unconfigured
  remote patterns; dimensions reserved via aspect-ratio classes (CLS control).

## 8. Performance / Core Web Vitals

- Homepage first-load JS reduced ~13k chars by removing sale machinery (`8698ea4`).
- Prerendered homepage HTML (270 KB) contains real content — no client fetch before paint.
- ISR: homepage 60 s, categories/regional 300 s, category metadata fetch 3600 s.
- ⚠️ **Measure CWV in PageSpeed Insights/GSC after this deploy** — no numbers claimed here.

## 9. Mobile & accessibility (SEO-adjacent)

- Existing responsive layout preserved (no redesign per project rules).
- Breadcrumb `aria-label`, `aria-hidden` decorations, single-H1 discipline,
  semantic headings retained.

## 10. Verification tooling (repeatable)

| Script (in `%LOCALAPPDATA%\Temp\opencode`) | Purpose |
| --- | --- |
| `audit_titles.py` | full sitemap crawl → duplicate title/description report |
| `verify_p2.py` | 28-page uniqueness, brand doubling, noindex slugs, canonicals, sitemap scope, full-sweep uniqueness |
| `verify_sitemap_change.py` | 13 checks: hidden categories excluded from sitemap/list/detail, visible included, drafts excluded, products/collections still listed |
| `verify_regional2.py` | 6 regional pages: schema, product links in HTML, FAQ, no debug text; `/wholesale/*` canonical/noindex; homepage B2B integrity |
| `verify_hreflang.py` | reciprocal hreflang on 6 regional pages; 0 hreflang on B2B/NLI pages |
| `verify_cats.py` / `verify_cats2.py` | category pages: editorial, FAQ schema, breadcrumbs, crawlable product links, banned-claim scan |

## 11. Test suite status (honest)

- `pytest` locally: pre-existing failures **unrelated to SEO work** —
  old fixtures import `app.auth._hits` (removed during OAuth switch) and the
  image-catalogue fixture needs source images not present in `tests/`.
- Sitemap/category behaviour verified by `verify_sitemap_change.py` instead (13/13 pass).
- Frontend: `tsc --noEmit` 0 errors + `npm run build` success **at every step**.
