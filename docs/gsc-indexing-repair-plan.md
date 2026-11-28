# GSC indexing repair plan — 2026-11-27

Read-only first, then clearly safe changes only. No production deployment,
migration, redirect, deletion or bulk indexing request is part of this plan.

## 1. Supplied GSC issues

### A. `/wholesale/uk` — "Excluded by noindex tag"

Live evidence:

| Check | Result |
|---|---|
| HTTP | 200 |
| `X-Robots-Tag` header | absent |
| Meta robots | `noindex, follow` |
| Canonical | `https://www.newlookimpex.store/uk` |
| Sitemap | **not included** |
| Purpose | Duplicate of the canonical `/uk` regional page |

Verdict: **intentional exclusion**. The route is a legacy/duplicate wholesale URL
that deliberately canonicalises to the indexed short URL `/uk`. Removing `noindex`
would create two competing pages for the same B2B UK intent. **No change.**
Document the reason in GSC (or ignore the issue) rather than de-noindexing.

### B. `/products?material=Brass` — "Alternate page with proper canonical tag"

Live evidence:

| Check | Result |
|---|---|
| HTTP | 200 |
| Meta robots | `index, follow` |
| Canonical | `https://www.newlookimpex.store/products` |
| Sitemap | **not included** (good — filtered URLs are not page sitemap entries) |
| Content | Same catalogue, client-side material filter applied |

Verdict: **correct behaviour**. Google is consolidating the parameter URL onto
`/products`, which is intended. Do not force indexing of filtered URLs and do not
add them to the sitemap. **No change.**

### C. Supplied N/A URL groups

No actual URL list was provided beyond A and B. `docs/gsc-affected-urls.txt`
contains only the two exact URLs supplied. The N/A groups (products, categories,
collections, country pages, B2B pages, other pages) require the original export
before any per-URL verdict can be given. N/A is not automatically an error.

## 2. Previously identified priority pages

| URL | Verdict | Action |
|---|---|---|
| `/products` | Indexed, but **0 H1** and ~307 words in initial HTML | **Safe fix:** add server-rendered H1 + honest intro |
| `/export` | Unknown to Google; in sitemap, 200, self-canonical, 553 words | **Safe fix:** add footer internal link; no resubmission |
| `/copper-bottles` | Discovered, not indexed; 200, 485 words, 66 links, in sitemap | No invented content; monitor after next crawl |
| `/europe/germany` | Discovered, not indexed; 200, 1815 words, 114 links, in sitemap | No duplicated country copy; monitor |
| `/wholesale/uk` | Intentional `noindex` duplicate | Document, no change |

## 3. Safe automatic fixes implemented

1. `/products`: server-rendered H1 + factual catalogue/wholesale intro.
2. `PublicFooter`: internal link to `/export`.
3. Read-only audit + recrawl monitoring API and dashboard (see report).

## 4. Approval-required (not done)

- Redirects or page deletions.
- Removing `noindex` from `/wholesale/uk` or any intentional duplicate.
- Canonical changes where intent is uncertain.
- Large-scale product/category rewrites.
- URL consolidation, bulk indexing requests, robots changes.
- Any destructive production action.

## 5. Google-side reality

URL Inspection reports Google's known state. It does **not** request indexing for
ordinary pages. No claim is made that a page was submitted or will be indexed.
Google decides crawl and indexing independently; sitemap updates and internal
links are discovery signals only.
