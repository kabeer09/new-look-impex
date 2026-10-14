# Drop product photos here — they go live (as drafts) automatically

**How it works:** save a product photo (JPEG/PNG/WebP, ≤8 MB) into this folder and,
within ~60 seconds, the backend creates a **draft product** with an AI-generated
name, description, SEO title/description, keywords, tags and alt text — plus a media
record. Review in **Admin → Products**, edit anything, then **Publish**. Nothing goes
public without your publish click (unless `INCOMING_AUTO_PUBLISH=true` is set).

**Category auto-match:** save inside a subfolder named by category slug to assign it:
```
incoming/products/brass-diyas/my-diya.png      → category "Brass Diyas"
incoming/products/copper-urlis/                 → category "Copper Urlis"
incoming/products/photo.png                     → no category (assign in admin)
```
Use `Admin → Categories` slugs as folder names (lowercase, e.g. `brass-diyas`).

**File states:** after each scan, files move to `incoming/processed/` (done) or
`incoming/failed/` (bad file — reason in Admin → AI Import → history; move it back
to retry after fixing).

**Rights:** dropped files are recorded as `rights_source` from `INCOMING_RIGHTS`
(default `own` = your own photography). Only drop photos you own or are authorised
to use — never third-party catalogue images without permission.

**Requires:** backend setting `INCOMING_ENABLED=true` + backend restart. Works wherever
the backend has filesystem access (this PC, VPS, Docker). Not available on
ephemeral hosting (Render free) — there, use Admin → Media / AI Import upload.
