# AI Catalogue pipeline

Scan a folder of product photos → AI vision analysis → full B2B/SEO content →
admin review → approve → publish. Nothing in this pipeline ever goes public on
its own: **AI output is a preview until an admin approves it**, and publishing
always requires approval first.

This is additive — the existing Admin → Products, AI Import and drop-folder
watcher keep working unchanged. Use whichever fits the job:

| Workflow | Use when |
| --- | --- |
| **AI Catalogue** (this doc) | You have a folder of real product photos (e.g. `products/`) and want the full pipeline: dedupe, gallery grouping, 6 description variants, keyword groups, Google metadata, JSON-LD, review/approve/publish. |
| Drop-folder watcher (`docs/auto-import.md`) | You want quick draft products from `incoming/products/` with minimal ceremony. |
| Admin → AI Import | One-off uploads, CSV/URL imports, AI concept images. |

## Setup (one time)

1. In `.env`:

   ```env
   PRODUCT_SCAN_ENABLED=true       # background scan thread
   PRODUCT_SCAN_DIR=               # empty => ./product, else ./products
   PRODUCT_SCAN_INTERVAL=300       # seconds between background scans
   PRODUCT_SCAN_RIGHTS=own         # own|supplier_authorised|licensed|ai_generated
   PRODUCT_SCAN_NEAR_DUP_DISTANCE=8
   PRODUCT_SCAN_CAP=100            # max files per scan pass
   ```

   With `PRODUCT_SCAN_DIR` empty the scanner looks for `./product` first, then
   falls back to `./products` (the merchant photo folder). Point it anywhere:

   ```env
   PRODUCT_SCAN_DIR=D:\Photos\nli-products
   ```

2. Optional but recommended — AI vision. Without a provider the pipeline still
   works using deterministic rule-based content (clearly labelled, every
   substantive field flagged for verification):

   ```env
   LLM_PROVIDER=openai-compat
   LLM_MODEL=gpt-4o-mini
   LLM_API_KEY=sk-...
   LLM_API_BASE=https://api.openai.com/v1
   ```

   Any OpenAI-compatible endpoint works. Google Gemini (AI Studio key) also
   works through its compatibility layer:

   ```env
   LLM_PROVIDER=gemini
   LLM_MODEL=gemini-flash-lite-latest
   LLM_API_KEY=AIza...
   LLM_API_BASE=https://generativelanguage.googleapis.com/v1beta/openai
   ```

   Note: Gemini 404s on model names not available to new keys — use a
   `*-latest` alias (e.g. `gemini-flash-lite-latest`) rather than a pinned
   version if you get `... is no longer available to new users`.

3. Restart the backend. Open **Admin → AI Catalogue**.

## How it works

### 1. Scan (`POST /api/catalogue/scan` or the “Scan folder now” button)

- Accepts JPG / JPEG / PNG / WEBP (≤ 8 MB each).
- **Originals are never moved, renamed or deleted.** A hash registry
  (`product_scan_files`) makes re-scans cheap and idempotent — the same file is
  never processed twice.
- **Exact duplicates** (identical bytes, e.g. a re-copied file) are skipped.
- **Near-duplicates** (same photo re-saved, resized or re-compressed by
  WhatsApp/e-mail — detected by a 64-bit perceptual hash) are attached to the
  existing product as an extra gallery image. This is also how multi-photo
  products are grouped: drop all shots of one product in the folder and the
  first becomes the primary image, the rest attach to it.
- Camera-noise filenames (`WhatsApp Image 2026-11-01 at 3.27.24 PM (1)`) get a
  neutral working title — the AI analysis replaces it.
- Every new file becomes a **draft** product with pipeline status `pending`.
  Nothing is auto-published.
- Manual upload also works: attach images in Admin → Products as usual; they
  appear in the AI Catalogue table and can be analysed there.

### 2. Analyze (“Analyze with AI” per product, or bulk “Analyze with AI”)

- Vision model reads the primary image and returns only what it can SEE:
  product type, category, material (only when visually confident), colour,
  finish, shape, design, pattern, usage, style, plus observed facts vs
  assumptions. It is explicitly forbidden from claiming purity, health
  benefits, food-grade status, certifications, dimensions, weight, capacity,
  MOQ, prices or export statistics.
- From those facts the engine generates:
  - **6 description variants** — short (50–80 w), detailed (150–250 w), B2B
    wholesale, manufacturer/exporter, IndiaMART-style, international buyer.
  - **Grouped keywords** — primary, secondary, long-tail, buyer-intent,
    manufacturer, supplier, exporter, wholesale, bulk-order and
    country-specific (USA/UK/UAE/Australia/Canada).
  - **Google SEO metadata** — title ≤ 60 chars, meta description ≤ 160,
    slug, focus keywords, OG title/description/image, canonical URL.
  - **Per-image SEO** — alt text, title, caption, description.
  - **B2B copy** — manufacturer overview, exporter overview, supplier intro,
    wholesale/bulk-order info, customisation/packaging/export-markets notes
    (unconfirmed items stay explicitly unconfirmed).
  - **JSON-LD** — Product, Organization, BreadcrumbList, WebSite. Deliberately
    no `offers`, `aggregateRating` or `review` blocks: prices and ratings would
    be fabricated for a price-on-request B2B catalogue.
- All output is scrubbed with the same hard-claim policy as the SEO backfill
  (`100% pure`, `food grade`, `certified`, `FDA`, `lead-free`, …). Unknown
  specs are labelled “Not provided” / “Requires verification”, never invented.
