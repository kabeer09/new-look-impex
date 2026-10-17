"""SEO backfill/cleanup for draft products created by earlier imports.

Fixes real issues found in the imported drafts:

* HTML entities leaked from the source site (``&amp;`` instead of ``&``).
* Titles/descriptions hard-cut mid-word at 60/155 chars by the original
  importer, and titles that degraded to brand-only text after claim-trimming.
* Thin keyword tags (2-3 words) topped up to 4 with category-appropriate
  B2B wholesale keywords.

Claim policy for merchant-derived text (names, source SEO): drop factual,
unverifiable claims (purity, health, certification, leak-proof, eco) but keep
the merchant's own stylistic naming (e.g. "handcrafted" — they are a
handicrafts manufacturer). Copy generated from scratch is screened the same way.
"""
from __future__ import annotations

from html import unescape

from app.merchant_ai_images import DESC_MAX, TITLE_MAX, shorten

# Factual claims that must never be published without verification.
HARD_CLAIMS = (
    "99.", "% pure", "purity", "antibacterial", "ayurved", "health benefit",
    "health advantage", "immunity", "healing", "leak proof", "leak-proof",
    "fda", "certified", "certification", "bpa", "dishwasher", "microwave",
    "guarantee", "eco-friendly", "eco friendly", "sustainable",
)

# Words dropped from the front of a product name only when the title would
# otherwise not fit — pure marketing filler, no keyword value.
_FILLER = ("exquisite", "elegant", "luxurious", "premium", "decorous")

_BRAND = {"new", "look", "impex"}

# Words a well-formed meta description must not end on (cut-off evidence).
_DANGLING = {"a", "an", "the", "for", "of", "and", "to", "in", "on", "with",
             "from", "at", "by", "or", "our", "is", "are", "your"}

# B2B wholesale keyword pools per category (no claims, no invented specs).
CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "copper-bottles": [
        "copper bottles wholesale", "copper water bottle supplier",
        "copper drinkware bulk orders", "Moradabad copperware manufacturer",
    ],
    "copper-kitchenware": [
        "copper kitchenware wholesale", "copper dispenser supplier",
        "copper kitchenware bulk orders", "Moradabad copperware manufacturer",
    ],
    "copper-mugs-tumblers": [
        "copper mugs wholesale", "copper tumblers supplier",
        "copper drinkware bulk orders", "Moradabad copperware manufacturer",
    ],
    "brass-kitchenware": [
        "brass kitchenware wholesale", "brass utensils supplier",
        "brass kitchenware bulk orders", "Moradabad brassware manufacturer",
    ],
    "metal-lanterns": [
        "metal lanterns wholesale", "decorative lanterns supplier",
        "lanterns for retail", "Moradabad metalware manufacturer",
    ],
}

_FALLBACK_KEYWORDS = [
    "wholesale handicrafts", "handicrafts supplier",
    "bulk orders welcome", "Moradabad manufacturer",
]

_SEGMENT_SPLIT = "—|\u2013•\u2022"

# Word-level claim stems — any word containing these is removed from names
# before building generated SEO copy (e.g. "Ayurvedic" -> dropped).
_CLAIM_STEMS = ("99.", "pure", "%", "antibacterial", "ayurved", "health",
                "benefit", "immunity", "healing", "leak", "certif", "bpa",
                "dishwasher", "microwave", "guarantee", "eco-friendly",
                "sustainable", "fda", "purity", "properties")

# Leftover preposition + article tails (e.g. "... dispenser for a lifestyle")
# are dropped once their claim words are removed — a keyword tail must not
# become a broken phrase. "for your X" is kept (reads naturally).
_TAIL_PREP = {"for", "with", "of", "in", "on", "to"}
_TAIL_ART = {"a", "an", "the"}


def unescape_text(text: str) -> str:
    """Decode HTML entities (``&amp;`` -> ``&``) and normalise whitespace."""
    if not text:
        return ""
    return " ".join(unescape(text).split())


def has_hard_claim(text: str) -> bool:
    low = (text or "").lower()
    return any(w in low for w in HARD_CLAIMS)


def _segments(text: str) -> list[str]:
    out, buf = [], ""
    for ch in text:
        if ch in _SEGMENT_SPLIT or (ch == "-" and buf.endswith(" ")):
            if buf.strip():
                out.append(buf.strip().lstrip("- ").strip())
            buf = ""
        else:
            buf += ch
    if buf.strip():
        out.append(buf.strip().lstrip("- ").strip())
    return [s for s in out if s]


def _strip_dangling(text: str) -> str:
    """Remove dangling tail words while preserving sentence punctuation."""
    period = text.rstrip().endswith((".", "!", "?"))
    words = text.rstrip(" .;,!").split()
    while words and words[-1].lower().strip(".,;") in _DANGLING:
        words.pop()
    out = " ".join(words)
    if period and out:
        out += "."
    return out


