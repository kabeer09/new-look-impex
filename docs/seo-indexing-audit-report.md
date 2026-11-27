# Read-only SEO indexing audit — 2026-11-27

Scope: priority HTML pages inspected through the **real Google URL Inspection API**
via `/api/seo-console/url-inspection/inspect`, plus crawlable-HTML checks. Read-only:
no sitemap, robots, redirect, content or indexing changes were made.

## 1. Google URL Inspection results (live API)

| URL | Index status | Coverage | Last crawl | Google canonical | User canonical | Robots |
|---|---|---|---|---|---|---|
| `/` | PASS | Submitted and indexed | 2026-11-24 | `https://www.newlookimpex.store/` | same | ALLOWED |
| `/copper-bottles` | NEUTRAL | **Discovered – currently not indexed** | — | — | — | unspecified |
| `/brass-home-decor` | PASS | Submitted and indexed | 2026-11-23 | self | *(empty in Google's view)* | ALLOWED |
| `/copper-kitchenware` | PASS | Submitted and indexed | 2026-11-16 | self | self | ALLOWED |
| `/brass-handicrafts` | PASS | Submitted and indexed | 2026-11-23 | self | self | ALLOWED |
| `/usa` | PASS | Submitted and indexed | 2026-11-26 | self | self | ALLOWED |
| `/uk` | PASS | Submitted and indexed | 2026-11-12 | self | self | ALLOWED |
| `/uae` | PASS | Submitted and indexed | 2026-11-24 | self | self | ALLOWED |
| `/canada` | PASS | Submitted and indexed | 2026-11-24 | self | self | ALLOWED |
| `/au` | PASS | Submitted and indexed | 2026-11-23 | self | self | ALLOWED |
| `/europe/germany` | NEUTRAL | **Discovered – currently not indexed** | — | — | — | unspecified |
| `/about` | PASS | Submitted and indexed | 2026-11-24 | self | self | ALLOWED |
| `/export` | NEUTRAL | **URL is unknown to Google** | — | — | — | unspecified |
| `/products` | PASS | Submitted and indexed | 2026-11-05 | `https://www.newlookimpex.store/products` | `https://newlookimpex.store/products` | ALLOWED |

## 2. Findings from Google's results

1. **`/copper-bottles` and `/europe/germany` — discovered but not indexed.** Google knows the URLs but has not crawled/indexed them. This is usually a crawl-budget, internal-linking or content-depth signal — not an error. Do **not** force-submit yet; first strengthen internal links and unique content, then re-inspect.
2. **`/export` — unknown to Google.** It is in our sitemap but Google has no record. Investigate sitemap processing and internal links; it may have been dropped from the index. No automatic resubmission is performed.
3. **`/products` canonical mismatch.** Google's last crawl (2026-11-05, before current code) recorded a non-www user-declared canonical while Google selected the www URL. Current source declares the www canonical; re-inspect after Google's next crawl rather than changing code blindly.
4. **`/brass-home-decor`** has an empty user-canonical in Google's view though the page is indexed with a self canonical. Confirm the live HTML canonical in the crawlable check below.
5. All other priority pages are **indexed**, allowed by robots, with self-canonicals.

## 3. Crawlable HTML checks

| Path | HTTP | H1 | Words | Internal links | Canonical | In sitemap | noindex |
|---|---:|---:|---:|---:|---|---|---|
| `/` | 200 (recheck) | 1 | — | 160 | `https://www.newlookimpex.store` | yes | no |
| `/copper-bottles` | 200 | 1 | 485 | 66 | self (www) | yes | no |
| `/brass-home-decor` | 200 | 1 | 492 | 66 | self (www) | yes | no |
| `/copper-kitchenware` | 200 | 1 | 484 | 66 | self (www) | yes | no |
| `/brass-handicrafts` | 200 | 1 | 489 | 66 | self (www) | yes | no |
| `/usa` | 200 | 1 | 1672 | 128 | self (www) | yes | no |
| `/uk` | 200 | 1 | 1698 | 128 | self (www) | yes | no |
| `/uae` | 200 | 1 | 1697 | 129 | self (www) | yes | no |
| `/canada` | 200 | 1 | 1665 | 128 | self (www) | yes | no |
| `/au` | 200 | 1 | 1665 | 128 | self (www) | yes | no |
| `/europe/germany` | 200 | 1 | 1815 | 114 | self (www) | yes | no |
| `/about` | 200 | 1 | 846 | 75 | self (www) | yes | no |
| `/export` | 200 | 1 | 553 | 66 | self (www) | yes | no |
| `/products` | 200 | **0** | 307 | 63 | self (www) | yes | no |

Notes:

- All 14 URLs are in the XML sitemap, return 200, have www self-canonicals and no `noindex`.
- The country pages and `/europe/germany` are content-rich (1,600–1,800 words, 114–129 links).
- **`/products` has no H1 in the initial HTML** and only ~307 words — the catalogue is
  client-rendered. This is a genuine on-page SEO gap worth fixing later (add an
  SSR H1/intro), but it is a content rendering issue, not an indexing error.
- `/brass-home-decor` does emit a canonical in the current HTML; Google's empty
  user-canonical reflects an older crawl. Re-inspect after the next crawl.
- The first automated homepage fetch timed out in the batch script; a direct
  recheck returned 200 with 1 H1 and 160 internal links.

## 4. 173 SVG URLs

- The GSC coverage bucket cannot be enumerated through the Search Console API; only
  URL Inspection of a known URL is available.
- Our sitemap contains **0 SVG URLs** (216 URLs total) and `robots.txt` allows all.
- No SVG files exist in the repository, local media folder or DB text fields.
- Therefore the 173 SVGs are discovered from another source. Export them from
  Search Console UI and run `scripts/classify_svg_urls.py` before any action.
- No blanket noindex, robots block, redirect or deletion is recommended.

## 5. Safe next steps (all require approval)

1. Strengthen internal links and unique copy for `/copper-bottles` and `/europe/germany`.
2. Verify `/export` is linked from navigation/footer and present in the processed sitemap.
3. Re-inspect `/products` and `/brass-home-decor` after the next crawl.
4. Add an SSR H1 and crawlable intro to `/products` (approved change; not done here).
5. Await the SVG export; classify and inspect individually before any change.
6. No automatic repairs, no bulk indexing requests, no content deletion.
