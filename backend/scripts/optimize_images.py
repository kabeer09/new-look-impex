"""Batch-resize and compress images in backend/media/ for web delivery.

Usage:
    $env:PYTHONPATH="backend"
    python backend/scripts/optimize_images.py

Resizes images wider than 1200px to 1200px max width, compresses JPEG quality to 85,
and converts PNG to WebP where beneficial. Overwrites originals in place.
"""
import os
import sys
from pathlib import Path
from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
MEDIA_DIR = Path(__file__).resolve().parent.parent / "media"
MAX_WIDTH = 1200
JPEG_QUALITY = 85

def optimize(path: Path):
    try:
        with Image.open(path) as img:
            # Convert to RGB if needed (for JPEG)
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            w, h = img.size
            if w > MAX_WIDTH:
                ratio = MAX_WIDTH / w
                new_h = int(h * ratio)
                img = img.resize((MAX_WIDTH, new_h), Image.LANCZOS)
            # Save optimized
            ext = path.suffix.lower()
            if ext in (".jpg", ".jpeg"):
                img.save(path, "JPEG", quality=JPEG_QUALITY, optimize=True)
            elif ext == ".png":
                # Convert large PNGs to WebP
                if path.stat().st_size > 200_000:
                    webp_path = path.with_suffix(".webp")
                    img.save(webp_path, "WEBP", quality=JPEG_QUALITY)
                    path.unlink()
            elif ext == ".webp":
                img.save(path, "WEBP", quality=JPEG_QUALITY)
    except Exception as e:
        print(f"  SKIP {path.name}: {e}")

def main():
    files = [f for f in MEDIA_DIR.iterdir() if f.is_file() and f.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")]
    print(f"Optimizing {len(files)} images...")
    total_before = sum(f.stat().st_size for f in files)
    for f in files:
        optimize(f)
    total_after = sum(f.stat().st_size for f in MEDIA_DIR.iterdir() if f.is_file())
    print(f"Before: {total_before / 1024 / 1024:.1f} MB")
    print(f"After:  {total_after / 1024 / 1024:.1f} MB")
    print(f"Saved:  {(total_before - total_after) / 1024 / 1024:.1f} MB ({100 * (total_before - total_after) / total_before:.0f}%)")

if __name__ == "__main__":
    main()