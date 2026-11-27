# AI Command Centre — New Look Impex

Eight bounded AI agents, one orchestrator, three interfaces. All consequential
changes go through a unified approval queue; nothing silently publishes.

## Interfaces
- **Admin Command Centre** — `/admin/command-centre`: chat with agent selection/auto-routing, KPI overview, task history, inline approvals.
- **AI Agents** — `/admin/agents`: 8 agent identities, roles, tools and restrictions.
- **Approval Centre** — `/admin/approvals`: before/after JSON for every pending agent change.
- **AI Website Manager** — `/admin/ai-manager`: the existing single-agent chat (8 website tools), unchanged and still working.
- **Public Sales Assistant** — floating `ChatBot.tsx` on all public pages, backed by `/api/public/assistant/chat`.

## Eight agents
`backend/app/agents/definitions.py`: export_intelligence, seo, product,
creative_studio, marketing, website, sales, analytics. Each has a role,
instructions, allowed tools and restrictions; all share `SHARED_CONTEXT`
(verified business facts, target markets, "never invent specs/claims" rules).

## Backend
- `backend/app/agents/tools.py` — whitelisted tool adapters over existing DB/services. Read tools: website overview, product search, analytics (sample rows excluded), enquiries, media, SEO audit, **`seo_coverage_report`** (real DB counts of missing product SEO fields, missing images/alt text, published SEO pages and verified GSC keywords — no rankings or traffic estimates), keyword ideas, web research scaffold (honestly reports "not configured"). Mutating tools create `AiApproval` rows by default.
- `backend/app/agents/orchestrator.py` — intent routing (keyword based, max 4 agents), one LLM pass per agent, max 4 actions each, per-step logging, bounded retries.
- `backend/app/agents/api.py` — `/api/agents`, `/api/ai/chat`, `/api/ai/tasks/*`, `/api/approvals/*`, `/api/knowledge`, `/api/analytics/overview`, `/api/agents/schedules/*`, `/api/public/assistant/chat` (rate-limited).
- `backend/app/agent_scheduler.py` — daily health/snapshot, weekly SEO, monthly report; jobs needing unconfigured data sources report `not_configured`.
- `backend/alembic/versions/0003_ai_command_centre.py` — new tables.

## Lead capture from public chat
The assistant asks one question at a time, holds fields client-side and passes
them to the backend. With `consent: true` and a name + email + interest, it
creates an `enquiries` record with a reference, score and status `new`, logs a
`WorkflowExecution`, and sends a business notification through the configured
email provider. Duplicate protection: same email within 24h is reused.
WhatsApp is a prefilled `wa.me` link (Business API not connected).

## Security
- Admin endpoints require NextAuth JWT + `admin/editor` role.
- Preview/publish mode, task id, agent key and user email are overwritten server-side;
  model-supplied overrides (e.g. `preview:false`) cannot bypass the approval queue.
- Public chat has its own rate limit (20/hour/IP) and cannot call any admin tool.
- File uploads use the existing media store with rights metadata.
- No API keys reach the browser; LLM runs server-side only.

## Not configured yet (honest status)
- Live web sourcing for buyer/export research (no search API key)
- GA4 Data API sync (only GSC is connected)
- WhatsApp Business API (fallback link is used)
- Turnstile keys (rate limiting still applies)

## Tests
`pytest backend/tests -q` — 156 passed (includes regression tests for approval bypass,
atomic task claims, restricted-action blocking, product rollback and change history);
orchestrator, approvals and public-chat flows were exercised end-to-end against a local database.
