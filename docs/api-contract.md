# New Look Impex — Shared API Contract

**Version:** 1.1 · **Owner:** Backend (Agent B) publishes; Frontend (Agent A) consumes.
**Rule:** Do not change shapes without updating this document. Backend owns `backend/app/**`; Frontend owns `frontend/**`. No cross-ownership edits.

## Conventions

- Base URL: `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`). All API routes are prefixed `/api`.
- Auth: `Authorization: Bearer <JWT>` from `POST /api/auth/login` (existing). Admin routes require `admin`/`editor` roles as noted.
- Google Sign-In (optional, `GOOGLE_LOGIN_ENABLED=true`): `GET /api/auth/google/status` → `{enabled, reason}`;
  `GET /api/auth/google/url` → `{auth_url}` (redirect the browser there); Google redirects back to
  `GET /api/auth/google/callback`, which 302-redirects to `/admin/auth/callback?token=<JWT>` (or `?error=<code>`).
  Allow-listed emails only (`GOOGLE_ALLOWED_EMAILS`, else `ADMIN_EMAIL`); `ADMIN_EMAIL` → admin role, others → editor.
- User management (admin): `GET /api/users` → `{items: [{id, email, role, is_active, auth_provider, display_name}]}`;
  `PUT /api/users/{id}/role` with `{role: admin|editor|viewer, is_active?}` (cannot demote/deactivate self).
- List responses: `{"total": n, "page": n, "page_size": n, "items": [...]}`.
- Errors: `{"error": "message"}` with proper HTTP status (400/401/403/404/409/422/429/502).
- Dates: ISO-8601 strings. Nullable fields are `null`, never omitted silently for metrics (no fabricated numbers).
- Money: `price` is a float or `null`. Products may be price-on-request (`price_on_request: true`) — price is **optional** everywhere.
- CORS: already configured on backend for `http://localhost:3000`.

---

## 1. Public (unauthenticated) endpoints

### Settings & business info
```
GET /api/public/settings
→ { business_name, location, email, phones: [..], announcement: {text, enabled} | null,
    whatsapp_number, countries: [..], categories_nav: [...] }
```

### Products
```
GET /api/public/products?q=&category=&material=&style=&min_price=&max_price=&sort=newest|name|featured&page=1&page_size=24
→ { total, page, page_size, items: [ProductCard] }
ProductCard = { id, name, slug, short_description, category: {id,name,slug}, material, finish, color,
                price, currency, price_on_request, moq, lead_time, featured,
                image: {url, alt_text} | null, tags: [..] }

GET /api/public/products/{slug}
→ ProductDetail = ProductCard + { description, dimensions, weight, sku, variants: [..],
    specifications: [{key,value}], images: [{url, alt_text}], collections: [{id,name,slug}],
    seo_title, seo_description, related: [ProductCard] }
(404 → {"error":"Product not found"})

GET /api/public/products/search/suggest?q=   → { suggestions: [string] }
```

### Categories & collections
```
GET /api/public/categories            → { items: Category[] }   (published only, tree via parent_id)
GET /api/public/categories/{slug}     → Category + products (paginated)
GET /api/public/collections           → { items: Collection[] }
GET /api/public/collections/{slug}    → Collection + products (paginated)
Category = { id, name, slug, description, image_url, seo_title, seo_description, product_count }
Collection = { id, name, slug, description, image_url, seo_title, seo_description, product_count }
```

### RFQ (Request for Quotation)
```
POST /api/public/rfqs                 (rate-limited, duplicate-protected)
→ 201 { reference_number, message }
Body: { full_name, business_email, company_name, country, phone?, target_price?,
        delivery_timeframe?, additional_requirements?, consent: true,
        items: [{ product_id, product_name, quantity, unit?, notes? }] (min 1) }
Errors: 400 validation · 409 duplicate within 24h (same email+items hash) · 422
```

