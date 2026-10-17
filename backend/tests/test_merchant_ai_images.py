"""Merchant AI-image import: plan validation + encoder tests. No DB, no disk."""
import io

import pytest

from app.merchant_ai_images import (
    ATTACHED_FILES, BANNER, CLAIM_BANNED, DESC_MAX, PLAN, TITLE_MAX,
    assert_seo_clean, compress_to_jpeg, jpeg_filename, shorten, validate_plan,
)


def test_plan_valid_and_covers_all_attached_files():
    # raises on any inconsistency; returns keys in order
    keys = validate_plan()
    assert keys == [e["key"] for e in PLAN]
    assert len(ATTACHED_FILES) == 16  # the merchant's 16 attached images


def test_every_product_is_draft_safe_copy():
    for e in PLAN:
        assert e["material"] in ("Copper",)  # only what the images support
        # no invented specs anywhere in the plan entries
        for banned in ("1000ml", "8000", "99.", "moq of", "USD "):
            assert banned.lower() not in e["description"].lower()
        assert "enquire" in e["description"].lower()  # specs stay request-based


def test_seo_lengths_and_claims():
    for e in PLAN:
        assert len(e["seo_title"]) <= TITLE_MAX, e["key"]
        assert len(e["seo_description"]) <= DESC_MAX, e["key"]
        for field in ("seo_title", "seo_description", "description",
                      "short_description"):
            low = e[field].lower()
            for word in CLAIM_BANNED:
                assert word not in low, f"{e['key']}: {word} in {field}"


def test_seo_titles_are_unique():
    titles = [e["seo_title"] for e in PLAN]
    assert len(titles) == len(set(titles))


def test_assert_seo_clean_rejects_claims():
    for bad in ("99.9% pure copper", "antibacterial properties",
                "boosts immunity", "eco-friendly bottle"):
        with pytest.raises(ValueError):
            assert_seo_clean(bad)
    assert_seo_clean("Wholesale copper water bottle for retailers and importers.")


def test_shorten_respects_limit():
    long = "Wholesale hammered copper water bottle for retailers, importers and gifting buyers everywhere"
    out = shorten(long, 60)
    assert len(out) <= 60
    assert out.endswith("retailers")
    assert shorten("Short title", 60) == "Short title"


def test_validate_plan_rejects_corrupt_plans():
    broken = [dict(e) for e in PLAN]
    broken[0]["seo_title"] = "Too long " * 20
    with pytest.raises(ValueError):
        validate_plan(broken)

    broken = [dict(e) for e in PLAN]
    broken[0]["images"] = [("unknown-file.png", "alt")]
    with pytest.raises(ValueError):
        validate_plan(broken)

    broken = [dict(e) for e in PLAN]
    broken[0]["seo_description"] = "Certified 99.9% pure and antibacterial"
    with pytest.raises(ValueError):
        validate_plan(broken)

    dup = [dict(e) for e in PLAN]
    dup.append(dict(dup[0]))  # duplicate key + name
    with pytest.raises(ValueError):
        validate_plan(dup)


def test_banner_is_active_safe():
    assert BANNER["cta_link"].startswith("/"), "internal links only"
    assert_seo_clean(BANNER["title"])
    assert_seo_clean(BANNER["subtitle"])


def test_compress_to_jpeg_shrinks_png_and_keeps_valid_image():
    from PIL import Image
    # photographic-style test image (gradient + slight noise) — a flat-colour
    # PNG would be smaller than any JPEG, which isn't the real-world case here
    grad = Image.linear_gradient("L").resize((600, 600)).convert("RGB")
    noise = Image.effect_noise((600, 600), 48).convert("L").convert("RGB")
    img = Image.blend(grad, noise, 0.15)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    raw = buf.getvalue()
    out, ctype = compress_to_jpeg(raw)
    assert ctype == "image/jpeg"
    assert len(out) < len(raw)  # compression actually happened
    back = Image.open(io.BytesIO(out))
    assert back.format == "JPEG" and back.size == (600, 600)


def test_compress_downscales_huge_images():
    from PIL import Image
    img = Image.new("RGB", (4000, 2000), (120, 90, 60))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    out, _ = compress_to_jpeg(buf.getvalue(), max_side=2400)
    back = Image.open(io.BytesIO(out))
    assert max(back.size) == 2400


def test_jpeg_filename_is_deterministic_and_clean():
    assert jpeg_filename("classic-hammered", 0) == "classic-hammered-1.jpg"
    assert jpeg_filename("Mixed Finish!", 2) == "mixed-finish-3.jpg"
