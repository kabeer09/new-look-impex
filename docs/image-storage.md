# Image storage configuration (local dev vs persistent object storage)

## How it works
- `STORAGE_BACKEND=local` (default): files stored under `backend/media/`, served via
  `GET /api/media/files/{filename}` (thumbnails via `?variant=thumb`). Fine for local
  development. **Not persistent on most PaaS hosts** (Render free disks are ephemeral) —
  do not rely on it in production.
- `STORAGE_BACKEND=s3`: files stored in any S3-compatible bucket (AWS S3, Supabase
  Storage via its S3-compatible endpoint, Cloudflare R2, MinIO). The API interface is
  identical; only serving changes (direct public URL when `S3_PUBLIC_URL` is set,
  otherwise proxied through `/api/media/files/...`).

## Supabase Storage setup
1. Supabase project → Storage → create a **public** bucket, e.g. `nli-media`.
2. Project Settings → API → note the URL; the S3 endpoint is
   `https://<project-ref>.storage.supabase.co/storage/v1/s3`
   (Supabase supports S3 protocol; create an S3 access key under
   Project Settings → API → S3 Access Keys if your plan supports it).
3. `.env`:
   ```
   STORAGE_BACKEND=s3
   S3_ENDPOINT=https://<project-ref>.storage.supabase.co/storage/v1/s3
   S3_BUCKET=nli-media
   S3_ACCESS_KEY=<key>
   S3_SECRET_KEY=<secret>
   S3_REGION=us-east-1
   S3_PUBLIC_URL=https://<project-ref>.supabase.co/storage/v1/object/public/nli-media
   ```
4. Restart the backend. New uploads go to the bucket; product image URLs switch
   automatically (`public_url()`), so the public site needs no redeploy.

## AWS S3 setup
1. Create a bucket + IAM user with `s3:PutObject/GetObject/DeleteObject` on it.
2. `.env`: `STORAGE_BACKEND=s3`, leave `S3_ENDPOINT` empty (uses AWS),
   `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION`.
3. For public reads, either attach a bucket policy allowing `s3:GetObject` and set
   `S3_PUBLIC_URL=https://<bucket>.s3.<region>.amazonaws.com`, or leave
   `S3_PUBLIC_URL` empty to proxy through the API (private bucket stays private).

## Image pipeline (both backends)
- Validation: JPEG/PNG/WebP/GIF/PDF only, max 8 MB, images verified decodable.
- Descriptive filenames: `<slug>-<shorthash><ext>`.
- Thumbnails: 800px-max JPEG created at upload (`?variant=thumb`), originals preserved.
- Rights: every upload requires `rights_source` (`own` | `supplier_authorised` |
  `licensed` | `ai_generated`) plus an optional permission note; URL imports additionally
  require an explicit `confirm_rights` checkbox. AI-generated files are flagged
  `is_concept` and must never be shown as product photographs.

## Migrating existing local files to S3
Re-upload through Admin → Media (rights metadata is collected at upload time).
There is no bulk backfill — this is deliberate, so every file gets rights provenance.