### Analytics events (beacon — no auth, consent-gated by caller)
```
POST /api/public/events
Body: { event_type: product_view|rfq_add|rfq_submit|catalogue_download|contact_click|whatsapp_click,
        url?, product_id?, country?, referrer?, campaign? }
→ 202 { recorded: true }
```

### Catalogue PDF
```
GET /api/public/catalogue.pdf?category=&collection=&product_ids=1,2,3
→ application/pdf (published products only; prices shown only when not price_on_request)
GET /api/public/catalogue/meta → { product_count, generated_at, includes: [...] }
```

### Existing public endpoints (unchanged)
- `POST /api/public/enquiries` (201/409/422)
- `GET /api/health`, `GET /sitemap.xml`, `GET /robots.txt`

---

## 2. Admin endpoints (Bearer token)

### Products — `admin`,`editor` (delete: `admin`)
```
GET  /api/products?q=&status=&category_id=&featured=&page=&page_size=
POST /api/products              → 201 ProductDetail (slug auto-generated, uniqueness enforced)
GET  /api/products/{id}
PUT  /api/products/{id}
DELETE /api/products/{id}       (409 if product referenced by RFQ items? → archive instead advised)
POST /api/products/{id}/images  (multipart/form-data, files[] ≤5MB each, JPEG/PNG/WebP) → { images: [...] }
DELETE /api/products/images/{image_id}
POST /api/products/import       { csv: "..." } → { created, updated, errors: [...] }
GET  /api/products/export       → text/csv
POST /api/products/{id}/publish | /unpublish | /archive   → ProductDetail
```
ProductInput = { name, description?, short_description?, category_id?, material?, finish?, color?,
  dimensions?, weight?, sku?, tags?: [..], moq?, lead_time?, packaging_info?,
  price?, currency? (default "USD"), price_on_request? (default true),
  featured?, status?: draft|published|archived, seo_title?, seo_description?,
  variant_data?: [{name, sku?, price?, moq?}], spec_data?: [{key, value}],
  collection_ids?: [..], image_urls?: [..] }

### Categories — `admin`,`editor`
```
GET /api/categories · POST /api/categories · PUT /api/categories/{id} · DELETE /api/categories/{id}
CategoryInput = { name, slug?, description?, image_url?, parent_id?, seo_title?, seo_description?, featured?, sort_order? }
```

### Collections — `admin`,`editor`
```
GET /api/collections · POST /api/collections · PUT /api/collections/{id} · DELETE /api/collections/{id}
POST /api/collections/{id}/products   { product_ids: [..] }
DELETE /api/collections/{id}/products/{product_id}
CollectionInput = { name, slug?, description?, image_url?, seo_title?, seo_description?, featured?, sort_order? }
```

### RFQs — `admin`,`editor`
```
GET /api/rfqs?status=&page=   → RFQ list with item counts
GET /api/rfqs/{id}            → RFQ + items + product snapshots
POST /api/rfqs/{id}/status    { status: new|contacted|quoted|won|lost, notes? }
GET /api/rfqs/export          → text/csv
RFQ = { id, reference_number, full_name, business_email, company_name, country, phone,
        target_price, delivery_timeframe, additional_requirements, consent, status,
        item_count, total_quantity, created_at }
RFQItem = { id, product_id?, product_name, quantity, unit, notes }
```

