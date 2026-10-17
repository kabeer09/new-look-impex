"""Linker-site importer tests: parsing, sanitizing, mapping. No network."""
from app.linker_import import (finish_from_name, map_category, parse_product_page,
                               sanitize_description, seo_for)

FIXTURE = """
<html><head>
<meta name="description" content="A copper bottle page.">
<meta name="keywords" content="Copper, Bottle">
<meta property="og:image" content="https://lsmedia.linker-cdn.net/282170/2024/1.png?d=400x400">
</head><body>
<h1 class="product-title">Pure Copper Water Bottle with 1000ml Capacity</h1>
<img src="https://lsmedia.linker-cdn.net/282170/2024/1.png?d=415x415" alt="product gallery">
<img src="https://lsmedia.linker-cdn.net/282170/2024/2.jpeg" alt="product gallery">
<img src="https://lsmedia.linker-cdn.net/282170/2024/2.jpeg?d=82x108" alt="product gallery">
<div class="tab-content bg-white"> Additional Information Enjoy the Benefits of Pure Copper.
Savor the health advantages of using a copper water bottle. Sleek Design and Easy
Maintenance. With a chic matt finish, our copper bottle adds elegance. Customer reviews 0 Reviews
</div>
</body></html>
"""


def test_parse_product_page():
    p = parse_product_page("https://newlookimpex.linker.store/products/x", FIXTURE)
    assert p["name"] == "Pure Copper Water Bottle with 1000ml Capacity"
    assert p["meta_description"] == "A copper bottle page."
    # gallery deduped to full-size bases, og first
    assert p["images"] == ["https://lsmedia.linker-cdn.net/282170/2024/1.png",
                           "https://lsmedia.linker-cdn.net/282170/2024/2.jpeg"]
    assert "Additional Information" in p["description"]
    assert "Customer reviews" not in p["description"]


def test_sanitize_strips_claims():
    dirty = ("Enjoy the Benefits of Pure Copper. Savor the health advantages. "
             "Sleek Design and Easy Maintenance. With a chic matt finish, our copper "
             "bottle adds elegance. It is 99.9% pure and leak proof guaranteed.")
    clean, had = sanitize_description(dirty)
    assert had is True
    assert "99.9%" not in clean and "leak proof" not in clean
    assert "antibacterial" not in clean.lower()
    assert "matt finish" in clean  # honest design sentence kept
    assert len(clean) > 20


def test_sanitize_empty_and_clean_inputs():
    assert sanitize_description("") == ("", False)
    ok, had = sanitize_description("Hammered copper jug with lid and two tumblers.")
    assert had is False and "Hammered" in ok


def test_category_mapping():
    assert map_category("Pure Copper Water Bottle") == ("copper-bottles", "Copper")
    assert map_category("Copper Dispenser with Stand") == ("copper-kitchenware", "Copper")
    assert map_category("Copper Moscow Mule Mug") == ("copper-mugs-tumblers", "Copper")
    assert map_category("Bedside Jar with Glass") == ("copper-bottles", "Copper")
    cat, mat = map_category("Exquisite Moroccan Lanterns")
    assert cat == "metal-lanterns" and mat == ""  # metal unstated


def test_finish_and_seo():
    assert finish_from_name("Black Antique Engraving Design") == "Antique black"
    assert finish_from_name("Hammered Bottle") == "Hammered"
    assert finish_from_name("Plain Bottle") == ""
    title, desc, primary, secondaries = seo_for("Pure Copper Water Bottle with 1000ml Capacity",
                                               "copper-bottles")
    assert len(title) <= 60 and len(desc) <= 155
    assert primary == "copper bottles wholesale"
    assert "antibacterial" not in desc.lower()
