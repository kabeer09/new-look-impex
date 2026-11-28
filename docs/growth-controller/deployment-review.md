# Controlled deployment review — 2026-11-28

Status: **prepared, not approved, not pushed, not deployed, not migrated.**

## 1. Git state

| Item | Value |
|---|---|
| Branch | `master` |
| origin/master | `bce6bbd00de112f97e2c2af5e3d3146254f1d82b` (deployed baseline) |
| Local HEAD | `be91aa480b93e244b08e6010e292784a4514ac9e` |
| Commits ahead | `608f14b` (audit report), `91c4360` (indexing repair), `149e7cff` (Growth Controller), `be91aa4` (PageSpeed key declaration) |
| Diff vs origin | 29 files, ~1329 insertions |
| User assets | 47 untracked entries preserved; none staged |
| Secret scan across range | **0** `GOCSPX-` hits |

## 2. Production state (live checks)

| Endpoint | Result |
|---|---|
| `/api/health` | 200 |
| `/api/growth/controller/status` | **404** — new controller not deployed |
| `/api/seo-console/status` | 401 — GSC integration deployed and auth-protected |

Therefore production is still the prior commit; new audit/Growth Controller code is not live.

## 3. Included in the pending deployment

- GSC indexing audit + recrawl queue (`0007_gsc_indexing_audit.py`, `gsc/audit.py`, admin endpoints, dashboard tab).
- Safe page fixes: `/products` SSR H1/intro, `/export` footer link.
- Growth Controller (`growth/controller.py`, `0008_growth_controller.py`, admin API, scheduler jobs, dashboard tab).
- Daily lead-recovery and PageSpeed baseline jobs.
- All 8 `docs/growth-controller/` reports plus indexing repair docs.
- Optional `PAGESPEED_API_KEY` declared in `render.yaml` / `.env.example` (no value committed).

## 4. Environment variables currently declared

Present in `render.yaml` (names only): seven Google variables,
`GOOGLE_ANALYTICS_PROPERTY_ID`, and now `PAGESPEED_API_KEY` (`sync: false`).
No secret values are in Git. Values remain in the Render dashboard.

## 5. Migration readiness

| Migration | Down revision | Type | Local verification |
|---|---|---|---|
| `0007_gsc_indexing_audit` | `0006_gsc_integration` | additive tables | `upgrade head` success on fresh SQLite |
| `0008_growth_controller` | `0007_gsc_indexing_audit` | additive columns + index | success |

Production Alembic version: **not queried** (no DB access). No migration was run.

Exact controlled commands (for owner approval):

```bash
# 1. Backup first
pg_dump "$DATABASE_URL" > nli_pre_growth_deploy.sql

# 2. Inspect current version
cd backend
python -m alembic -c alembic.ini current

# 3. Apply additive migrations
python -m alembic -c alembic.ini upgrade head

# 4. Verify
python -m alembic -c alembic.ini current
```

Rollback (only if approved): `python -m alembic -c alembic.ini downgrade 0006_gsc_integration`
— drops only the new audit/controller tables and columns, not legacy data.

## 6. Tests

Backend pytest **180 passed** (before the two config-only commits; code unchanged),
TypeScript clean, production build success, compileall clean, secret scan clean.

## 7. Owner confirmations before deployment

1. Sales email confirmed by owner: `newlookimpex@gmail.com`; public references standardised locally, admin login retained.
2. Confirm whether mid-November enquiries stopped due to traffic loss or delivery failure.
3. Supply the 173 SVG URL export if classification is required now.
4. Explicitly approve push, Render/Vercel deployment and migration `0007/0008`.

## 8. Post-deployment verification plan (not yet performed)

- `GET /api/growth/controller/status` → 200 with admin JWT.
- Worker status, last run, next run, failure logs and restart recovery.
- `/api/seo-console/audit/run` and `/api/seo-console/audit/inspect-queue` with admin JWT.
- GSC sync still returns real rows; GA4 `runReport` still succeeds.
- `/products` HTML contains the new H1; `/export` footer link present.
- Sitemap still 200 with no query/noindex entries.
- Confirm scheduled jobs actually executed (timestamps), not merely configured.

No autonomous repair is enabled beyond the approval policy; no indexing or ranking gain is claimed.
