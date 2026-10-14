# Google integration setup (Search Console + Analytics)

## 1. Google Cloud project
1. Go to Google Cloud Console → create project `new-look-impex-seo`.
2. Enable APIs: **Google Search Console API** and (optional) **Google Analytics Data API**.
3. OAuth consent screen → External → add scopes `.../auth/webmasters.readonly`, `.../auth/analytics.readonly`.
4. Credentials → Create OAuth client (Web app). Authorised redirect URI = `GOOGLE_REDIRECT_URI`
   (default `http://localhost:8000/api/integrations/google/callback`; production: `https://<backend>/api/integrations/google/callback`).
5. Copy Client ID/Secret into `.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).

## 2. Connect
1. Dashboard → Integrations → **Connect Search Console** (opens Google consent).
2. Approve with an account that has access to the verified Search Console property.
3. `GET /api/integrations/google/search-console/properties` lists `siteEntry`s; pick the verified property.
4. `POST /api/integrations/google/search-console/sync` with `{site_url, days}` stores rows in `analytics_daily` (source=gsc).

## 3. Limits (respected by code)
- Search Analytics: max ~16 months back, ~25k rows/day queried with pagination, rowLimit 5000/request.
- Queries are sampled/anonymised — the API does **not** return every query or position. Missing data is stored as null and labelled.
- Quotas: default ~1200 QPM; sync uses one request per call; retries bounded.

## 4. GA4 (optional)
- Set `GA4_PROPERTY_ID`, grant Analytics Viewer to the OAuth account.
- Configure events: `generate_lead`, `catalog_download`, `whatsapp_click`, `quote_request`.
- Note: GA cannot map every keyword to an individual lead — the CRM never claims otherwise.

## 5. Google Sign-In for the admin dashboard (optional)
Lets admins log in with a Google account instead of a password.
1. Use the **same** OAuth client from step 1 (or a separate one). Add a second authorised
   redirect URI: `GOOGLE_LOGIN_REDIRECT_URI`
   (default `http://localhost:8000/api/auth/google/callback`; production:
   `https://<backend>/api/auth/google/callback`). The `openid email profile` scopes are
   requested automatically — no extra API enablement needed.
2. Set `GOOGLE_LOGIN_ENABLED=true` and list who may sign in:
   `GOOGLE_ALLOWED_EMAILS=owner@example.com,teammate@example.com`.
   Empty allow-list = only `ADMIN_EMAIL`.
3. Restart the backend. `/admin/login` shows "Continue with Google" only when enabled.
4. Roles: `ADMIN_EMAIL` always signs in as **admin**; other allow-listed users sign in as
   **editor**. An admin can promote/demote via `PUT /api/users/{id}/role`
   (`{"role": "admin"|"editor"|"viewer"}`) or view users at `GET /api/users`.
5. Security notes: only Google-verified emails are accepted; CSRF `state` is HMAC-signed
   with 10-minute expiry; Google users get an unusable password hash so password login
   can never succeed for them; every sign-in (including denied attempts) is audit-logged.
   To revoke someone, remove them from `GOOGLE_ALLOWED_EMAILS` and deactivate via
   `PUT /api/users/{id}/role` with `{"role": "...", "is_active": false}`.