- Result status: `ai_generated` when the vision analysis was confident, or
  `needs_review` when facts are missing or no LLM is configured. Either way a
  human must review before approving.

### 3. Review (Admin → AI Catalogue → Open)

Eight tabs, everything editable:

| Tab | Contents |
| --- | --- |
| Basic Info | Name, slug, material/finish/colour, dimensions/weight/SKU/MOQ/lead-time (only fill these when verified!), observed facts vs assumptions, image gallery. |
| Description | All 6 variants + highlight bullets, with per-block copy and regenerate buttons. |
| B2B | Manufacturer/exporter/supplier/wholesale copy. |
| SEO Metadata | Title, meta, slug, focus keywords, OG fields + live Google SERP preview and completeness checklist. |
| Keywords | All 10 keyword groups as editable chip lists with copy buttons. |
| Image SEO | Alt/title/caption/description per image. |
| Schema | JSON-LD blocks with copy buttons. |
| Preview | Google SERP preview, IndiaMART/B2B copy blocks, full keyword list, image alt texts, JSON-LD — everything formatted for copy-paste into IndiaMART/TradeIndia/your website. |

“Regenerate” re-runs only the sections you pick. Manual edits save instantly
and move the pipeline back to `needs_review` so nothing unreviewed can slip
through. **Regeneration never modifies published copy** — for a live product
the profile re-enters review and changes apply only when you press Approve.

### 4. Approve → Publish

- **Approve** validates the content (an SEO title is required) and applies the
  profile to the product record.
- **Publish** makes it live on the public site — only from `approved`.
- **Unpublish** returns it to draft (profile stays `approved`).
- Bulk actions on the table: analyze, mark for review, approve, publish,
  unpublish, delete (delete is refused for products referenced by RFQs).

### 5. Public site

Published products get the standard public treatment plus the NLI Collections
/ New Look Impex manufacturer & exporter sections on the product page
(`frontend/app/(public)/products/[slug]/ProductClient.tsx`), enriched Product
JSON-LD (brand, manufacturer, countryOfOrigin) and sitemap inclusion. The 6
country landing pages (`/usa`, `/uk`, `/uae`, `/au`, `/canada`, `/europe` and
`/wholesale/[country]`) are already part of the site and sitemap.

## Pipeline statuses

| Status | Meaning |
| --- | --- |
| `pending` | File ingested, not analysed yet. |
| `analyzing` | Vision analysis in progress. |
| `ai_generated` | AI content ready (confident facts) — review before approving. |
| `needs_review` | AI content ready but facts missing / rule-based fallback — review required. |
| `approved` | Admin approved; content applied to the product. |
| `published` | Live on the public site. |
| `failed` | Analysis failed — error shown in the editor; fix and re-run. |

## API reference (admin)

| Method & path | Purpose |
| --- | --- |
| `GET /api/catalogue/status` | Scanner folder, interval, LLM status, last run. |
| `POST /api/catalogue/scan` | Run one scan pass now. |
| `GET /api/catalogue/stats` | Dashboard counts + SEO completion %. |
| `GET /api/catalogue/products` | Table list; filters: `status` (pipeline or `no_description`/`no_image`/`no_metadata`), `q`, `page`, `page_size`. |
| `GET /api/catalogue/products/{id}` | Full detail: product fields, profile payload, images. |
| `POST /api/catalogue/products/{id}/analyze` | Run vision analysis + generation. |
| `POST /api/catalogue/products/{id}/regenerate` | Body `{"sections": ["descriptions","keywords","seo","image_seo","b2b","schema"]}`. |
| `PUT /api/catalogue/products/{id}` | Save edits (`product_fields`, `sections`). |
| `POST /api/catalogue/products/{id}/approve` | Approve + apply. |
| `POST /api/catalogue/products/{id}/publish` | Publish (requires `approved`). |
| `POST /api/catalogue/products/{id}/unpublish` | Back to draft. |
| `GET /api/catalogue/products/{id}/preview` | SERP preview, copy blocks, JSON-LD. |
| `POST /api/catalogue/bulk` | `{"action": "...", "ids": [...]}`. |
| `DELETE /api/catalogue/products/{id}` | Delete (blocked when RFQ-referenced). |

## Safety rules (spec §4/§15)

- AI content is a **preview** — never public before approve + publish.
- No fabricated purity, health, food-safety, certification, dimension, weight,
  capacity, MOQ, lead-time, price or export claims — hard-claim phrases are
  scrubbed server-side; unknowns are labelled, not guessed.
- Observed facts and assumptions are stored separately so reviewers see what
  the model actually saw.
- Regeneration never touches published product copy; approve is the only step
  that applies content to a live product.
- Delete is blocked for products referenced by RFQs (archive instead).
- Originals are never moved or deleted by the scanner.

## Troubleshooting

- **Scan does nothing** — check Admin → AI Catalogue header: the folder path,
  whether it exists, and “AI vision: configured / not configured”. A missing
  folder is shown in red.
- **Everything says `needs_review`** — expected without an LLM key
  (rule-based fallback) or when vision facts were incomplete. Review, fix and
  approve manually.
- **Same photo created two products** — the photos differ enough perceptually
  (different angle/background). Delete one, or attach the extra image manually
  in the Basic Info tab.
- **Analysis failed** — the editor shows the stored error. Usually a transient
  provider error; press “Analyze with AI” again.
- **Ephemeral hosting (Render free)** — the scan folder must be reachable from
  the backend process. On diskless hosts use manual upload instead, and set
  Supabase/S3 storage so media persists.
