# AI Help Desk Manager — New Look Impex

Central coordinator for the eight AI agents. Real tasks, real agent-to-agent
messages, shared knowledge, approval-gated publishing and a weekly consolidated
report. No simulated conversations; every message/task is a database row.

## Admin UI
`/admin/helpdesk` — chat, 8 agent statuses, tasks, agent messages, weekly
reports, website health, shared knowledge, permissions. Extra nav entry added
in `AdminShell.tsx`. The existing `/admin/command-centre`, `/admin/agents`,
`/admin/approvals`, `/admin/ai-manager` and public chatbot are unchanged.

## Backend
- `backend/app/helpdesk/service.py` — messaging, task engine with dependencies,
  duplicate prevention, bounded rounds (2) and retries (2), monitoring,
  weekly report generation, PDF, autonomy classification.
- `backend/app/helpdesk/api.py` — 21 admin-only endpoints (`/api/helpdesk/*`).
- `backend/app/daily_report_pdf.py` — reportlab PDF builder.
- `backend/app/models.py` — 11 new tables; migration
  `backend/alembic/versions/0004_ai_helpdesk.py`.
- `backend/app/agent_scheduler.py` — in-process background thread (no browser
  tab needed) generates the consolidated report every Friday 18:00 IST and
  writes it once per week (unique constraint prevents duplicates).

## Permission levels
- Level 1 automatic: research, SEO analysis, analytics, monitoring, drafts,
  internal messages, task creation, report generation.
- Level 2 approval: publishing, live product changes, banners, campaigns,
  outbound email, pricing.
- Level 3 restricted (always blocked): deletions, customer data, financial,
  security, admin permissions, destructive DB operations.

## Honest data rules
Reports use real DB data (GSC sample rows excluded). If an agent did not submit
a report, its section states that explicitly. Unconfigured integrations
(GA4, live web search, WhatsApp Business, Turnstile) are labelled rather than
invented.

## Weekly report
Sections A–J, generated from real agent reports and DB snapshots, stored with
a unique week key, PDF downloadable at `/api/helpdesk/reports/{id}/download`.
Email delivery is available when SMTP/Resend is configured (existing infra).

## Tests verified locally
1. All eight agents analyse and submit reports (8/8).
2. SEO + Export Intelligence collaboration: 2 agents, 2 rounds, 8 messages.
3. Website task → approval → executed → DB change verified.
4. Weekly report with all 10 sections and all 8 agent reports; PDF generated.
5. Headless scheduler: report generated twice, stored once (no duplicate).
6. Failures/disconnected integrations reported honestly; monitoring warning.
7. Restricted actions blocked; publish requires approval.

`pytest backend/tests -q`: 156 passed. Frontend `tsc --noEmit`: clean.
Restricted (level 3) actions are now blocked in `run_task_now` even when a caller requests `full_auto`.
