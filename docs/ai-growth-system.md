# 24/7 Autonomous AI Growth System — New Look Impex

Eight agents, one Help Desk, one persistent worker. Real tasks, real messages,
real Search Console data, approval-gated publishing and rollback. No simulated
conversations, no fabricated rankings, traffic or leads.

## Admin UI
`/admin/growth` — AI Growth Command Centre: worker status, per-agent pause/resume,
global emergency stop, SEO analysis, keywords/issues, task queue, schedules,
weekly reports with PDF, publishing history with rollback, integration status.
`/admin/helpdesk` remains the agent chat and communication history.

## Worker (Phase 1)
- `backend/app/worker.py` — DB-backed task queue with atomic conditional claims
  and expiring leases (two workers cannot execute the same task), stale-task
  recovery after restart, heartbeat, priority ordering, retries and bounded
  execution with a hard timeout. Honours global emergency stop and per-agent
  pause before each claim.
- Started in the web process (`main.py` lifespan) **and** runnable standalone:
  `python -m app.worker`. `render.yaml` defines a separate `worker` service so
  jobs continue when the web service sleeps. Both services must share the same
  `DATABASE_URL` and `SECRET_KEY`.
- Env: `WORKER_ID`, `WORKER_POLL_SECONDS` (5), `WORKER_LEASE_SECONDS` (900),
  `WORKER_TASK_TIMEOUT` (300).

## Schedules (server-side, no browser)
`backend/app/agent_scheduler.py` ticks every 5 minutes and calls
`growth.service.run_job`, which records a unique `(job, period)` in
`automation_runs` — restarts never execute a job twice in the same period.

| Job | Cadence |
|---|---|
| continuous_monitor | hourly (availability, new enquiries, failed tasks) |
| daily_seo | daily (snapshot, issue detection, issue tasks) |
| weekly_keywords | Monday (real GSC keyword sync + roadmap task) |
| weekly_collaboration | Monday (SEO-led multi-agent collaboration) |
| monthly_audit | 1st of month (90-day audit + strategy task) |
| weekly_report | Friday 18:00 IST (14-section growth report PDF) |

`weekly_competitor_review` (agent scheduler, enabled by default): counts recorded
competitors per country from `docs/competitor-research/batch*.csv` and real GSC
keyword rows from the DB. With no research file or no GSC sync it returns
`not_configured`. It never estimates rankings, traffic, sales or backlinks.

Admins can toggle schedules and trigger any job manually from the dashboard.
Existing n8n workflows in `n8n-workflows/` remain available; they call the same
backend endpoints and are protected by `N8N_WEBHOOK_TOKEN`.

## SEO (Phase 2)
- GSC credentials and sync already exist: `/api/integrations/google/search-console/sync`
  writes real query rows into `analytics_daily` (`source='gsc'`).
- `growth/seo.py` reads only those rows, excludes `sample`, and surfaces low-CTR
  keywords, positions 5–30, declining keywords and a verified keyword roadmap.
- `seo_keywords` marks `source='gsc'` (real) vs `source='candidate'` (research
  candidate). Candidates carry no invented volume or position; `status` shows
  whether a matching verified page exists.
- `GA4_PROPERTY_ID` + `GA4_SERVICE_ACCOUNT_JSON` enable optional Data API sync;
  otherwise GA4 metrics are reported as unavailable.
- No promise of first-page rankings, traffic or sales is made anywhere.

## Autonomous improvement (Phase 3–4)
`detect_issues()` finds only verifiable problems (published products missing
metadata/images/alt text, duplicate names, pages without meta description).
`issue_tasks()` converts them into de-duplicated Help Desk tasks assigned to the
correct agent. Public changes always require approval.

Every approved change is recorded in `website_changes` with before/after JSON;
`/api/growth/changes/{id}/rollback` restores the previous value (or deactivates
a banner). Verification is an explicit field, never assumed.

## Weekly growth report (Phase 5)
Sections 1–14 exactly as requested, built from real DB state: health checks,
GSC totals, improving/declining keywords, first-page potential, country-wise
visibility (buyer enquiries — GSC country dimension is not synced), new keyword
opportunities, competitor findings (honestly unavailable without a data source),
product opportunities, technical issues, enquiries, completed/failed tasks,
published changes and verification, and a prioritised action plan. Historical
reports are stored per week; PDF download is available.

## Security
All `/api/growth/*` endpoints require admin/editor JWT via `require_role`.
Emergency stop and pause/resume require admin. Secrets stay in environment
variables. Restricted actions (deletions, financial, security, admin changes,
destructive DB operations) remain blocked by the Help Desk permission layer.

## Migration
`backend/alembic/versions/0005_autonomous_growth.py` adds the 9 new tables.
`create_all()` also creates them at startup for SQLite/local development.

## Local verification
`pytest backend/tests -q`: 156 passed. Frontend `tsc --noEmit`: clean.
`python -m alembic -c backend/alembic.ini upgrade head` on a fresh database: clean
(migrations are idempotent because `0001` uses `create_all()`).
Acceptance checks in `docs/ai-helpdesk.md` plus growth job/report/rollback
checks were executed against the local database.
