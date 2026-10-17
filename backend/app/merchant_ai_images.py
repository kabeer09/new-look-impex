"""Merchant-supplied product photos (AI-generated renders) -> draft catalogue.

The merchant provided 16 Gemini-generated product images for their copper
drinkware line. Rules honoured here:

* Originals in the merchant's Downloads folder are NEVER modified — the script
  reads bytes, re-encodes a working copy to JPEG (site performance; several
  source PNGs exceed the 8 MB upload cap), and leaves the source file untouched.
* Every image is tagged with rights_source "ai_generated" so provenance is
  reviewable in admin, per the store's "no AI substitutes for real photos"
  publishing rule. Products are created as DRAFTS — a human must verify each
  against the actual physical product before publishing.
* No invented facts: no capacity, dimensions, weight, MOQ, price, purity,
  certifications, or health claims. Copy describes only what is visible.
* SEO fields are length-capped (title <= 60, meta description <= 155) and
  screened against a banned-claims list (enforced by unit tests).
"""
from __future__ import annotations

import io
import re

TITLE_MAX = 60
DESC_MAX = 155

RIGHTS_SOURCE = "ai_generated"
RIGHTS_NOTE = ("AI-generated product image supplied by the merchant (Google Gemini) "
               "— verify against the physical product before publishing")

# Words that would turn a product page into an unverifiable claim.
CLAIM_BANNED = (
    "99.", "% pure", "purity", "antibacterial", "ayurved", "health benefit",
    "immunity", "healing", "leak proof", "leak-proof", "fda", "certified",
    "certification", "bpa", "dishwasher", "microwave", "guarantee",
    "eco-friendly", "eco friendly", "sustainable", "handcrafted", " handmade",
)

# Full file list the merchant attached (16 files). 15 become product photos,
# the wide line-up shot becomes a homepage banner.
ATTACHED_FILES = [
    "Gemini_Generated_Image_3o07x3o07x3o07x3.png",
    "Gemini_Generated_Image_4dcdqi4dcdqi4dcd.png",
    "Gemini_Generated_Image_4tiwxh4tiwxh4tiw.png",
    "Gemini_Generated_Image_546m9k546m9k546m.png",
    "Gemini_Generated_Image_790ktt790ktt790k.png",
    "Gemini_Generated_Image_8awe7r8awe7r8awe.png",
    "Gemini_Generated_Image_b36vdqb36vdqb36v.png",
    "Gemini_Generated_Image_b7oy0lb7oy0lb7oy.png",
    "Gemini_Generated_Image_cuxvr9cuxvr9cuxv.png",
    "Gemini_Generated_Image_d2pavwd2pavwd2pa.png",
    "Gemini_Generated_Image_djh41hdjh41hdjh4.png",
    "Gemini_Generated_Image_fn77f1fn77f1fn77.png",
    "Gemini_Generated_Image_lgsebulgsebulgse.png",
    "Gemini_Generated_Image_n2s7jyn2s7jyn2s7.png",
    "Gemini_Generated_Image_ufjr0bufjr0bufjr.png",
    "Gemini_Generated_Image_vd9nhhvd9nhhvd9n.png",
]

BANNER_FILE = "Gemini_Generated_Image_djh41hdjh41hdjh4.png"

BANNER = {
    "file": BANNER_FILE,
    "title": "The Antique Engraved Collection",
    "subtitle": "Floral-engraved copper drinkware in antique and bright finishes — wholesale from Moradabad, India",
    "cta_text": "Explore the catalogue",
    "cta_link": "/catalogue",
    "alt": "Line-up of antique engraved copper bottles, jars and tumblers from the New Look Impex collection",
}

