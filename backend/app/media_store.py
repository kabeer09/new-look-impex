"""Media storage with pluggable backend.

- local (default, dev): files under backend/media/
- s3 (production): any S3-compatible object storage (AWS S3, Supabase Storage
  via its S3 endpoint). Set STORAGE_BACKEND=s3 plus S3_* vars.

Interface is identical for both backends so callers never branch.
Thumbnails (800px) are created for images at upload time.
Filenames are descriptive: <slug>-<shorthash><ext>.
"""
from __future__ import annotations
import hashlib
import io
import os
import re
import uuid
from pathlib import Path

from .config import settings

MEDIA_DIR = Path(__file__).resolve().parent.parent / "media"
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf"}
ALLOWED_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_BYTES = 8 * 1024 * 1024  # 8 MB per file
THUMB_MAX = 800  # px on the long edge

RIGHTS_SOURCES = {"own", "supplier_authorised", "licensed", "ai_generated"}


def validate_rights(rights_source: str) -> str:
    rs = (rights_source or "").strip().lower()
    if rs not in RIGHTS_SOURCES:
        raise ValueError(
            f"rights_source must be one of {sorted(RIGHTS_SOURCES)} "
            "(who owns the rights to this image?).")
    return rs


def descriptive_name(original_name: str, label: str = "") -> str:
    """Descriptive, URL-safe filename preserving the extension."""
    ext = Path(original_name or "file.jpg").suffix.lower()
    if ext not in ALLOWED_EXT:
        ext = ".jpg"
    base = (label or Path(original_name or "upload").stem)
    base = re.sub(r"[^a-z0-9]+", "-", base.lower()).strip("-")[:60] or "image"
    return f"{base}-{uuid.uuid4().hex[:8]}{ext}"


def _thumb_name(filename: str) -> str:
    p = Path(filename)
    return f"{p.stem}-thumb{p.suffix}"


def _webp_name(filename: str) -> str:
    return f"{Path(filename).stem}-web.webp"


def _variant_keys(filename: str) -> list[str]:
    return [filename, _thumb_name(filename), _webp_name(filename)]


def make_thumbnail(content: bytes) -> bytes | None:
    """800px-max JPEG/PNG thumbnail. Returns None for non-images."""
    return _render_variant(content, THUMB_MAX, "JPEG", 82)


def make_webp(content: bytes, max_px: int = 1600) -> bytes | None:
    """1600px-max WebP derivative for fast delivery. None for non-images."""
    return _render_variant(content, max_px, "WEBP", 82)


def _render_variant(content: bytes, max_px: int, fmt: str, quality: int) -> bytes | None:
    try:
        from PIL import Image
        im = Image.open(io.BytesIO(content))
        im.verify()
        im = Image.open(io.BytesIO(content))
        if im.mode in ("RGBA", "LA", "P"):
            bg = Image.new("RGB", im.size, (248, 245, 239))
            bg.paste(im, mask=im.split()[-1] if im.mode in ("RGBA", "LA") else None)
            im = bg
        # thumbnail() preserves aspect ratio and never upscales.
        im.thumbnail((max_px, max_px), Image.LANCZOS)
        buf = io.BytesIO()
        if fmt == "JPEG":
            im.save(buf, format="JPEG", quality=quality, optimize=True)
        else:
            im.save(buf, format="WEBP", quality=quality, method=6)
        return buf.getvalue()
    except Exception:
        return None


# ---------------- backend selection ----------------

def _s3_client():
    import boto3
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT or None,
        aws_access_key_id=settings.S3_ACCESS_KEY or None,
        aws_secret_access_key=settings.S3_SECRET_KEY or None,
        region_name=settings.S3_REGION or "us-east-1")


def using_s3() -> bool:
    return (settings.STORAGE_BACKEND or "local").strip().lower() == "s3"


def ensure_dir() -> None:
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)


# ---------------- public interface ----------------

