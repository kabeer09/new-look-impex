# 30-country page audit & product-rendering fix (2026-11-26)

## 1. Root cause of "Loading products…" on the USA page

Country pages fetch products during static generation via
`fetchRegionalProducts()` in `frontend/app/(public)/wholesale/[country]/regional-products.ts`.
Its API base defaulted to `http://localhost:8000` — unreachable from Vercel when
`NEXT_PUBLIC_API_URL` is not set. The server fetch returned `null`, which handed
the section to a client-side effect; a crawler or a slow browser saw the loading
placeholder instead of product links.

Fix:

- All server-side fetchers now default to `https://api.newlookimpex.store` in
  production (`lib/api.ts`, `regional-products.ts`, `europe-products.ts`,
  homepage, NLI page, product page, categories, collections). Local development
  still uses `http://localhost:8000`.
- `fetchRegionalProducts()` retries once (12 s timeout) before giving up.
- `CountryPage` now has an 8 s watchdog that ends the loading state and shows
  a useful catalogue link; it also always renders crawlable links to the real
  product category filters (`/products?category=<slug>`).
- SEO-only market pages (`CountryLanding`) previously had **no products at all**.
  They now server-render 12 real published products with a catalogue fallback.
- New read helper `frontend/lib/featured-products.ts` (same production-safe API
  base, retry, ISR 300 s).

## 2. 30-country route status

| # | Market | Reachable URL | Implementation | Products in HTML |
|---|---|---|---|---|
| 1 | USA | `/usa` | `CountryPage` (server-fetched) | ✅ |
| 2 | Germany | `/germany` → `/europe/germany` | 308 redirect to indexed canonical | ✅ on target |
| 3 | UK | `/uk` | `CountryPage` | ✅ |
| 4 | UAE | `/uae` | `CountryPage` | ✅ |
| 5 | France | `/france` → `/europe/france` | 308 redirect | ✅ on target |
| 6 | Netherlands | `/netherlands` → `/europe/netherlands` | 308 redirect | ✅ on target |
| 7 | Canada | `/canada` | `CountryPage` | ✅ |
| 8 | Italy | `/italy` → `/europe/italy` | 308 redirect | ✅ on target |
| 9 | Australia | `/au` (`/australia` redirects) | `CountryPage` | ✅ |
| 10 | Spain | `/spain` → `/europe/spain` | 308 redirect | ✅ on target |
| 11 | Belgium | `/belgium` → `/europe/belgium` | 308 redirect | ✅ on target |
| 12 | Switzerland | `/switzerland` → `/europe/switzerland` | 308 redirect | ✅ on target |
| 13 | Saudi Arabia | `/saudi-arabia` | `CountryPage` | ✅ |
| 14 | Japan | `/japan` | `CountryPage` | ✅ |
| 15 | Singapore | `/singapore` | `CountryPage` | ✅ |
| 16 | Sweden | `/sweden` → `/europe/sweden` | 308 redirect | ✅ on target |
| 17 | Denmark | `/denmark` → `/europe/denmark` | 308 redirect | ✅ on target |
| 18 | Norway | `/europe/norway` | `CountryLanding` | ✅ (this pass) |
| 19 | New Zealand | `/new-zealand` | `CountryLanding` | ✅ (this pass) |
| 20 | South Africa | `/south-africa` | `CountryLanding` | ✅ (this pass) |
| 21 | Poland | `/poland` → `/europe/poland` | 308 redirect | ✅ on target |
| 22 | Austria | `/austria` → `/europe/austria` | 308 redirect | ✅ on target |
| 23 | Portugal | `/europe/portugal` | `CountryLanding` | ✅ (this pass) |
| 24 | Greece | `/europe/greece` | `CountryLanding` | ✅ (this pass) |
| 25 | Turkey | `/turkey` | `CountryLanding` | ✅ (this pass) |
| 26 | Malaysia | `/malaysia` | **new** `CountryLanding` page | ✅ (this pass) |
| 27 | Indonesia | `/indonesia` | **new** `CountryLanding` page | ✅ (this pass) |
| 28 | South Korea | `/south-korea` | `CountryLanding` | ✅ (this pass) |
| 29 | Mexico | `/mexico` | `CountryLanding` | ✅ (this pass) |
| 30 | Brazil | `/brazil` | `CountryLanding` | ✅ (this pass) |

All 30 requested URLs are reachable. No duplicate country page was created: the
11 requested short European URLs redirect permanently onto the existing indexed
`/europe/<country>` canonicals. Malaysia and Indonesia are genuinely new pages
with original copy in `lib/hidden-markets.ts` and are now in `sitemap.xml`.

## 3. Deliberate non-changes

- No local-language pages were added. Competitor French/German terminology was
  recorded as a research signal, but translated pages need professional review
  and only then genuine reciprocal hreflang.
- No hreflang was added between country-targeted English pages (they are not
  language equivalents).
- No ratings, reviews, prices, certifications, factory sizes or shipping
  guarantees were invented.
- Competitor text, images and branding were not copied.

## 4. Verification (local production build)

| Page | Product links in prerendered HTML | Loading placeholder | Category-filter links |
| --- | --- | --- | --- |
| `/usa` | 36 | absent | 4 |
| `/brazil` | 36 | absent | 4 |
| `/malaysia` | 36 | absent | 4 |
| `/indonesia` | 36 | absent | 4 |

`npm run build` succeeds; `tsc --noEmit` clean; backend `pytest` 158 passed.

## 5. Verification still needed after deployment

1. `curl` each of the 30 URLs with JavaScript disabled; confirm product names
   and `/products/<slug>` links appear in the raw HTML.
2. Confirm the 11 new redirects return 308 and the target canonical is
   `/europe/<country>` (not the short alias).
3. Check `/sitemap.xml` includes the two new market pages and no redirect URLs.
4. Check GSC coverage after submission; no indexing claim is made here.
