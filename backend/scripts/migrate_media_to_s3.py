"""Migrate local media files to Supabase Storage.

Usage:
    set SUPABASE_URL=https://<ref>.supabase.co
    set SUPABASE_SERVICE_KEY=<service_role JWT>
    set SUPABASE_BUCKET=media
    set PYTHONPATH=backend
    python backend/scripts/migrate_media_to_s3.py

This uploads every file in backend/media/ to the Supabase Storage bucket
and rewrites product_images.url, categories.image_url, collections.image_url,
banners.image_url to point at the public Supabase Storage URL.
Safe to re-run (skips existing objects).
"""
import os
import sys
import json
import mimetypes
import urllib.request
import urllib.error

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from pathlib import Path

from app.config import settings
from app.database import SessionLocal
from app import models

MEDIA_DIR = Path(__file__).resolve().parent.parent / "media"


def upload_file(supabase_url, service_key, bucket, file_path):
    """Upload a single file via Supabase Storage REST API. Returns True on success."""
    filename = file_path.name
    url = f"{supabase_url}/storage/v1/object/{bucket}/{filename}"
    content_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"

    # Check if file exists
    head_url = f"{supabase_url}/storage/v1/object/info/{bucket}/{filename}"
    try:
        req = urllib.request.Request(head_url, headers={
            "Authorization": f"Bearer {service_key}",
        }, method="GET")
        urllib.request.urlopen(req)
        return "exists"  # already uploaded
    except urllib.error.HTTPError as e:
        if e.code != 404:
            pass  # proceed to upload

    with open(file_path, "rb") as f:
        data = f.read()

    req = urllib.request.Request(url, data=data, headers={
        "Authorization": f"Bearer {service_key}",
        "Content-Type": content_type,
        "x-upsert": "true",
    }, method="POST")
    try:
        resp = urllib.request.urlopen(req)
        return "uploaded"
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:200]
        return f"error: {e.code} {body}"


def main():
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    service_key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    bucket = os.environ.get("SUPABASE_BUCKET", "media")

    if not supabase_url or not service_key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY required.")
        sys.exit(1)

    public_base = f"{supabase_url}/storage/v1/object/public/{bucket}"

    files = [f for f in MEDIA_DIR.iterdir() if f.is_file()]
    print(f"Found {len(files)} local media files.")

    uploaded = 0
    skipped = 0
    failed = 0
    for i, f in enumerate(files):
        result = upload_file(supabase_url, service_key, bucket, f)
        if result == "uploaded":
            uploaded += 1
        elif result == "exists":
            skipped += 1
        else:
            failed += 1
            if failed <= 10:
                print(f"  FAILED {f.name}: {result}")
        if (i + 1) % 100 == 0:
            print(f"  processed {i+1}/{len(files)} (uploaded={uploaded}, skipped={skipped}, failed={failed})")

    print(f"Upload done: {uploaded} new, {skipped} already existed, {failed} failed.")

    # Rewrite DB URLs
    db = SessionLocal()
    try:
        for pi in db.query(models.ProductImage).all():
            if pi.url and pi.url.startswith("/api/media/files/"):
                fn = pi.url.split("/")[-1]
                pi.url = f"{public_base}/{fn}"

        for c in db.query(models.Category).all():
            if c.image_url and c.image_url.startswith("/api/media/files/"):
                fn = c.image_url.split("/")[-1]
                c.image_url = f"{public_base}/{fn}"

        for col in db.query(models.Collection).all():
            if col.image_url and col.image_url.startswith("/api/media/files/"):
                fn = col.image_url.split("/")[-1]
                col.image_url = f"{public_base}/{fn}"

        for b in db.query(models.Banner).all():
            if b.image_url and b.image_url.startswith("/api/media/files/"):
                fn = b.image_url.split("/")[-1]
                b.image_url = f"{public_base}/{fn}"

        db.commit()
        print("DB URLs rewritten to Supabase public URLs.")
    finally:
        db.close()


if __name__ == "__main__":
    main()