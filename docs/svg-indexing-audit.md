# SVG indexing audit — evidence available before GSC connection

## Verified from the live site and repository (2026-11-27)

| Check | Result | Evidence |
|---|---|---|
| Sitemap total URLs | 216 | `GET https://api.newlookimpex.store/sitemap.xml` → 200 |
| SVG URLs in sitemap | **0** | parsed all `<loc>` values; none end in `.svg` |
| Robots.txt | allows all | `User-agent: * / Allow: /`, sitemap declared |
| SVG files in `frontend/public` | 0 | recursive file scan |
| SVG files in repo (excluding `node_modules`/`.next`) | 0 | recursive file scan |
| `.svg` strings in local DB text columns | 0 | scanned all 34 tables |
| `.svg` references in frontend source | 0 | grep across `*.ts/tsx/css/js/json` |
| SVG references in live homepage HTML | 0 | fetched homepage, regex scan |

**Conclusion:** the 173 `Discovered – currently not indexed` SVG URLs are **not in our
sitemap** and are not present in the repository. They are being discovered by Google
from another source — most plausibly production media records hosted outside the
repo, third-party CDN assets, or links/references from other sites. No sitemap
cleanup is justified: there are no SVG entries to remove. Do **not** add blanket
`noindex`, do not block SVG in robots.txt, and do not delete assets to reduce the
GSC count.

## Important API limitation

The Search Console **Search Analytics API does not expose the Pages/indexing
coverage report**. Even after OAuth is connected, `/api/seo-console/*` can inspect
known URLs and read query/page metrics, but it cannot enumerate the 173 URLs in
the "Discovered – currently not indexed" bucket. That list must be exported from
the Search Console UI (Indexing → Pages → export) or obtained from a GSC CSV.

## Safe workflow once the export exists

1. Export the 173 URLs from Search Console as CSV with a `URL` column.
2. Run: `python scripts/classify_svg_urls.py gsc_svg_export.csv > docs/svg-indexing-report.md`
3. The report groups URLs as logo/icon/flag/illustration/product/other and checks
   sitemap inclusion and robots status. It makes no site changes.
4. For a shortlist of genuinely valuable assets, run URL Inspection via
   `/api/seo-console/url-inspection/inspect` (admin only).
5. Only remove a URL from the page sitemap if it is actually present there and is
   not a canonical HTML page. Keep all image references in HTML intact.

## What was changed

Nothing in sitemap generation, robots.txt, redirects or static assets was modified
for this issue. The change would be unnecessary and risky given the evidence above.