# Visible-only descriptions; each entry: images as (file, alt_text).
PLAN: list[dict] = [
    {
        "key": "classic-hammered",
        "name": "Classic Hammered Copper Water Bottle",
        "category": "copper-bottles",
        "material": "Copper",
        "finish": "Hammered",
        "short_description": "Copper water bottle with an all-over hammered pattern and knurled screw cap.",
        "description": (
            "A copper water bottle finished with an all-over hammered pattern and a "
            "knurled screw cap. Part of our wholesale copper drinkware range for "
            "retailers, importers and gifting buyers. Capacity, dimensions and MOQ "
            "are confirmed per order — please enquire."),
        "seo_title": "Hammered Copper Water Bottle — Wholesale",
        "seo_description": "Wholesale hammered copper water bottle for retailers, importers and gifting buyers. Enquire for pricing, MOQ and lead time.",
        "tags": ["hammered copper bottle", "copper water bottle wholesale",
                 "copper bottles for retailers", "copper drinkware wholesale"],
        "images": [
            ("Gemini_Generated_Image_4dcdqi4dcdqi4dcd.png",
             "Hammered copper water bottle with knurled screw cap on a wooden tray"),
            ("Gemini_Generated_Image_4tiwxh4tiwxh4tiw.png",
             "Hammered copper water bottle with the cap removed, beside the bottle"),
        ],
    },
    {
        "key": "honeycomb",
        "name": "Honeycomb Pattern Copper Water Bottle",
        "category": "copper-bottles",
        "material": "Copper",
        "finish": "Honeycomb pattern",
        "short_description": "Copper water bottle with a raised honeycomb body pattern and knurled screw cap.",
        "description": (
            "A copper water bottle with a raised honeycomb pattern across the body "
            "and a knurled screw cap. Offered to retailers, importers and gifting "
            "buyers on a wholesale basis. Capacity, dimensions and MOQ are "
            "confirmed per order — please enquire."),
        "seo_title": "Honeycomb Copper Water Bottle — Wholesale",
        "seo_description": "Wholesale honeycomb-pattern copper water bottle for retailers and importers. Distinct textured finish. Enquire for pricing and MOQ.",
        "tags": ["honeycomb copper bottle", "textured copper water bottle",
                 "copper bottle wholesale", "copper drinkware supplier"],
        "images": [
            ("Gemini_Generated_Image_8awe7r8awe7r8awe.png",
             "Copper water bottle with a honeycomb pattern body and screw cap resting beside it"),
        ],
    },
    {
        "key": "fine-hammered",
        "name": "Fine Hammered Copper Water Bottle",
        "category": "copper-bottles",
        "material": "Copper",
        "finish": "Fine hammered",
        "short_description": "Copper water bottle with a fine hammered texture and knurled screw cap.",
        "description": (
            "A copper water bottle with a fine, closely spaced hammered texture and "
            "a knurled screw cap. Part of the wholesale copper drinkware range for "
            "retailers, importers and gifting buyers. Capacity, dimensions and MOQ "
            "are confirmed per order — please enquire."),
        "seo_title": "Fine Hammered Copper Bottle — Wholesale",
        "seo_description": "Wholesale fine-hammered copper water bottle for retailers, importers and gifting buyers. Enquire for pricing, MOQ and lead time.",
        "tags": ["fine hammered copper bottle", "copper water bottle wholesale",
                 "copper bottles for retailers", "copper drinkware wholesale"],
        "images": [
            ("Gemini_Generated_Image_b36vdqb36vdqb36v.png",
             "Copper water bottle with a fine hammered texture, on a cream backdrop"),
        ],
    },
    {
        "key": "hammered-base",
        "name": "Copper Water Bottle with Hammered Base",
        "category": "copper-bottles",
        "material": "Copper",
        "finish": "Smooth with hammered base",
        "short_description": "Copper water bottle with a smooth body and a hammered lower section.",
        "description": (
            "A copper water bottle with a smooth upper body and a hammered lower "
            "section, finished with a knurled screw cap. Offered wholesale to "
            "retailers, importers and gifting buyers. Capacity, dimensions and MOQ "
            "are confirmed per order — please enquire."),
        "seo_title": "Hammered Base Copper Bottle — Wholesale",
        "seo_description": "Wholesale copper water bottle with smooth body and hammered base. A two-texture finish for retail shelves. Enquire for MOQ.",
        "tags": ["hammered base copper bottle", "copper water bottle wholesale",
                 "two-tone copper bottle", "copper drinkware supplier"],
        "images": [
            ("Gemini_Generated_Image_n2s7jyn2s7jyn2s7.png",
             "Copper water bottle with a smooth body and hammered lower section"),
        ],
    },
    {
        "key": "antique-engraved",
        "name": "Antique Floral Engraved Copper Water Bottle",
        "category": "copper-bottles",
        "material": "Copper",
        "finish": "Antique engraved",
        "short_description": "Antique-finish copper water bottle with an all-over floral engraving band.",
        "description": (
            "A copper water bottle in an antique dark finish with an all-over "
            "floral engraving band and a knurled screw cap. Part of the wholesale "
            "engraved copper drinkware range for retailers, importers and gifting "
            "buyers. Capacity, dimensions and MOQ are confirmed per order — please "
            "enquire."),
        "seo_title": "Antique Engraved Copper Bottle — Wholesale",
        "seo_description": "Wholesale antique-engraved copper water bottle with floral detailing for retailers and importers. Enquire for pricing, MOQ and lead time.",
        "tags": ["antique engraved copper bottle", "floral copper water bottle",
                 "engraved copper bottle wholesale", "copper drinkware supplier"],
        "images": [
            ("Gemini_Generated_Image_790ktt790ktt790k.png",
             "Antique-finish copper water bottle with floral engraving, on a wooden surface"),
            ("Gemini_Generated_Image_fn77f1fn77f1fn77.png",
             "Antique floral engraved copper water bottle, front view on a wooden board"),
        ],
    },
    {
        "key": "bottle-glasses-set",
        "name": "Engraved Copper Bottle and Glasses Gift Set",
        "category": "copper-bottles",
        "material": "Copper",
        "finish": "Antique engraved",
        "short_description": "Engraved copper water bottle shown with matching copper drinking glasses.",
        "description": (
            "An engraved copper water bottle shown with matching copper drinking "
            "glasses in coordinating antique and bright finishes. Offered as a "
            "gift-set configuration to retailers, importers and gifting buyers on "
            "a wholesale basis. Set contents, capacity and MOQ are confirmed per "
            "order — please enquire."),
        "seo_title": "Engraved Copper Bottle Set — Wholesale",
        "seo_description": "Wholesale engraved copper water bottle with matching glasses — a gift-set configuration for retailers and gifting buyers. Enquire for MOQ.",
        "tags": ["copper bottle gift set", "engraved copper set",
                 "copper glasses set wholesale", "copper drinkware gift set"],
        "images": [
            ("Gemini_Generated_Image_546m9k546m9k546m.png",
             "Antique engraved copper water bottle with two matching engraved copper glasses"),
            ("Gemini_Generated_Image_lgsebulgsebulgse.png",
             "Engraved copper water bottle shown with a matching copper tumbler"),
        ],
    },
    {
        "key": "duo-set",
        "name": "Engraved Copper Water Bottle Duo Set",
        "category": "copper-bottles",
        "material": "Copper",
        "finish": "Engraved — antique and bright",
        "short_description": "Two engraved copper water bottles shown side by side in antique and bright finishes.",
        "description": (
            "Two engraved copper water bottles shown side by side — one in an "
            "antique dark finish, one in a bright copper finish — both with "
            "all-over engraving and knurled screw caps. A two-piece configuration "
            "for retailers, importers and gifting buyers. Capacity and MOQ are "
            "confirmed per order — please enquire."),
        "seo_title": "Engraved Copper Bottle Duo Set — Wholesale",
        "seo_description": "Wholesale two-piece engraved copper bottle set in antique and bright finishes. A ready gift configuration for retailers. Enquire for MOQ.",
        "tags": ["copper bottle set of 2", "engraved copper bottle duo",
                 "copper bottle gift set wholesale", "copper drinkware supplier"],
        "images": [
            ("Gemini_Generated_Image_b7oy0lb7oy0lb7oy.png",
             "Pair of engraved copper water bottles in antique dark and bright copper finishes"),
        ],
    },
    {
        "key": "trio-engraved",
        "name": "Three-Piece Engraved Copper Bottle Set",
        "category": "copper-bottles",
        "material": "Copper",
        "finish": "Engraved — dark finishes",
        "short_description": "Set of three engraved copper water bottles in coordinating dark finishes.",
        "description": (
            "A set of three engraved copper water bottles in coordinating dark "
            "finishes, each with an all-over engraved pattern and screw cap. "
            "Offered as a three-piece configuration to retailers, importers and "
            "gifting buyers on a wholesale basis. Capacity and MOQ are confirmed "
            "per order — please enquire."),
        "seo_title": "3-Piece Engraved Copper Bottle Set",
        "seo_description": "Wholesale three-piece engraved copper bottle set in dark finishes. A multi-bottle gift configuration for retailers. Enquire for MOQ.",
        "tags": ["copper bottle set of 3", "engraved copper bottle set",
                 "copper bottle gift set wholesale", "copper drinkware supplier"],
        "images": [
            ("Gemini_Generated_Image_d2pavwd2pavwd2pa.png",
             "Set of three engraved copper water bottles in gunmetal, copper and black finishes"),
        ],
    },
    {
        "key": "mixed-trio",
        "name": "Copper Water Bottle Trio — Mixed Finishes",
        "category": "copper-bottles",
        "material": "Copper",
        "finish": "Mixed — smooth, hammered and striped",
        "short_description": "Three copper water bottles shown together in smooth, hammered and striped finishes.",
        "description": (
            "Three copper water bottles shown together — smooth, hammered and "
            "fine-striped finishes — each with a knurled screw cap. A mixed-finish "
            "configuration for retailers, importers and gifting buyers. Capacity "
            "and MOQ are confirmed per order — please enquire."),
        "seo_title": "Copper Bottle Trio, Mixed Finishes — Wholesale",
        "seo_description": "Wholesale set of copper water bottles in smooth, hammered and striped finishes. Mixed-finish display set for retailers. Enquire for MOQ.",
        "tags": ["copper bottle set of 3", "mixed finish copper bottles",
                 "copper water bottle wholesale", "copper drinkware supplier"],
        "images": [
            ("Gemini_Generated_Image_3o07x3o07x3o07x3.png",
             "Trio of copper water bottles in smooth, hammered and striped finishes"),
        ],
    },
    {
        "key": "bedside-jar",
        "name": "Antique Engraved Copper Bedside Jar",
        "category": "copper-bottles",
        "material": "Copper",
        "finish": "Antique engraved",
        "short_description": "Antique-finish copper jar with lid and an engraved body band.",
        "description": (
            "A copper jar in an antique dark finish with a fitted lid and an "
            "engraved body band; shown alongside a matching engraved bottle in one "
            "view. Part of the wholesale engraved copperware range for retailers, "
            "importers and gifting buyers. Capacity and dimensions are confirmed "
            "per order — please enquire."),
        "seo_title": "Antique Engraved Copper Jar — Wholesale",
        "seo_description": "Wholesale antique-engraved copper bedside jar with lid for retailers, importers and gifting buyers. Enquire for pricing, MOQ and lead time.",
        "tags": ["antique copper jar", "engraved copper jar wholesale",
                 "copper storage jar", "copper home decor wholesale"],
        "images": [
            ("Gemini_Generated_Image_ufjr0bufjr0bufjr.png",
             "Antique engraved copper jar with fitted lid on a stone slab"),
            ("Gemini_Generated_Image_cuxvr9cuxvr9cuxv.png",
             "Antique-finish copper jar with engraved lower body, on a stone board"),
            ("Gemini_Generated_Image_vd9nhhvd9nhhvd9n.png",
             "Antique engraved copper jar shown beside a matching engraved bottle"),
        ],
    },
]