### Buyers / CRM research — `admin`,`editor`
```
GET  /api/buyers?q=&country=&category=&outreach_status=&verification=&page=
POST /api/buyers              → 201 Buyer
GET  /api/buyers/{id} · PUT /api/buyers/{id} · DELETE /api/buyers/{id}
POST /api/buyers/import       { csv: "..." } → { created, skipped_duplicates, errors }
GET  /api/buyers/export       → text/csv
POST /api/buyers/{id}/qualify     → AI/rule-based relevance score + explanation (never fabricates contacts)
POST /api/buyers/{id}/outreach-draft  → { draft_id, subject, body, source: "ai|rule-based" }
GET  /api/buyers/{id}/outreach      → [OutreachRecord]
POST /api/outreach/{record_id}/send → sends ONLY when SMTP configured; records real provider result
POST /api/outreach/{record_id}/approve → mark draft approved (human review gate)
Buyer = { id, company_name, website, country, buyer_category, product_relevance,
          contact_name?, contact_email?, phone?, source_url, source_type, date_collected,
          verification_status: unverified|verified|pending, notes, lead_score,
          qualification?: { score, factors, explanation },
          outreach_status: not_contacted|contacted|replied|interested|not_interested|unsubscribed|do_not_contact,
          created_at }
BuyerInput = { company_name, website?, country?, buyer_category?, product_relevance?,
               contact_name?, contact_email?, phone?, source_url?, source_type?, notes? }
```

### Settings — `admin`
```
GET /api/settings            → all key/value pairs (public-safe subset served at /api/public/settings)
PUT /api/settings            { key: value, ... }  (announcement_text, announcement_enabled,
   business_email, business_phones_csv, whatsapp_number, default_currency, ...)
```

### Media — `admin`,`editor`
```
GET /api/media?page=         → { items: [{id, filename, url, size, content_type, uploaded_at}] }
POST /api/media              (multipart) → { file: {...} }
DELETE /api/media/{id}
GET /api/media/files/{filename}  → image bytes (public; for <img> tags)
```

### Analytics events summary — `admin`
```
GET /api/events/summary?days=30  → { product_views, rfq_adds, rfq_submits, catalogue_downloads,
                                       contact_clicks, whatsapp_clicks, by_day: [...] }
```

### Dashboard (existing, extended)
`GET /api/dashboard/summary` adds:
`products_published, products_draft, products_total, rfqs_total, rfqs_new, buyers_total,
buyers_qualified (lead_score>=0.6), catalogue_downloads, events_summary` — all real DB counts.

---

## 3. Email behaviour (critical rule)

- SMTP env vars (`SMTP_HOST/PORT/USER/PASS`) optional. When unset, `POST /api/public/rfqs` and enquiry
  endpoints **must not claim** an email was sent — response includes `email_sent: false`.
- When configured and send succeeds → `email_sent: true`. When send fails → `email_sent: false` +
  `email_error` (safe message), but the RFQ/enquiry is still stored (201).

## 4. Frontend routing plan (Next.js route groups)

- `app/(public)/…` — marketing site with header/footer: `/`, `/shop`, `/categories`, `/products/[slug]`,
  `/collections/[slug]`, `/brass-collection`, `/copper-collection`, `/metal-home-decor`, `/urlis`,
  `/diyas-lanterns`, `/gifting`, `/wholesale`, `/customisation`, `/about`, `/catalogue`,
  `/request-quote`, `/contact`, `/buyer-resources`, `/shipping-export`, `/privacy`, `/terms`,
  `/sitemap`, `/not-found`
- `app/(admin)/admin/…` — dashboard layout (the extra `admin/` segment is required because the
  `(admin)` route group adds no URL segment; without it `/products/[id]` and `/products/[slug]`
  would collide). Admin URLs: `/admin/overview`, `/admin/products`,
  `/admin/products/[id]`, `/admin/categories`, `/admin/collections`, `/admin/media`, `/admin/rfqs`,
  `/admin/enquiries`, `/admin/buyers`, `/admin/buyers/[id]`, `/admin/login`, plus existing keywords/opportunities/audits/
  recommendations/content/publishing/integrations/analytics/automation/settings → `/admin/settings`
- RFQ cart: client-side `localStorage` (key `nli_rfq`), drawer UI, quantity + per-item notes,
  submit → `POST /api/public/rfqs`.

## 5. Design tokens (Tailwind extension)

