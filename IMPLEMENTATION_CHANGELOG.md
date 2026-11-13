# Implementation Changelog — SEO Project (New Look Impex)

> Chronological record of every SEO change, in commit order. All commits pushed
> to `master` (Vercel deploys the frontend, Render the backend from the same
> push). Verification scripts live in `%LOCALAPPDATA%\Temp\opencode\`.

## Legend

✅ live & verified · ⏳ pending owner action · 📄 doc deliverable (this commit)

---

## Phase 1 — Product SEO infrastructure

### `d14d13a` — Safe PATCH endpoints for product SEO content
- **Backend**: `PATCH /api/products/{id}` accepts `name`, `slug`,
  `short_description`, `description`, `seo_title`, `seo_description`,
  image `alt_text` — server-side validation, JWT-protected (HS256, admin
  allowlist `newlookimpex130@gmail.com` unchanged).
- Slug renames automatically create **308 redirects** (old URL → new URL).
- Product audit backup taken before edits.
- Tests: PATCH endpoint coverage added.

### `1f2db3c` — Product SEO content pass + doubled-title fix
- Unique SEO titles/descriptions written across published products (133).
- Fixed brand-name doubling in product titles (`… | New Look Impex | New Look Impex`).
- Added **Offers JSON-LD** where price/availability are genuine; RFQ-only
  products omit price rather than inventing one.

### `d54d3ea` — robots.txt spec compliance (Lighthouse SEO 1.0)
- llms.txt reference moved into a comment (spec-invalid as a directive).
- Lighthouse SEO score: **1.0**.

---

## Phase 2 — Homepage (B2B Priority 1)

### `6ae1f25` — NLI Collections B2C brand page
- Absolute title `NLI Collections | Premium Brass, Copper & Home Décor` (56 ch).
- New H1 `NLI Collections — Handcrafted Brass & Copper for Beautiful Homes`.
- 4 real collection CTAs (verified against API — replaced soft-404 links).
- FAQPage schema: 6 Q&As; BreadcrumbList added; Organization retained. **No
  Product schema on a brand page.**
- Path-aware footer: consumer CTA on `/nli-collections`, wholesale elsewhere;
  "Crafted in Moradabad, India | By New Look Impex" attribution.
- MOQ badges and wholesale-only messaging removed from the B2C page.

### `8698ea4` — B2B homepage optimisation
- Title → `Brass & Copper Handicraft Manufacturer in Moradabad, India | New Look Impex` (75 ch, absolute).
- Meta → 160 ch (was 304 ch keyword-stuffed).
- Single keyword H1: `Brass & Copper Handicraft Manufacturer and Exporter in Moradabad, India`.
- **Removed** Autumn Sale ticker, "FLAT 25% OFF", discount popup, fake
  "✓ Verified order" toasts, "Free shipping above $5,000", superlative "Best".
- Sale machinery removed cut ~13 KB first-load JS.
- Server-side rendered **12 category + 92 product links** into prerendered HTML.
- User's 10 primary B2B keywords mapped across title/meta/H1/H2s.

### `e4efc40` — Homepage FAQ schema sync
- FAQPage schema now generated from shared `home-faq.ts` — **8/8 Q&As match
  the visible FAQ** (was 5 schema vs 8 visible).
- Deduplicated repeated H2.

---

## Priority 2 — Duplicate titles & indexing directives

### `3e9d850` — Unique metadata for 28 pages + hidden-category handling
- **11 static `layout.tsx` metadata files** rewritten (unique titles + descriptions).
- `categories/[slug]/layout.tsx` rewritten with dynamic `generateMetadata`
  (17 slugs, hand-written `CATEGORY_META`, admin `seo_title` still overrides).
- `/about` and `/export` brand-doubling fixed.
- Hidden slugs (`brass-handicrafts`, `copper-handicrafts`, `metal-home-decor`)
  marked `noindex, follow` — API 404s them.
- **Backend**: `HIDDEN_CATEGORIES` extracted to one shared constant used by
  public list endpoint, detail endpoint (404s) and **sitemap** (excludes) —
  fixes 3 soft-404 URLs.
- Verified: `verify_sitemap_change.py` **13/13 PASS**; `verify_p2.py` —
  29 titles unique, 0 doubling, 208-URL sweep 0 duplicate groups.

### `33a8b21` — Regional duplicate consolidation + bug fixes
- `/wholesale/[country]` now renders the **full `CountryPage`** (was debug stub
  showing "Slug: usa") with `canonical → /usa` etc. and `noindex, follow`.
- Sitemap drops all `/wholesale/*` duplicates (only short URLs listed).
- **Fixed live bug**: `/au` passed `slug="australia"` to `CountryPage` but config
  key is `au` → page rendered **empty, no H1**. Now `slug="au"`.
- `/contact` title deduped → `Contact — Wholesale & Export Enquiries, Moradabad`.
- Also removed banned "food-safe" claim from `copper-jugs-pitchers` meta.

---

## Phase 3/5 — Content depth (crawlable HTML)

### `4ccaf14` — Category pages server-rendered with editorial depth
- `categories/[slug]/page.tsx` converted **client → server component** (ISR 300 s).
- New `category-editorial.ts`: original per-slug copy for 14 slugs — intro
  paragraphs, 3 FAQs, related-range internal links. No banned claims.
- New `CategoryProducts.tsx` (client) keeps "load more" pagination; receives
  server-fetched page-1 products as props.
- Every category page now has **in HTML**: H1, editorial H2, visible FAQ,
  FAQPage JSON-LD, BreadcrumbList JSON-LD + visible breadcrumb nav, related
  links, RFQ CTA, page-1 product links.
- FAQ schema generated from the same source as visible FAQ (cannot drift).
- Verified live: editorial, FAQ, schema, breadcrumbs, 0 loading placeholders,
  banned-claim scan clean (`verify_cats.py`, `verify_cats2.py`).

### `01f5e48` — Regional pages depth
- New `regional-products.ts` server-fetches and filters products per market.
- All 6 short pages (`/usa /uk /uae /au /canada /europe`) + `/wholesale/[country]`
  became async server pages passing `initialProducts`.
- `CountryPage.tsx`: emits **FAQPage + BreadcrumbList JSON-LD** from shared
  country config (same source as visible copy), visible breadcrumb nav,
  accepts server products (analytics-only effect when provided).
- Verified: 6/6 pages — 36 crawlable product links each, 3 schema types,
  single H1, no debug text, no loading placeholder (`verify_regional2.py` ALL PASS).

### `71bd99c` — International hreflang cluster
- `regional-meta.ts`: `REGIONAL_LANGUAGES` reciprocal 6-page cluster
  (`en-us en-gb en-ae en-au en-ca en-eu`) added to `alternates.languages`.
- Deliberately **no x-default**; **not** applied to homepage or NLI Collections.
- Verified live: 6 tags on each market page, 0 tags on `/`, `/nli-collections`,
  `/about` (`verify_hreflang.py` ALL PASS).

---

## Phase 9 — Content & topical authority (blog depth)

### `65a7bcf` — Structured blog articles
- New shared `blog/posts.ts`: single source of truth for all **11 articles**
  (title, description, date, H2 sections, internal links) — index and detail
  pages both import it, so listing/detail can never drift.
- Every article rewritten into **3–4 H2 sections** (original content, no
  competitor copy), each with:
  - contextual **internal links** to real product categories + service pages
    (4 cards/section set: "Related ranges & resources"),
  - an **enquiry CTA card** (Request Wholesale Quote / Request Catalogue / Contact),
  - visible breadcrumb nav + published date.
- Article pages now emit **BlogPosting + BreadcrumbList JSON-LD** (datePublished
  from the shared module, Organization author/publisher with the real logo URL).
- Unknown slug → `noindex` absolute title (was indexable "Blog Post" title).
- `/blog` index gained a bottom RFQ CTA block.
- Also in this commit:
  - **Removed unverified `factory-direct` claims** (10 occurrences: homepage
    Organization description, HomeClient ×2, 7 landing-page intros) — Phase 4
    rule: don't claim factory-direct unless verified. Replaced with
    "wholesale prices quoted per order".
  - **Removed `food-safe` claim** from HomeClient metals blurb.
  - **Fixed broken logo in Organization schema** — `/logo.png` 404'd in
    layout.tsx + homepage schema; now `/logo-newlookimpex.jpg` (200-verified).
  - NLI FAQ question "handmade in India" → "handmade" (banned substring),
    answer unchanged.
  - Deleted stale `nli-collections/page.tsx.bak` (held a "pure copper" claim).
- Verified live: 11/11 articles — BlogPosting+BreadcrumbList schema valid,
  7–8 H2s each, related links, CTA, unique titles, banned-claim scan clean;
  homepage logo 200; `verify_blog.py` ALL PASS.

---

## Phase 4 / Priority 3 — Manufacturing credibility

### `5e3b340` — About page credibility upgrade
- New "How the pieces are made" section: honest process description
  (hand-hammered, joined, filed, finished — matching catalogue language),
  linking `/craft` (heritage) and `/customisation` (bespoke/OEM). No invented
  factory size, headcount or capacity.
- New **"Registrations & industry bodies"** strip using the four genuine logo
  assets already supplied by the business in `public/` (previously unused):
  ODOP Uttar Pradesh, EPCH, UP Export Promotion Bureau, Ministry of MSME —
  factual captions naming each body, **no certification/accreditation claims**
  in copy.
- Removed superlative "Leading … Manufacturer" heading (the exact anti-pattern
  flagged in `COMPETITOR_ANALYSIS.md`).

### `9b4853c` — Product page conversion (Phase 8)
- Added **Custom manufacturing** CTA to the product enquiry card.
- Phase 8 audit result (no redesign): RFQ form already collects buyer name,
  company, business email, country, phone, product selection + quantities,
  target price, delivery timeframe, customisation notes, consent (Turnstile
  protected) → `/api/rfq` backend. Product pages carry Request Pricing,
  Request a quote, WhatsApp (prefilled SKU), Full catalogue, MOQ in spec table,
  Wholesale/Export links. Contact, customisation and wholesale pages all POST
  to `/api/public/enquiries`.

---

## Phase 10 — Search Console & analytics (prep — owner completes in UI)

Verified ready (no claims of submission/verification made):
- **GSC HTML verification file** `google34d4c8e34e2e9884.html` serves **200** —
  owner adds the property in GSC and verification completes via file method.
- **`robots.txt`**: valid, `Sitemap: https://www.newlookimpex.store/sitemap.xml`
  declared; llms.txt reference as comment.
- **`sitemap.xml`**: 208 URLs, verified scope (products, categories, collections,
  static, regional short URLs, 11 blog articles; hidden categories and
  `/wholesale/*` duplicates excluded).
- **GTM installed** in root layout: `GTM-PFWKB7XW` + `GTM-M4GDWFQT` (head
  scripts + body noscript iframes) with `gtag()` dataLayer stub — GA4 property
  attaches inside the owner's GTM container.
- **`llms.txt`** serves 200.
- Backend already tracks: RFQ submissions, enquiries by country/source,
  WhatsApp/quote button clicks, product views (`/admin/analytics`).
- ⏳ Owner: create/confirm GSC property → submit sitemap → watch
  impressions/clicks/queries/position + country split; confirm GA4 receiving
  in GTM preview.

---

## 📄 Deliverable documents (this commit)

| Document | Contents |
| --- | --- |
| `SEO_AUDIT.md` | Business facts, 10 critical issues found & fixed (with commits), technical baseline, homepage/NLI before→after, known limitations |
| `COMPETITOR_ANALYSIS.md` | All 15 reference sites fetched live (14 reachable; United Handicrafts unreachable), structural lessons adopted, anti-patterns rejected, keyword opportunities, remaining gaps |
| `KEYWORD_MAPPING.md` | Every important page → intent → primary/secondary keywords → title/meta/H1 → internal links → status (homepage, NLI, 17 categories, services, 6 regional, blog, products) |
| `PAGE_METADATA_REPORT.md` | Per-page metadata record for all page groups, indexing-directive summary, verification method |
| `TECHNICAL_SEO_REPORT.md` | Crawlability, titles/canonicals, structured data, sitemap, redirects, headings, images, CWV status, verification tooling, test-suite honesty |
| `INTERNATIONAL_SEO_STRATEGY.md` | Market architecture, hreflang design decisions, per-market keyword targets, anti-doorway safeguards, what is deliberately not localized, owner actions |
| `IMPLEMENTATION_CHANGELOG.md` | This file |

---

## Pending — owner actions (⏳, not claimed as done)

1. **Google Search Console**: add the property in the GSC UI (HTML verification
   file already serves 200) → submit `sitemap.xml` → track impressions, clicks,
   queries, average position, indexed pages, country split.
2. **GA4**: confirm the property inside the owner's GTM container
   (`GTM-PFWKB7XW` / `GTM-M4GDWFQT`) receives data.
3. **Keyword volumes**: validate intent-based priorities in Keyword Planner/GSC.
4. **Factory photographs/video**: genuine assets only — the About page now uses
   the four real registration/industry logos supplied in `public/`; add
   workshop/process photography when the owner has it (cannot be fabricated).
5. **Authority building (Priority 5)**: real industry directory / trade
   association listings.

## Verification summary (all green at final state)

| Script | Result |
| --- | --- |
| `verify_p2.py` | ALL PASS — 29 unique titles, no doubling, noindex slugs, canonicals, sitemap scope, 208-URL sweep 0 dup groups |
| `verify_sitemap_change.py` | 13/13 PASS |
| `verify_regional2.py` | ALL PASS — 6 regional + `/wholesale/*` + homepage B2B integrity |
| `verify_hreflang.py` | ALL PASS — reciprocal cluster, clean non-regional pages |
| `verify_cats.py` / `verify_cats2.py` | category pages: editorial/FAQ/schema/breadcrumbs/links, banned-claim scan clean |
| `verify_blog.py` | 11 blog articles: BlogPosting+BreadcrumbList valid, H2 sections, internal links, CTA, unique titles, banned-claim scan; homepage logo 200; NLI FAQ fix |
| `tsc --noEmit` | 0 errors at every step |
| `npm run build` | success at every step |
