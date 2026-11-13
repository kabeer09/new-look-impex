# Page Metadata Report — New Look Impex

> Per-page record: URL → intent → primary keyword → SEO title → meta
> description → H1 → internal links → implementation status.
> Titles marked with `+ | New Look Impex` receive the brand from the site-wide
> layout template (`(public)/layout.tsx` title.template); homepage and brand
> page use absolute titles so the brand appears exactly once.

Verification method: live crawl of every sitemap URL (208 URLs post-fix) —
**0 duplicate titles, 0 missing descriptions, all canonicals self-referential
on indexable pages** (`$env:TEMP\opencode\p2_verify2.txt`, `href_verify3.txt`).

## A. Homepage & brand

| URL | Intent | Primary keyword | SEO title | Meta description | H1 | Links | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | B2B manufacturer search | brass and copper handicraft manufacturer in India | Brass & Copper Handicraft Manufacturer in Moradabad, India \| New Look Impex | New Look Impex manufactures and exports brass handicrafts, copper bottles, kitchenware and metal home décor from Moradabad, India. Wholesale and bulk enquiries. (160) | Brass & Copper Handicraft Manufacturer and Exporter in Moradabad, India | 12 categories, 92 products (SSR), RFQ | ✅ `8698ea4` |
| `/nli-collections` | B2C brand search | handcrafted brass home décor | NLI Collections \| Premium Brass, Copper & Home Décor | Discover handcrafted brass and copper home décor by NLI Collections. Elegant metal tableware, copper bottles and brass serveware from Moradabad, India. | NLI Collections — Handcrafted Brass & Copper for Beautiful Homes | 4 collections, contact | ✅ `6ae1f25` |

## B. Category pages (`/categories/*`) — unique titles, server-rendered editorial

All 14 published slugs have: unique title, unique description, self-canonical,
BreadcrumbList + FAQPage JSON-LD (generated from the same visible copy),
editorial intro, 3 FAQs, related-range links, RFQ CTA, and page-1 products in
HTML. Titles/descriptions per slug: see `KEYWORD_MAPPING.md` §3.

Hidden slugs (`brass-handicrafts`, `copper-handicrafts`, `metal-home-decor`):
`noindex, follow`, excluded from sitemap (dedicated pages own the topic).

Status: ✅ `3e9d850` (metadata) + `4ccaf14` (content).

## C. Dedicated category landing pages

| URL | SEO title (base) | H1 (from page hero) | Status |
| --- | --- | --- | --- |
| `/brass-collection` | Brass Collection — Wholesale Handicrafts India | Brass Collection | ✅ `3e9d850` |
| `/copper-collection` | Copper Collection — Wholesale Copper Products | Copper Collection | ✅ `3e9d850` |
| `/metal-home-decor` | Metal Home Décor — Wholesale Brass & Copper Decor | Metal Home Décor | ✅ `3e9d850` |
| `/diyas-lanterns` | Diyas & Lanterns — Wholesale Manufacturer India | Diyas & Lanterns | ✅ `3e9d850` |
| `/gifting` | Corporate & Festival Gifting — Brass & Copper | Gifting | ✅ `3e9d850` |
| `/urlis` | Brass Urlis — Wholesale from Moradabad, India | Urlis | ✅ `3e9d850` |
| `/brass-handicrafts` | Brass Handicrafts Manufacturer — Wholesale from Moradabad India | (page hero) | ✅ pre-existing |
| `/brass-urli` | Brass Urlis & Diyas Wholesale — Manufacturer from Moradabad India | (page hero) | ✅ pre-existing |
| `/brass-diya`, `/brass-lanterns`, `/brass-home-decor`, `/copper-bottles`, `/copper-kitchenware`, `/copper-water-bottles-wholesale` | unique, keyword-led | (page hero) | ✅ pre-existing |

## D. Service pages

| URL | SEO title (base) | Description summary | Status |
| --- | --- | --- | --- |
| `/categories` | Brass & Copper Product Categories — Wholesale | Browse wholesale categories — urlis, diyas, lanterns, bottles, kitchenware, décor, gifting | ✅ `3e9d850` |
| `/customisation` | Custom Manufacturing & OEM — Bespoke Metalware | Custom sizes, finishes, engraving, private label — quoted per order | ✅ `3e9d850` |
| `/catalogue` | Download Product Catalogue — Brass & Copper | Complete catalogue from live product data | ✅ `3e9d850` |
| `/request-quote` | Request a Wholesale Quote — Brass & Copper RFQ | Written quotation: price, MOQ, lead time, packaging | ✅ `3e9d850` |
| `/contact` | Contact — Wholesale & Export Enquiries, Moradabad | Email, phone, WhatsApp, GSTIN | ✅ `33a8b21` |
| `/about` | About Us — Brass & Copper Manufacturer, Moradabad | Manufacturer & exporter profile (brand-doubling fixed) | ✅ `3e9d850` |
| `/export` | Export — Copper & Brass Handicrafts from India | Written per-order quotations: Incoterms, packaging (brand-doubling fixed) | ✅ `3e9d850` |

## E. Regional pages

| URL | SEO title | Canonical | hreflang | Robots | Status |
| --- | --- | --- | --- | --- | --- |
| `/usa` | Wholesale Copper & Brassware Manufacturer — USA Exporter \| New Look Impex | self | cluster of 6 | index | ✅ |
| `/uk` | Wholesale Copper & Brassware Manufacturer & Exporter UK \| New Look Impex | self | cluster of 6 | index | ✅ |
| `/uae` | Wholesale Copper & Brassware UAE — Manufacturer & Exporter \| New Look Impex | self | cluster of 6 | index | ✅ |
| `/au` | Wholesale Copper & Brassware Australia — Manufacturer & Exporter \| New Look Impex | self | cluster of 6 | index | ✅ (empty-page bug fixed `33a8b21`) |
| `/canada` | Wholesale Copper & Brassware Canada — Manufacturer & Exporter \| New Look Impex | self | cluster of 6 | index | ✅ |
| `/europe` | Wholesale Copper & Brassware Europe — Manufacturer & Exporter \| New Look Impex | self | cluster of 6 | index | ✅ |
| `/wholesale/<country>` | same as short URL (renders full page) | → short URL | — | noindex, follow | ✅ `33a8b21` |
| `/wholesale` (hub) | own unique title | self | — | index | ✅ pre-existing |

## F. Product pages (133) & collections

- Product SEO titles/descriptions/alt text: Phase 1 pass via admin PATCH
  endpoints (`d14d13a`, `1f2db3c`). Per-product titles unique (brand suffix
  added once — doubling fixed in `1f2db3c`).
- Product + Offer JSON-LD where genuine; BreadcrumbList on every product page.
- `/products`, `/shop`, `/search`, `/collections`, `/collections/<slug>`: unique
  metadata (pre-existing, verified in crawl).

## G. Legal / utility

`/terms`, `/privacy`, `/shipping-export`, `/sitemap`, `/blog` + 11 articles,
`/wholesale`, `/bulk-orders`, `/custom-orders`, `/buyer-resources`,
`/exhibitions`, `/craft` — all unique titles verified in full crawl.

## H. Indexing directives summary

| Directive | Where |
| --- | --- |
| `noindex, follow` | `/categories/brass-handicrafts`, `/categories/copper-handicrafts`, `/categories/metal-home-decor`, all `/wholesale/<country>` |
| `noindex, nofollow` | unknown category slugs (404 state) |
| `index, follow` (default) | everything else in sitemap |
| 308 redirects | product slug renames (auto-created by PATCH) |
| Canonical → host | every sitemap URL normalised to `https://www.newlookimpex.store` |