```
NY NOW-inspired combination — monochrome ink + institutional blue + white.
navy #141414 (near-black ink; dark #000000, light #2E2E2E) · ivory #FFFFFF ·
brass #0058A9 (accent blue; dark #00417E, light #D7E7F5) ·
gold #B08D57 (metallic brand accent; dark #8F6F43, light #C9AC7C) ·
petrol #184056 (editorial headings eyebrows) · sand #F0F0F0 ·
charcoal #1B1B1B · gray #6B7280
```
Public site: black/white/blue structure (buttons black, links + accents blue),
gold reserved for metallic brand marks (logo, monograms, footer headings),
petrol for editorial eyebrows on light backgrounds.

---

## 6. AI Product Import + AI SEO (new)

### Image rights model (enforced)
Every image carries `source` (`own` | `supplier_authorised` | `licensed` | `ai_generated`) and
`permission` (free-text note, e.g. supplier name / licence ref). Uploads and URL imports MUST
supply a valid `rights_source`; missing/unknown → 400. URL imports additionally require
`confirm_rights: true` and only accept `image/*` or CSV content (max 8 MB, 20 s timeout).
Concept (AI-generated) images are flagged `is_concept: true` and must never be presented
as photographs of real products.

### AI import endpoints (admin/editor)
```
POST /api/products/ai-preview   (multipart)
  fields: mode=image|csv|url, file?, url?, category_id?, rights_source, confirm_rights?
  → { import_id, source: "ai:<model>"|"rule-based", items: [AISuggestion], warnings: [..], capped?: true }
  AISuggestion = { name, category_id?, description, material?, finish?, color?, dimensions?,
                   tags: [..], seo_title, seo_description, slug, alt_text, keywords: [..],
                   media_filenames: [..], needs_verification: [field-names...] }
  Unknown/unverifiable fields are null + listed in needs_verification ("Needs verification" in UI).
  CSV capped at 25 rows per preview (capped=true when truncated).
POST /api/products/ai-regenerate   { import_id, index, fields: [..] } → { item: AISuggestion }
POST /api/products/ai-save         { import_id, index?: null (all)|n, overrides?: {...per-index...},
                                     status: draft|published, attach_media?: [filenames] }
  → 201 { product_ids: [...], status: saved|partial, errors: [...] }
POST /api/products/ai-generate-image  { prompt, label? }
  → 201 { file: {filename, url} } — 400 {error} when no image provider is configured (never faked).
GET  /api/products/imports → { items: [{id, kind, filename, source_url, rights_source, status, error, created_at}] }
```

### AI SEO assistant (admin/editor)
```
POST /api/seo/ai-generate  { entity_type: product|collection|category, entity_id, fields?: [...] }
  → { suggestions: {name?, seo_title?, seo_description?, slug?, primary_keyword?, related_keywords?,
                     description?, alt_text?, internal_links?},
      warnings: { missing: [...], duplicates: [...] }, source }
  Suggestions are NEVER auto-saved — admin applies them via existing PUT endpoints.
  fields subset supported for per-field buttons (e.g. ["seo_title"]).
  Unsaved drafts: pass entity_id: 0 + facts: {name?, material?, category?, ...} —
  suggestions are generated from the live form instead of a DB row.
```

### Media & product-image rights fields
```
POST /api/media (multipart) accepts optional: rights_source, permission, alt_text
PUT  /api/media/{id}  { alt_text?, rights_source?, permission? }
PUT  /api/products/images/{iid}  { alt_text?, is_primary?, rights_source?, permission? }
GET  /api/media/files/{filename}?variant=thumb   (800px variant when available)
ProductImage: { ..., source, permission, is_concept }
```

### Catalogue filter additions
`GET /api/public/products` gains `finish=` (substring match on finish) and `has_moq=true`
(only products with a confirmed MOQ). Existing `style=` already covers finish/tags.

### SEO metadata base
Canonical/base URL for metadata: production `https://newlookimpex.store`
(`PUBLIC_SITE_URL` env; backend sitemap/robots already derive from env).
