"""Image hashing for duplicate detection (spec §3/§14).

- sha256: exact-duplicate detection (same bytes, e.g. re-copied file).
- perceptual average hash (aHash, 8x8, 64-bit): near-duplicate detection
  (same photo re-saved, resized, re-compressed by WhatsApp/e-mail).

Implemented with Pillow only — no extra dependencies. Returns hex strings so
they can be stored/compared as plain text in the database.
"""
from __future__ import annotations
import hashlib
import io


def sha256_hex(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def perceptual_hash(content: bytes) -> str:
    """64-bit average hash as 16-char hex. Returns "" for non-images.

    Two images with Hamming distance <= ~8 are almost certainly the same
    photo under different compression/scaling."""
    try:
        from PIL import Image
        im = Image.open(io.BytesIO(content))
        im.verify()
        im = Image.open(io.BytesIO(content)).convert("L").resize((8, 8), Image.LANCZOS)
        # tobytes() for mode "L" => 64 bytes, one per pixel (getdata is deprecated).
        pixels = im.tobytes()
        avg = sum(pixels) / len(pixels)
        bits = 0
        for p in pixels:
            bits = (bits << 1) | (1 if p >= avg else 0)
        return f"{bits:016x}"
    except Exception:
        return ""


def hamming_distance(hex_a: str, hex_b: str) -> int:
    """Hamming distance between two 64-bit hex hashes (128 when unknown)."""
    if not hex_a or not hex_b:
        return 128
    try:
        return bin(int(hex_a, 16) ^ int(hex_b, 16)).count("1")
    except ValueError:
        return 128
