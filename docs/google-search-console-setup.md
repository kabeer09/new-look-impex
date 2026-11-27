# Secure Google Search Console integration — setup

This integration is **separate** from the legacy `GOOGLE_CLIENT_ID` Google
Sign-In flow and from the old `/api/integrations/google/*` stub. It uses its own
environment variables, encrypted token storage and admin-only endpoints under
`/api/seo-console/*`. Admin UI: `/admin/seo-manager`.

## 1. Exact OAuth callback URL

```
https://api.newlookimpex.store/api/seo-console/oauth/callback
```

Register this URL in Google Cloud Console → Credentials → your OAuth client →
**Authorised redirect URIs**. Do **not** reuse the existing
`https://api.newlookimpex.store/auth/google/callback` (that belongs to admin
sign-in). Local development: `http://localhost:8000/api/seo-console/oauth/callback`.

The attached `client_secret_*.json` is a **web** client whose only current
redirect URI is the admin-login callback. Add the URL above to that client (or
create a dedicated web client) — no file needs to be committed to this repo.

## 2. Environment variables (backend only — never in frontend bundles)

```env
GOOGLE_SEARCH_CONSOLE_CLIENT_ID=<client id from Google Cloud>
GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET=<client secret from Google Cloud>
GOOGLE_SEARCH_CONSOLE_REDIRECT_URI=https://api.newlookimpex.store/api/seo-console/oauth/callback
GOOGLE_SEARCH_CONSOLE_SITE_URL=https://www.newlookimpex.store/
GOOGLE_SEARCH_CONSOLE_SCOPES=https://www.googleapis.com/auth/webmasters.readonly
GOOGLE_SEARCH_CONSOLE_WRITE_ENABLED=false
GOOGLE_ANALYTICS_PROPERTY_ID=563099446
```

### GA4 (Part C)

Set `GOOGLE_ANALYTICS_PROPERTY_ID` to enable the GA4 section. The OAuth flow then
requests **both** `webmasters.readonly` **and** `analytics.readonly` — no GA4
write scope is ever requested. If the app was connected before GA4 was added,
the status API reports `reconnect_needed: true` and `missing_scopes`; use
**Reconnect** in `/admin/seo-manager` to grant incremental consent safely.
`include_granted_scopes=true` preserves previously granted GSC access.

The connected Google account must have **Viewer** access to GA4 property
`563099446`, and the **Google Analytics Data API** must be enabled in the same
Cloud project. If it is disabled, the dashboard shows the exact API error from
Google rather than invented data.

- Leave `CLIENT_ID`/`CLIENT_SECRET` empty and the dashboard shows a setup message
  instead of pretending the integration works.
- `WRITE_ENABLED=false` (default) requests **read-only** access. Set it to `true`
  only if you need sitemap submission; that requests
  `https://www.googleapis.com/auth/webmasters` (read/write).
- Tokens are Fernet-encrypted at rest using a key derived from `SECRET_KEY`.
  No client secret, access token or refresh token is sent to the browser or logged.

### Render

Use the Blueprint or dashboard **Environment** tab and tick “secret” for the
client secret. The web service needs all six variables; the worker service does
not call Google APIs. Restart the service after adding them.

### Vercel

No Google variables belong in the frontend. Only `NEXT_PUBLIC_API_URL` (already
used) points the admin UI at the backend.

## 3. Google Cloud Console steps

1. Create/select the project and enable **Google Search Console API**.
2. OAuth consent screen → External → add scope
   `https://www.googleapis.com/auth/webmasters.readonly`
   (only add the write scope if `WRITE_ENABLED=true`).
3. Credentials → OAuth client ID → **Web application** → add the exact redirect
   URI from section 1.
4. Copy Client ID and Client secret into the backend environment (section 2).
5. Ensure the Google account used to connect has **access to the verified
   Search Console property** `https://www.newlookimpex.store/`.

## 4. Connecting and reconnecting

- `/admin/seo-manager` → **Connect Google Search Console**. Google redirects
  back to the callback; the app validates a signed `state` **and** a one-use
  nonce, encrypts the tokens and redirects to
  `/admin/seo-manager?gsc=connected`.
- If authorization expires or is revoked, use **Reconnect** (forces consent).
- **Disconnect** deletes stored tokens. This does not revoke them in Google;
  do that in your Google account permissions page if needed.

## 5. Database migration (additive)

`backend/alembic/versions/0006_gsc_integration.py` creates six new tables:
`gsc_connections`, `gsc_sync_runs`, `gsc_rows`, `gsc_url_inspections`,
`gsc_sitemaps`, `gsc_recommendations`. It modifies or deletes nothing.

Local development: `Base.metadata.create_all()` at backend startup creates them.
Production (Render/Supabase Postgres):

```bash
cd backend
python -m alembic -c alembic.ini upgrade head
```

Review the migration before running it. No production migration was executed by
this implementation.

## 6. What the dashboard shows

- Overview: clicks, impressions, CTR, average position with comparison to the
  previous equivalent period, daily chart, last sync time.
- Queries / Pages / Countries / Devices / Search Appearance from cached real API rows.
- Country pages: metrics joined to the 30 existing market URLs (metadata and
  canonical checks are labelled `requires_live_check` — never asserted).
- URL Inspection: Google's known indexing result, canonicals, last crawl,
  coverage state. **Not** a live page test and no indexing guarantee.
- Sitemaps: local discovery + GSC sitemap status; submission only with write scope.
- Recommendations: evidence JSON from real rows, priority and approval status;
  **nothing is published automatically**.

## 7. Enquiry events (GA4)

`frontend/components/public/Ga4EnquiryTracker.tsx` installs **one** delegated
click listener for `wa.me`, `mailto:`, `tel:` and catalogue-PDF links, so links
rendered in the header, footer, chat, RFQ drawer and pages are counted once.
Successful form POSTs emit `generate_lead` with a static `lead_type`/`source`.
No names, emails, phone numbers, WhatsApp URLs or reference numbers are sent.
Event collection is **not** treated as verified conversions until confirmed in
the GA4 UI; no production content or conversion definitions were changed.

## 8. Limits and honesty

- Search Analytics API data has ~3-day latency; date ranges end 3 days ago.
- Google samples/anonymises query data; low-volume queries may be absent.
- Quota errors are retried with bounded backoff; no invented fallback data.
- No first-page ranking, traffic or indexing guarantee is made anywhere.
