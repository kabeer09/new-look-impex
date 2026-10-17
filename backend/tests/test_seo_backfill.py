"""SEO backfill helper tests (pure — no DB, no disk)."""
import json

from app.seo_backfill import (CATEGORY_KEYWORDS, clean_seo,
                              description_needs_regen, generate_seo_description,
                              generate_seo_title, has_hard_claim, title_needs_regen,
                              top_up_tags, unescape_text)
from app.merchant_ai_images import DESC_MAX, TITLE_MAX


def test_unescape_fixes_html_entities():
    assert unescape_text("Bottle &amp; 2 Glasses") == "Bottle & 2 Glasses"
    assert unescape_text("  spaced   out  ") == "spaced out"
    assert unescape_text("") == ""
    assert unescape_text(None) == ""


def test_has_hard_claim_detects_factual_claims_only():
    assert has_hard_claim("antibacterial properties")
    assert has_hard_claim("99.9% pure")
    assert has_hard_claim("ayurvedic health benefits")
    assert not has_hard_claim("wholesale copper bottles")
    # merchant's own craft naming is kept (they are a handicrafts maker)
    assert not has_hard_claim("Handcrafted Elegance lanterns")


def test_clean_seo_drops_claim_segments_keeps_rest():
    out = clean_seo("Copper Water Bottle — Antibacterial Properties", TITLE_MAX)
    assert "Antibacterial" not in out
    assert "Copper Water Bottle" in out
    # fully-clean text passes through unchanged
    text = "Hammered Copper Water Bottle — Wholesale"
    assert clean_seo(text, TITLE_MAX) == text
    # everything claimed -> empty string (caller regenerates)
    assert clean_seo("Antibacterial — 99.9% Pure", TITLE_MAX) == ""


def test_clean_seo_caps_length_and_trims_dangling_tail():
    long = ("Wholesale pure copper water bottle &amp; 2 glasses set from "
            "Moradabad for retailers, importers and gifting buyers in our "
            "copper bottles range. Enquire for a quo")
    out = clean_seo(long, DESC_MAX)
    assert len(out) <= DESC_MAX
    assert not out.endswith(" a") and not out.endswith("quo")


def test_clean_seo_preserves_complete_sentences():
    # a claim-free, period-terminated description must pass through UNCHANGED
    # (regression: _strip_dangling once removed the final period, which then
    #  wrongly triggered regeneration and overwrote bespoke descriptions)
    good = ("Wholesale honeycomb-pattern copper water bottle for retailers and "
            "importers. Distinct textured finish. Enquire for pricing and MOQ.")
    assert clean_seo(good, DESC_MAX) == good
    assert not description_needs_regen(good)


def test_title_regen_uses_product_noun_not_filler():
    # legacy importer hard-cut: exactly 60 chars ending mid-word
    broken = "Decorous Stainless Steel Silver Polished Candle Lantern Hand"
    name = ("Decorous Stainless Steel Silver Polished Candle Lantern "
            "Handcrafted - Elegant Outdoor Lighting")
    assert title_needs_regen(broken, name)
    out = generate_seo_title(name)
    assert len(out) <= TITLE_MAX
    assert "Lantern" in out and out.endswith("Wholesale")
    assert "Decorous" not in out  # filler dropped to make room for keywords
    assert not title_needs_regen(out, name)  # regenerated title passes the check


def test_title_regen_strips_brand_and_claim_words():
    out = generate_seo_title(
        "Premium Copper Water Dispenser Set With Ayurvedic Health Benefits")
    assert "impex" not in out.lower()
    assert "ayurvedic" not in out.lower() and "health" not in out.lower()
    assert out.endswith("Wholesale") and len(out) <= TITLE_MAX


def test_title_regen_strips_pure_copper_purity_wording():
    out = generate_seo_title("Pure Copper Water Bottle 99.9% Pure - Antibacterial")
    assert "99." not in out and "Antibacterial" not in out and "Pure" not in out
    assert "Copper Water Bottle" in out


def test_title_needs_regen_detects_brand_only_residue():
    name = "Elegant Handcrafted Moroccan Lanterns | New Look Impex"
    assert title_needs_regen("New Look Impex Wholes", name)
    assert title_needs_regen("", name)
    assert title_needs_regen("Hammered", name)  # < 3 words
    good = generate_seo_title(name)
    assert not title_needs_regen(good, name)


def test_good_ai_image_titles_are_left_alone():
    # the 10 AI-image drafts already have clean SEO — must not be flagged
    name = "Classic Hammered Copper Water Bottle"
    title = "Hammered Copper Water Bottle — Wholesale"
    assert not title_needs_regen(title, name)


def test_description_regen_heuristics():
    # legacy hard cut at 155 chars and dangling tail both flagged
    assert description_needs_regen("")
    assert description_needs_regen("x" * DESC_MAX)
    assert description_needs_regen("Wholesale bottles from Moradabad for")
    # a generated description is stable: regen-check passes on second run
    d = generate_seo_description("Elegant Handcrafted Moroccan Lanterns",
                                 "metal-lanterns")
    assert len(d) <= DESC_MAX and d.endswith(".")
    assert not description_needs_regen(d)
    assert "Moradabad" in d and "Enquire" in d
    for bad in ("99.", "antibacterial", "ayurved", "health benefit"):
        assert bad not in d.lower()


def test_generators_stay_within_limits():
    t = generate_seo_title("A Very Long Product Name " * 5)
    assert len(t) <= TITLE_MAX and t.endswith("Wholesale")


def test_generated_copy_drops_orphaned_claim_fragments():
    # "Antibacterial Properties" removed -> no stranded "properties"
    d = generate_seo_description(
        "Diamond Copper Water Bottle - 1000 ML Capacity | Antibacterial Properties",
        "copper-bottles")
    assert "properties" not in d and "antibacterial" not in d.lower()
    assert "1000 ml capacity" in d
    # "Healthy Lifestyle" removed -> no stranded "for a lifestyle" tail
    d2 = generate_seo_description(
        "Premium Copper Water Dispenser for a Healthy Lifestyle",
        "copper-kitchenware")
    assert "lifestyle" not in d2.lower() and "healthy" not in d2.lower()
    assert d2.endswith("MOQ.") and "copper water dispenser" in d2


def test_top_up_tags_pads_to_four_and_dedupes():
    out = top_up_tags(["Copper", "copper bottles"], "copper-bottles")
    assert len(out) == 4
    assert out[:2] == ["copper", "copper bottles"]  # existing preserved in order
    assert all(t == t.lower() for t in out)
    assert len(set(out)) == 4  # no duplicates


def test_top_up_tags_falls_back_for_unknown_category():
    out = top_up_tags([], "watch-cat")
    assert len(out) == 4
    assert all(not t.startswith("watch") for t in out)  # no junk category keywords


def test_top_up_tags_idempotent():
    first = top_up_tags([], "copper-bottles")
    assert top_up_tags(first, "copper-bottles") == first


def test_category_keywords_cover_real_categories():
    for slug in ("copper-bottles", "copper-kitchenware", "copper-mugs-tumblers",
                 "brass-kitchenware", "metal-lanterns"):
        assert len(CATEGORY_KEYWORDS[slug]) >= 4, slug


def test_report_json_roundtrip(tmp_path):
    # scripts write ensure_ascii=False JSON; verify special chars survive
    p = tmp_path / "r.json"
    p.write_text(json.dumps({"name": "Bottle & Glass — Set"}, ensure_ascii=False),
                 encoding="utf-8")
    assert json.loads(p.read_text(encoding="utf-8"))["name"] == "Bottle & Glass — Set"
