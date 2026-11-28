# Lead recovery report — 2026-11-28

Owner concern: calls/emails declined since mid-November. No test submission was
sent and no inbox was accessed.

## Evidence from code/config (no secrets)

| Check | Result |
|---|---|
| Enquiry APIs | `/api/public/enquiries`, `/api/public/rfqs` exist and are used by forms |
| Email notification config | `ENQUIRY_NOTIFY_EMAIL` and `EMAIL_BCC` declared; values not printed |
| Admin allowlist | `newlookimpex130@gmail.com` (admin sign-in) |
| Marketing/sales address | `newlookimpex@gmail.com` used in PDFs, footer, about, shipping/catalogue pages |
| Site/structured data address | `newlookimpex@gmail.com` — standardised across schema, `BUSINESS_EMAIL`, footer, PDFs and notifications |
| GA4 events in code | `generate_lead`, `whatsapp_click`, `contact_click`, `catalogue_download` via `lib/ga4.ts` |
| Live GA4 event snapshot | `form_submit` 2, `click` 5, `page_view` 403 (28d); custom event names not yet observed |

## Email inconsistency

Owner confirmed `newlookimpex@gmail.com` as the official public/sales address.
Public-facing metadata, schema, footer, templates and notification defaults were
standardised locally. `newlookimpex130@gmail.com` remains **only** the internal
admin login/allowlist and is intentionally preserved.

## Funnel verdict

No evidence that forms are broken. Root cause cannot be assigned without:
- provider delivery logs (no secrets),
- comparison of organic/direct/referral sessions,
- confirmation that sales received leads.

A dedicated daily controller job now creates an owned lead-recovery task with
database counts only.
