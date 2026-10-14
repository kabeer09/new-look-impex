# Backup & recovery
- Postgres/Supabase: enable daily automated backups + PITR; test restore quarterly. `pg_dump` before migrations.
- SQLite dev: copy `newlookimpex.db` before upgrades.
- Secrets in env manager only; rotate leaked keys immediately.
# Troubleshooting
- 401 on dashboard → Settings → log in; token in localStorage `nli_token`.
- GSC connect 400 → set GOOGLE_CLIENT_ID/SECRET + redirect URI exactly.
- GSC sync 502 → check OAuth scopes, property access, quota; see workflow_executions detail.
- No keywords → Keywords → Load seed keywords (first run).
- Frontend can't reach API → NEXT_PUBLIC_API_URL must equal backend origin; CORS_ORIGINS must include frontend origin.
- Browser "TypeError: Failed to fetch" on Windows → use `http://127.0.0.1:8000`, NOT
  `http://localhost:8000`, as NEXT_PUBLIC_API_URL. Windows browsers resolve `localhost`
  to IPv6 `::1` first, where unrelated software (WSL relay, Docker) may already occupy
  port 8000 and swallow API calls. `frontend/.env` already uses 127.0.0.1; rebuild
  (`npm run build`) after changing it since the URL is baked in at build time.
