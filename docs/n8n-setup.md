# n8n setup
1. Self-host or cloud n8n. Import each `n8n-workflows/*.json` (Workflows → Import from file).
2. Set n8n env/credentials: `API_BASE_URL`, `API_TOKEN` (login token or service token), `N8N_WEBHOOK_TOKEN` (must match backend `.env`), `SMTP_WEBHOOK` (email/SMTP webhook URL).
3. Activate schedules: 01 weekly discovery, 02 weekly audit, 05 monthly report. 03/04 are webhook-triggered.
4. No credentials inside JSON files. Error workflow (06) notifies on failures with bounded retries; secrets/PII never logged.