def _core_name(name: str) -> str:
    """Product name reduced to its keyword core: brand tokens, claim words
    and separators removed, dangling tail words stripped."""
    words: list[str] = []
    for w in name.split():
        lw = w.lower().strip(".,;()|")
        if not lw or lw in _BRAND:
            continue
        if any(stem in lw for stem in _CLAIM_STEMS):
            continue
        w = w.strip("\u2014\u2013-")
        if w:
            words.append(w)
    # drop broken connector tails left behind by claim-word removal
    while len(words) >= 3 and words[-3].lower().strip(".,;") in _TAIL_PREP \
            and words[-2].lower().strip(".,;") in _TAIL_ART:
        words = words[:-3]
    core = _strip_dangling(" ".join(words))
    return core or "Product"


def clean_seo(text: str, limit: int) -> str:
    """Drop claim-bearing segments, cut at a word boundary, no dangling tail.

    Keeps claim-free wording as-is — this is a cleanup, not a rewrite.
    """
    if not text:
        return ""
    kept = [s for s in _segments(text) if not has_hard_claim(s)]
    joined = " \u2014 ".join(kept).strip(" \u2014")
    return _strip_dangling(shorten(joined, limit)) if joined else ""


def generate_seo_title(name: str) -> str:
    """Rebuild a broken title from the product name.

    Uses the leading segment (the actual product noun phrase), drops leading
    marketing filler if needed to fit, and appends the B2B keyword "Wholesale".
    """
    core = _core_name(name)
    core = " ".join(core.split())
    filler_words = core.split()
    while len(filler_words) > 1 and filler_words[0].lower().strip(".,") in _FILLER \
            and len(core) > TITLE_MAX - len(" \u2014 Wholesale"):
        filler_words.pop(0)
        core = " ".join(filler_words)
    core = shorten(core, TITLE_MAX - len(" \u2014 Wholesale"))
    # drop marketing filler that shorten() may have left as the last word
    words = core.split()
    while len(words) > 1 and words[-1].lower().strip(".,") in _FILLER:
        words.pop()
    core = " ".join(words)
    return _strip_dangling(f"{core} \u2014 Wholesale")[:TITLE_MAX]


def generate_seo_description(name: str, category_slug: str = "") -> str:
    """Fallback meta description built from complete sentences.

    Tries the richest wholesale framing first and degrades gracefully so the
    text always ends on a real sentence — never a mid-phrase cut. Packs at
    DESC_MAX - 3 so a generated value never trips ``description_needs_regen``.
    """
    core = _core_name(name).lower()
    cat = category_slug.replace("-", " ").strip() or "products"
    limit = DESC_MAX - 3
    chain = [
        (f"Wholesale {core} from Moradabad, India for retailers, importers "
         f"and gifting buyers. Enquire for pricing and MOQ."),
        (f"Wholesale {core} from Moradabad, India for our {cat} range. "
         f"Enquire for pricing and MOQ."),
        f"Wholesale {core} from Moradabad, India. Enquire for pricing and MOQ.",
    ]
    for base in chain:
        if len(base) <= limit:
            return base
    # pathological (very long) name: word-boundary cut, always end with "."
    out = _strip_dangling(shorten(chain[-1], DESC_MAX - 1))
    if out and not out.endswith((".", "!", "?")):
        out += "."
    return out


def title_needs_regen(title: str, name: str) -> bool:
    """Detect unusable titles: empty, too short, hard-cut, mid-word, brand-only."""
    if not title or not title.strip():
        return True
    words = title.split()
    if len(words) < 3:
        return True
    if len(title) >= TITLE_MAX:  # legacy importer hard-cut at exactly the cap
        return True
    # ends with a fragment of a longer word in the name -> mid-word cut
    last = words[-1].strip(".,;()").lower()
    name_words = [w.strip(".,;()").lower() for w in name.split() if w.strip(".,;()")]
    if last and any(w.startswith(last) and len(w) > len(last) for w in name_words):
        return True
    # contains no product word from the name (brand-only residue)
    title_core = {w.strip(".,;()").lower() for w in words} - _BRAND
    name_core = [w for w in name_words if w not in _BRAND]
    if name_core and not (set(name_core) & title_core):
        return True
    return False


def description_needs_regen(desc: str) -> bool:
    """Detect unusable meta descriptions: empty, hard-cut, clipped, no ending."""
    if not desc or not desc.strip():
        return True
    if len(desc) >= DESC_MAX - 2:  # legacy [:155] hard cut
        return True
    if not desc.rstrip().endswith((".", "!", "?")):  # cut off mid-sentence
        return True
    # legacy cut that clipped the standard audience phrase mid-list
    if "retailers, importers" in desc and "gifting buyers" not in desc:
        return True
    last = desc.rstrip(" .;,!").split()[-1].lower().strip(".,;") if desc.split() else ""
    if last in _DANGLING:
        return True
    return False


def top_up_tags(existing: list[str], category_slug: str = "",
                limit: int = 4) -> list[str]:
    """Keep existing keywords, append unique category keywords up to `limit`."""
    out: list[str] = []
    seen: set[str] = set()
    for tag in list(existing) + list(CATEGORY_KEYWORDS.get(category_slug, [])) \
            + _FALLBACK_KEYWORDS:
        t = " ".join(str(tag).split()).lower()
        if t and t not in seen:
            seen.add(t)
            out.append(t)
        if len(out) >= limit:
            break
    return out