def save_file(original_name: str, content: bytes, content_type: str = "",
              label: str = "") -> dict:
    """Validate and persist an upload (+ thumbnail for images).
    Returns {filename, original_name, content_type, size, has_thumb}."""
    ext = Path(original_name).suffix.lower()
    if ext not in ALLOWED_EXT:
        raise ValueError(f"File type '{ext}' not allowed. Use {sorted(ALLOWED_EXT)}")
    if len(content) > MAX_BYTES:
        raise ValueError(f"File too large ({len(content)} bytes). Max {MAX_BYTES} bytes.")
    if content_type.startswith("image/") or ext in ALLOWED_IMAGE_EXT:
        try:
            from PIL import Image
            Image.open(io.BytesIO(content)).verify()
        except Exception:
            raise ValueError("Image file is corrupt or not a valid image.")
    name = descriptive_name(original_name, label)
    thumb = make_thumbnail(content) if ext in ALLOWED_IMAGE_EXT else None
    webp = make_webp(content) if ext in ALLOWED_IMAGE_EXT else None
    if using_s3():
        try:
            s3 = _s3_client()
            bucket = settings.S3_BUCKET
            s3.put_object(Bucket=bucket, Key=name, Body=content,
                          ContentType=content_type or "application/octet-stream")
            if thumb:
                s3.put_object(Bucket=bucket, Key=_thumb_name(name), Body=thumb,
                              ContentType="image/jpeg")
            if webp:
                s3.put_object(Bucket=bucket, Key=_webp_name(name), Body=webp,
                              ContentType="image/webp")
        except Exception as e:
            raise ValueError(f"Object storage upload failed: {type(e).__name__}")
    else:
        ensure_dir()
        (MEDIA_DIR / name).write_bytes(content)
        if thumb:
            (MEDIA_DIR / _thumb_name(name)).write_bytes(thumb)
        if webp:
            (MEDIA_DIR / _webp_name(name)).write_bytes(webp)
    return {"filename": name, "original_name": original_name,
            "content_type": content_type, "size": len(content),
            "has_thumb": bool(thumb), "has_webp": bool(webp)}


def save_bytes(filename: str, content: bytes, content_type: str = "") -> dict:
    """Persist already-validated bytes (generated imagery, fetched URLs)."""
    thumb = make_thumbnail(content)
    webp = make_webp(content)
    if using_s3():
        try:
            s3 = _s3_client()
            bucket = settings.S3_BUCKET
            s3.put_object(Bucket=bucket, Key=filename, Body=content,
                          ContentType=content_type or "application/octet-stream")
            if thumb:
                s3.put_object(Bucket=bucket, Key=_thumb_name(filename),
                              Body=thumb, ContentType="image/jpeg")
            if webp:
                s3.put_object(Bucket=bucket, Key=_webp_name(filename),
                              Body=webp, ContentType="image/webp")
        except Exception as e:
            raise ValueError(f"Object storage upload failed: {type(e).__name__}")
    else:
        ensure_dir()
        (MEDIA_DIR / filename).write_bytes(content)
        if thumb:
            (MEDIA_DIR / _thumb_name(filename)).write_bytes(thumb)
        if webp:
            (MEDIA_DIR / _webp_name(filename)).write_bytes(webp)
    return {"filename": filename, "size": len(content), "has_thumb": bool(thumb),
            "has_webp": bool(webp)}


def read_file(filename: str, variant: str = "") -> tuple[bytes | None, str]:
    """Returns (bytes_or_None, content_type).
    Variants: '' (original), 'thumb' (800px JPEG), 'webp' (1600px WebP)."""
    if variant == "webp":
        key, ctype = _webp_name(filename), "image/webp"
    elif variant == "thumb":
        key, ctype = _thumb_name(filename), "image/jpeg"
    else:
        key, ctype = filename, ""
    if using_s3():
        try:
            s3 = _s3_client()
            obj = s3.get_object(Bucket=settings.S3_BUCKET, Key=key)
            body = obj["Body"].read()
            return body, obj.get("ContentType", ctype or "application/octet-stream")
        except Exception:
            return None, ""
    p = MEDIA_DIR / key
    if not p.exists() or not p.is_file():
        return None, ""
    if ctype:
        return p.read_bytes(), ctype
    ext = p.suffix.lower()
    ctype = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
             "webp": "image/webp", "gif": "image/gif",
             "pdf": "application/pdf"}.get(ext.lstrip("."), "application/octet-stream")
    return p.read_bytes(), ctype


def delete_file(filename: str) -> bool:
    if using_s3():
        try:
            s3 = _s3_client()
            for key in _variant_keys(filename):
                try:
                    s3.delete_object(Bucket=settings.S3_BUCKET, Key=key)
                except Exception:
                    pass
            return True
        except Exception:
            return False
    removed = False
    for key in _variant_keys(filename):
        p = MEDIA_DIR / key
        if p.exists() and p.is_file():
            p.unlink()
            removed = True
    return removed


def file_path(filename: str) -> Path:
    return MEDIA_DIR / filename


def public_url(filename: str) -> str:
    """/api/media/files/... for local; direct public URL for S3 when configured."""
    if using_s3() and settings.S3_PUBLIC_URL.strip():
        return settings.S3_PUBLIC_URL.rstrip("/") + "/" + filename
    return f"/api/media/files/{filename}"
