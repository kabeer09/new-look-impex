# Drop-folder auto-import (VS Code workflow)

Drop product photos and banner images into project folders — the running backend
ingests them automatically with AI-generated titles, descriptions, SEO and keywords.
No admin clicks needed for ingestion; publishing stays human-approved.

## Setup (one time)
1. In `.env`: `INCOMING_ENABLED=true` (plus `INCOMING_DIR`, `INCOMING_INTERVAL`,
   `INCOMING_RIGHTS` as needed — see `.env.example`).
2. Restart the backend. Folders `incoming/products|banners|processed|failed` are created.
3. Check Admin → Banners (or AI Import → history) for watcher status and last scan.

## Product photos — `incoming/products/`
- Drop JPEG/PNG/WebP (≤8 MB). Within one scan interval a **draft product** appears in
  Admin → Products with AI name, description, SEO title/description, keywords→tags,
  alt text and primary image. Unknowns are flagged for verification.
- **Category auto-match:** use a subfolder named by the category slug:
  `incoming/products/brass-diyas/photo.png`. Files directly in `products/` stay
  uncategorised for manual assignment.
- Edit → **Publish** when happy. Products NEVER go public automatically unless you
  set `INCOMING_AUTO_PUBLISH=true` (not recommended).
- After each scan files move to `incoming/processed/`; corrupt/oversize files go to
  `incoming/failed/` with the reason in AI Import → history. Move a file back to retry.

## Banner images — `incoming/banners/`
- Wide landscape images (1920×800-ish). Each becomes an active homepage-hero banner
  titled from the filename (`diwali-sale.png` → "Diwali Sale"), rotating automatically.
- Manage in **Admin → Banners**: rename, reorder, change link, deactivate, delete.

## Image rights
Dropped files are recorded with `rights_source` from `INCOMING_RIGHTS` (default `own`).
Only drop files you own or are authorised to reuse. The watcher refuses to start with
an invalid rights value. AI-generated concept files belong in Admin → AI Import, not here.

## Limits
- 20 files per scan (overflow waits for the next interval).
- Works wherever the backend has filesystem access (this PC, VPS, Docker). **Not on
  ephemeral hosting** (Render free): dropped files can't reach that disk — use
  Admin → Media / AI Import upload there instead (and set Supabase Storage so uploads persist).