# ---------------- pure helpers (unit-tested) ----------------

def shorten(text: str, limit: int) -> str:
    """Cut at a word boundary so meta tags never exceed `limit` characters."""
    text = " ".join(text.split())
    if len(text) <= limit:
        return text
    cut = text[:limit].rsplit(" ", 1)[0].rstrip(" ,;—-")
    return cut


def assert_seo_clean(text: str) -> None:
    """Raise if `text` contains an unverifiable claim (defence in depth)."""
    low = text.lower()
    for word in CLAIM_BANNED:
        if word in low:
            raise ValueError(f"SEO copy contains banned claim fragment: {word!r}")


def validate_plan(plan: list[dict] | None = None) -> list[str]:
    """Validate the product plan. Returns list of product keys (order kept).

    Enforces: unique keys/names, SEO length caps, banned-claim screening,
    and that every referenced image file is in ATTACHED_FILES and used
    exactly once across the plan plus the banner.
    """
    plan = PLAN if plan is None else plan
    keys, names, used = [], set(), []
    for entry in plan:
        key = entry["key"]
        if key in keys:
            raise ValueError(f"duplicate plan key: {key}")
        keys.append(key)
        if entry["name"] in names:
            raise ValueError(f"duplicate product name: {entry['name']}")
        names.add(entry["name"])
        for field, limit in (("seo_title", TITLE_MAX), ("seo_description", DESC_MAX)):
            val = entry[field]
            if len(val) > limit:
                raise ValueError(f"{key}: {field} exceeds {limit} chars ({len(val)})")
            assert_seo_clean(val)
        assert_seo_clean(entry["description"])
        assert_seo_clean(entry["short_description"])
        if not entry["images"]:
            raise ValueError(f"{key}: no images")
        for fname, alt in entry["images"]:
            if fname not in ATTACHED_FILES:
                raise ValueError(f"{key}: unknown image file {fname}")
            if not alt or len(alt) > 512:
                raise ValueError(f"{key}: bad alt text for {fname}")
            used.append(fname)
    if BANNER["file"] not in ATTACHED_FILES:
        raise ValueError("banner file not in ATTACHED_FILES")
    used.append(BANNER["file"])
    if sorted(used) != sorted(ATTACHED_FILES):
        missing = set(ATTACHED_FILES) - set(used)
        extra = set(used) - set(ATTACHED_FILES)
        raise ValueError(f"plan/attached mismatch: missing={missing} extra={extra}")
    dupes = {f for f in used if used.count(f) > 1}
    if dupes:
        raise ValueError(f"image files used more than once: {dupes}")
    return keys


def compress_to_jpeg(content: bytes, quality: int = 90,
                     max_side: int = 2400) -> tuple[bytes, str]:
    """Working-copy encoder: PNG/photo bytes -> compact JPEG.

    Originals are never touched; this operates on in-memory bytes. Oversized
    source PNGs (some exceed the 8 MB upload cap) become well under it, and the
    result is friendlier for page loads. Returns (jpeg_bytes, content_type).
    """
    from PIL import Image
    img = Image.open(io.BytesIO(content))
    img = img.convert("RGB")
    if max(img.size) > max_side:
        img.thumbnail((max_side, max_side), Image.LANCZOS)
    out = io.BytesIO()
    img.save(out, format="JPEG", quality=quality, optimize=True, progressive=True)
    return out.getvalue(), "image/jpeg"


def jpeg_filename(plan_key: str, index: int) -> str:
    """Deterministic working-copy filename, e.g. classic-hammered-1.jpg."""
    return f"{re.sub(r'[^a-z0-9-]+', '-', plan_key.lower()).strip('-')}-{index + 1}.jpg"
