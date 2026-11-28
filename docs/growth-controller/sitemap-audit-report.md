# Sitemap audit — 2026-11-28

| Check | Result |
|---|---|
| `sitemap.xml` HTTP | 200 |
| Total URLs | 218 |
| Query-parameter URLs | 0 |
| Duplicate URLs | 0 |
| Non-www hosts | 0 |
| `/wholesale/*` intentional duplicates | 0 |
| SVG URLs | 0 |
| robots.txt | `Allow: /`, sitemap declared |

Validation logic lives in `backend/app/gsc/audit.py::validate_sitemap` and is
covered by tests. No sitemap entry was removed or added in this task.
