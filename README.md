# New Look Impex — AI SEO & Enquiry Growth Engine

Production-oriented full-stack platform for a Moradabad copper & brass handicrafts exporter.
No ranking/lead guarantees. No fabricated metrics, credentials, or testimonials.

## Stack
- **Backend:** FastAPI + SQLAlchemy (SQLite dev, PostgreSQL/Supabase prod) — `backend/app/`
- **Frontend:** Next.js 14 + TypeScript + Tailwind — `frontend/`
- **Automation:** n8n workflow JSONs — `n8n-workflows/`
- **AI:** provider abstraction (`LLM_PROVIDER/LLM_MODEL/LLM_API_KEY/LLM_API_BASE`); rule-based fallback when unconfigured.

## Features
- **Product catalogue:** CRUD, categories, collections, variants, specs, images (multipart upload), CSV import/export, publish/draft/archive, SEO fields. Prices optional (price-on-request model). B2B fields: `external_product_id` (source id, preserved for re-sync), `capacity`, `stock_status`, and explicit `price_visibility` (public / on_request / hidden, kept in sync with the legacy price-on-request flag).
- **CSV bulk import (admin → Catalogue → CSV Import):** download a template, upload/paste a CSV, then **preview** every row with validation errors, duplicate-`external_product_id` detection, unknown-category warnings and create/update classification before anything is written. **Commit** only after review, choosing a mode (`update_existing`, `create_new_only`, `update_only`). Imports are **never auto-published** unless you explicitly enable publishing; otherwise rows are forced to draft. Each import is logged. Dedupe prefers the stable `external_product_id` over slug so re-syncs survive renames.
- **Wholesale leads:** buyers submit an enquiry (name, company, email, phone/WhatsApp, country, product, quantity, message, consent). Each lead gets a unique buyer-facing reference (`NLI-YYYY-####`), is stored in Postgres/SQLite, can be linked to a product, and is filtered/searchable by country, status, company/email/reference in admin. Optional non-blocking business email notify (SMTP optional — the lead is saved regardless; failures are logged, never faked). First-party admin analytics: most-viewed products, popular categories, enquiries by country/source, quote + WhatsApp clicks, conversion rate.
- **SEO page metadata:** admin-configurable title / meta description / canonical URL for static pages (homepage, /wholesale, /export, regional pages) served at `/api/public/seo-pages` — applies without a deploy.
- **AI Product Import** (Admin → AI Import): image / CSV / authorised-URL analysis via
  configured LLM vision (rule-based fallback, unknowns marked "Needs verification"),
  preview → edit → regenerate → save-as-draft/publish, import history with errors.
  Strict image-rights model (own / supplier-authorised / licensed / AI-generated).
- **AI Catalogue pipeline** (Admin → AI Catalogue): auto-scan a photo folder
  (`PRODUCT_SCAN_DIR`, falls back to `./product` → `./products`), hash-based dedupe
  (exact + perceptual near-dup attaches extra gallery images — also groups multi-photo
  products), AI vision analysis → 6 description variants, IndiaMART-style keyword
  groups, Google SEO metadata, per-image SEO, B2B copy and JSON-LD (no fake prices /
  ratings). 8-tab review editor with SERP preview and copy blocks, then
  **approve → publish** — AI content is never public before human approval, and
  regeneration never touches published copy. Originals are never moved or deleted.
  See `docs/ai-catalogue.md`. Enable with `PRODUCT_SCAN_ENABLED=true`.
- **AI SEO assistant:** suggestions for products/collections/categories with
  missing/duplicate-metadata warnings; review-before-publish, never auto-saves.
- **Media:** local dev storage or S3-compatible object storage (Supabase/AWS/R2),
  800px thumbnails, descriptive filenames, alt text + rights metadata.
- **Drop-folder auto-import:** photos dropped into `incoming/products/` become AI-described
  draft products; `incoming/banners/` images rotate on the homepage hero. See
  `docs/auto-import.md`. Enable with `INCOMING_ENABLED=true`.
- **Live-site migration:** `python backend/scripts/import_linker_store.py` imports the
  merchant's own linker.store catalogue (products + gallery images) as review drafts
  with claim-scrubbed copy and source URLs. Safe to re-run (dedupes).
- **Merchant-supplied product photos:** `python backend/scripts/import_merchant_ai_images.py`
  imports a batch of merchant-provided product images as review drafts with SEO
  titles, meta descriptions and keyword tags. AI-generated images are tagged
  `rights_source=ai_generated` and stay drafts until a human verifies them against
  the physical products. Safe to re-run (dedupes).
- **SEO backfill:** `python backend/scripts/backfill_draft_seo.py` cleans every draft's
  SEO — decodes HTML entities, trims unverifiable-claim phrases, repairs mid-word
  title/meta cuts, fills missing titles/descriptions and tops keyword tags up to four
  with category B2B keywords. Safe to re-run (idempotent).
