# Indexing audit summary — 2026-11-28

See `docs/gsc-indexing-repair-report.md` for the full audit.

- 14 priority pages inspected through the real URL Inspection API.
- 11 indexed; `/copper-bottles` and `/europe/germany` discovered-not-indexed;
  `/export` unknown to Google.
- `/wholesale/uk` noindex is **intentional** (duplicate of `/uk`). Do not remove.
- `/products?material=Brass` canonical to `/products` is **correct**. Do not force index.
- 173 SVG URLs still require the GSC UI export; no sitemap SVGs exist.
- Sitemap validation: 218 URLs, clean.

No page was submitted for indexing. Google independently decides crawl/indexing.
