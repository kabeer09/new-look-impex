# Drop banner images here — they appear on the homepage automatically

**How it works:** save a wide banner image (JPEG/PNG/WebP, ≤8 MB, landscape —
1920×800 or similar works best) into this folder and, within ~60 seconds, it
appears in the **homepage hero rotation** with its title from the filename:
```
incoming/banners/diwali-sale.png   → hero banner titled "Diwali Sale"
```
Manage (rename, reorder, deactivate, delete) in **Admin → Banners**. The hero
rotates automatically when several are active; with none, the default hero shows.

**File states:** processed files move to `incoming/processed/`; bad files to
`incoming/failed/` (reason in Admin → AI Import → history).

**Requires:** `INCOMING_ENABLED=true` + backend restart. Same hosting limitation as
products (see `incoming/products/README.md`).
