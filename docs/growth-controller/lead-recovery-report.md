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
| Site/structured data address | `newlookimpex130@gmail.com` used in schema and `BUSINESS_EMAIL` |
| GA4 events in code | `generate_lead`, `whatsapp_click`, `contact_click`, `catalogue_download` via `lib/ga4.ts` |
| Live GA4 event snapshot | `form_submit` 2, `click` 5, `page_view` 403 (28d); custom event names not yet observed |

## Email inconsistency

Both addresses are documented in `SEO_AUDIT.md`: `newlookimpex130@gmail.com`
(site/admin) and `newlookimpex@gmail.com` (sales). This may be intentional
role separation, not a bug. **Owner verification is required** before changing
any displayed address, footer, schema or notification recipient. No change made.

## Funnel verdict

No evidence that forms are broken. Root cause cannot be assigned without:
- provider delivery logs (no secrets),
- comparison of organic/direct/referral sessions,
- confirmation that sales received leads.

A dedicated daily controller job now creates an owned lead-recovery task with
database counts only.