- **Public catalogue:** search, filters (category/material/style/price), sort, pagination, product detail with related products, collections.
- **Regional + B2B landing pages:** top-level buyer pages `/au`, `/uae`, `/uk`, `/usa`, `/canada`, `/europe` and B2B pages `/bulk-orders`, `/export`, `/custom-orders` — each with unique, honest copy (no unverified local-office, stock, delivery-time or certification claims).
- **RFQ system:** buyers add products to a cart, set quantities/notes, submit consolidated RFQ → reference number → admin CRM. Duplicate protection (24h). Honest email handling (no fake "sent" claims).
- **Buyer research / CRM:** manual entry, CSV import, AI/rule-based qualification (explainable scores), outreach drafts with human approval gate, suppression list (opt-out), send only via configured SMTP.
- **Catalogue PDF:** admin-controlled, published products only, "pricing on request" when prices aren't public.
- **SEO engine:** keyword discovery, opportunity scoring (transparent factors), audits, recommendations, search-to-page analysis, content studio, approval-based publishing with version history + rollback.
- **Google integrations:** Search Console OAuth + sync, GA4 event tracking (beacon).
- **Analytics events:** product views, RFQ adds/submits, catalogue downloads, contact/WhatsApp clicks.
- **Settings:** announcement bar, business info, target countries — editable from admin.

## Quick start (Windows PowerShell)

```powershell
Copy-Item .env.example .env
# edit .env: SECRET_KEY, ADMIN_EMAIL, ADMIN_PASSWORD
pip install -r backend/requirements.txt
$env:PYTHONPATH="backend"
python -m uvicorn app.main:app --reload --port 8000
# API docs: http://localhost:8000/api/docs
# health:   http://localhost:8000/api/health

cd frontend
npm install
$env:NEXT_PUBLIC_API_URL="http://localhost:8000"
npm run dev
# Dashboard: http://localhost:3000  -> Settings -> log in with ADMIN_EMAIL/ADMIN_PASSWORD
```

## End-to-end demo (the required flow)
1. Settings → log in.
2. Keywords → "Load seed keywords" (first run) or Add `Brass urli wholesale` / Australia.
3. System scores it (factors + explanation shown in Opportunities).
4. A recommendation is auto-created (improve page or evaluate new page).
5. Recommendations → Approve → Publish (admin only; version + log saved, rollback available).
6. Dashboard tracks GSC performance after sync; Enquiries records leads; future priorities use accumulated evidence.

## Commerce flow
1. Admin → Products → create product → upload images → publish.
2. Public site → Shop → browse/search/filter → product detail → Add to RFQ.
3. RFQ cart → set quantities → Request a Quote → submit → reference number.
4. Admin → RFQs → review → update status → export CSV.
5. Admin → Buyers → add/import → qualify → outreach draft → approve → send (SMTP required).

## Admin authentication
- Password login (default): `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`.
- Google Sign-In (optional): set `GOOGLE_LOGIN_ENABLED=true`, register the redirect URI
  (`API_BASE_URL` + `/api/auth/google/callback`) in Google Cloud console, and list
  `GOOGLE_ALLOWED_EMAILS`. `ADMIN_EMAIL` signs in as admin, others as editor.
  See `docs/google-setup.md` §5.

## Tests
```powershell
$env:PYTHONPATH="backend"
python -m pytest backend/tests -q
```
56 tests cover auth, Google Sign-In, products (CRUD, publication, slug uniqueness, CSV, images), categories/collections, RFQ (submit, duplicate, validation, admin), buyers (CRUD, qualification, outreach, suppression), AI import/SEO, catalogue PDF, settings, events, media, roles. Externals mocked — no credentials needed.

## Deploy
- **Frontend → Vercel:** root `frontend/`, set `NEXT_PUBLIC_API_URL` to backend URL. See `docs/deployment.md`.
- **Backend → Render:** Dockerfile.backend or `pip install -r backend/requirements.txt` + `uvicorn app.main:app`. Set `DATABASE_URL` to Supabase Postgres.
- **DB → Supabase:** create project, copy connection string to `DATABASE_URL`.
- **n8n:** import `n8n-workflows/*.json`, set env vars per `docs/n8n-setup.md`.

## Docs
- `docs/ai-catalogue.md` — AI Catalogue photo-scan pipeline (scan → review → approve → publish)
- `docs/google-setup.md` — Search Console OAuth + property + quotas
- `docs/analytics-setup.md` — GA4 events
- `docs/n8n-setup.md` — workflow import + credentials
- `docs/deployment.md` — Vercel/Render/Supabase/Docker
- `docs/backup-recovery.md`, `docs/troubleshooting.md`
- `docs/api-contract.md` — shared frontend/backend API contract
- Interactive API: `/api/docs`
