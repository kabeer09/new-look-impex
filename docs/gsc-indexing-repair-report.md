# GSC indexing audit & safe repair report — 2026-11-28

Scope: read-only live inspection first, then only clearly safe local fixes.
**No push, deployment, production migration, redirect, deletion, bulk indexing
request or content rewrite was performed.** Google independently decides crawl
and indexing; URL Inspection does not request indexing.

## 1. Total URLs audited

| Group | Count | Evidence |
|---|---:|---|
| Priority HTML pages (URL Inspection + HTML) | 14 | `docs/seo-indexing-audit-report.md` |
| Supplied GSC issue URLs | 2 | `docs/gsc-affected-urls.txt` (exact URLs only) |
| Product detail samples (HTML) | 2 of 3 (1 fetch timed out) | live HTML checks |
| Sitemap URLs validated | 218 | `GET /sitemap.xml` |
| **Distinct URLs checked** | **18** | 14 + 2 + 2 product samples |

The "N/A" URL groups in the brief did not include the actual URL list. No URLs
were fabricated; add the original export to `docs/gsc-affected-urls.txt` to audit them.

## 2. URLs already indexed (live Google URL Inspection)

11 of 14 priority pages returned `PASS / Submitted and indexed` with
`ALLOWED` robots and self-canonicals: `/`, `/brass-home-decor`,
`/copper-kitchenware`, `/brass-handicrafts`, `/usa`, `/uk`, `/uae`, `/canada`,
`/au`, `/about`, `/products`.

## 3. URLs not indexed and why

| URL | Google verdict | Cause (evidence-based) | Action |
|---|---|---|---|
| `/copper-bottles` | Discovered – currently not indexed | Google knows it, no crawl recorded; page is 200, has H1, 485 words, 66 internal links, canonical self, in sitemap | No error; strengthen links/content, then re-inspect. No forced submission. |
| `/europe/germany` | Discovered – currently not indexed | 200, H1, 1815 words, 114 links, canonical self, in sitemap | Discovery/crawl signal, not thin content. Monitor; no duplicate country copy. |
| `/export` | URL unknown to Google | 200, H1, 553 words, canonical self, in sitemap, but no internal footer link found | Added a footer internal link (safe fix); no resubmission. |
| `/wholesale/uk` | Excluded by noindex tag | Meta `noindex, follow`, canonical `/uk`, not in sitemap, duplicate of indexed `/uk` | **Intentional** consolidation. Document; do not remove noindex. |
| `/products?material=Brass` | Alternate page with proper canonical | Canonical `/products`, not in sitemap, filtered catalogue | **Correct** behaviour. Do not index filtered parameters. |
| 173 SVG URLs | Discovered – currently not indexed | Not in sitemap (0 SVGs), robots allows all, no SVG files in repo/DB/source | Need GSC UI export; no blanket block/delete/noindex. |

## 4. Confirmed technical errors

1. `/products` had **no H1** and only ~307 words in initial HTML — fixed locally.
2. `/export` had **no discoverable footer internal link** — fixed locally.
3. No accidental `noindex` found on an approved indexable page; the only `noindex`
   (`/wholesale/*`) is intentional duplication control.
4. Sitemap validation: **218 URLs, 0 query-parameter URLs, 0 duplicates, 0 non-www
   hosts, 0 `/wholesale/*` duplicates** — clean.
5. Product sample: 2 product pages each had 1 H1, 6 images, 6 non-empty alts and
   self-canonicals. One of three fetches timed out (network, not a page error).

## 5. Changes implemented (local, not deployed)

| Change | File |
|---|---|
| Server-rendered H1 + truthful catalogue intro on `/products` | `frontend/app/(public)/products/page.tsx` |
| Internal link to `/export` in global footer | `frontend/components/public/PublicFooter.tsx` |
| Read-only audit classification + sitemap validation helpers | `backend/app/gsc/audit.py` |
| Audit issue / recrawl queue models + additive migration 0007 | `backend/app/models.py`, `backend/alembic/versions/0007_gsc_indexing_audit.py` |
| Admin endpoints: overview, issues, queue add, HTTP run, GSC inspect, issue decision | `backend/app/gsc/api.py` |
| SEO Manager "Indexing Audit" tab | `frontend/app/(admin)/admin/seo-manager/page.tsx` |
| Plan, affected-URL list, report | `docs/gsc-indexing-repair-plan.md`, `docs/gsc-affected-urls.txt`, this file |

The audit classifies: accidental vs intentional noindex, query-parameter canonicals,
discovered-not-indexed, unknown-to-Google, broken URLs, missing H1 and sitemap
problems. `auto` fixes are limited to clearly safe cases; `approval` items are
recorded only as Pending issues. Duplicate URLs do not create duplicate issues.

## 6. Changes requiring approval (not done)

- Removing `noindex` from `/wholesale/uk` (intentional duplicate).
- Redirects, page deletions, product URL consolidation.
- Canonical changes where intent is uncertain.
- Rewriting content for `/copper-bottles`, `/europe/germany` or bulk product pages.
- Any robots change or bulk indexing request.
- Production migration `0007` and deployment of these local changes.

## 7. Before / after verification

| Check | Before | After (local) |
|---|---|---|
| `/products` H1 in HTML | 0 | 1 (+ honest intro) |
| `/export` footer link | absent | present |
| Audit endpoints | absent | present, admin-only, tests pass |
| Migration chain | 0006 | 0007 on fresh local DB |

Production before/after is **not verified** because these changes are not deployed.
Re-run URL Inspection after deployment and Google's next crawl.

## 8. Remaining Google-side actions

1. Export the 173 SVG URLs from Search Console UI, then run
   `python scripts/classify_svg_urls.py export.csv docs/svg-indexing-report.csv`.
2. Let normal crawling reprocess the sitemap; do not claim indexing.
3. Re-inspect `/products`, `/copper-bottles`, `/europe/germany`, `/export` after the next crawl.
4. Provide the original N/A URL list for per-URL verdicts.

## 9. Test results

| Test | Result |
|---|---|
| Backend pytest | **175 passed** |
| TypeScript `tsc --noEmit` | exit 0 |
| `npm run build` | success |
| Alembic local fresh DB `upgrade head` | success through `0007` |
| Python compileall | success |
| Staged secret scan | 0 hits |

## 10. Files changed

See section 5. All changes are local and uncommitted except this report's
predecessor commit `608f14b`; no push to `origin/master` was made in this task.
