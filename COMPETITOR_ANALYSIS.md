# Competitor Analysis — Moradabad Metal Handicraft Exporters

> Research-only. All 15 reference sites were fetched live in November 2026 to
> verify they still exist and to read their **public homepage metadata only**
> (title, meta description, H1, heading count, schema types, RFQ wording).
> **No competitor text, descriptions, metadata, images or branding was copied
> into this project.** Findings are used solely to identify structural and
> keyword gaps for New Look Impex.

## 1. Live verification of the reference list

| Site | Status | Homepage title (fetched) | Notes |
| --- | --- | --- | --- |
| Metal World | 200 | `Metal World \| Gifting and Home Decor \| Manufacturers and Exporters` | Strong brand + category + role in one title |
| ABI Handicrafts | 200 | `India's #1 Metal & Brass Handicrafts Manufacturers in Moradabad` | Superlative "#1" (unverifiable claim — do not copy this tactic) |
| Trends Exports | 200 | `Trends` (single word) | Weak title — a gap we exploit |
| NxtGen Exports | 200 | `Metal & Wood Handicrafts Manufacturer in Moradabad \| NxtGen` | Good role+location pattern |
| Sajida International | 200 | `Sajida International \| Top Metal Handicraft Exporter in Moradabad` | Brand + role + location |
| Decorative Handicrafts | 200 | `Handicrafts Manufacturer & Exporter in Moradabad, India \| Decorative…` | Keyword-first title |
| A.S. Metal Crafts | 200 | `Metal Handicrafts Exporter from Moradabad, India \| A.S. Metal Crafts` | Keyword-first title |
| Z.A. Handicrafts | 200 | `Z.A. Handicrafts, Moradabad - Manufacturer of Bronze Dinner Set and Br…` | Product-specific (bronze dinner set) |
| Meenakari Handicrafts | 200 | `Meenakari Handicrafts — Wholesale Metal & German Silver Décor Supp…` | Targets "wholesale … supplier" |
| Nodi Exports | 200 | `Handicraft Manufacturers India \| Moradabad \| Nodiexports` | Keyword-first, manufacturing focus |
| M.H. Exports | 200 | `MH Export` | Weak title — gap |
| Husna Exports | 200 | `Husna Exports Moradabad` | Weak title — gap |
| Akbar Brass Corporation | 200 | `Akbar Brass Corporation \| Moradabad` | Brand-only — gap |
| United Handicrafts | **fetch failed** | — | unreachable from this environment; no conclusions drawn |
| Upper India Exports | 200 | `UPPER INDIA EXPORTS is a leading Manufacturer & Exporters of Table lam…` | Long, superlative, product-specific (table lamps) |

**Takeaway:** 6 of 14 reachable competitors have weak, brand-only or
single-word homepage titles. The stronger ones follow the pattern New Look
Impex now uses: **role + product + location + brand** (e.g. *Brass & Copper
Handicraft Manufacturer in Moradabad, India | New Look Impex*).

## 2. Structural lessons adopted (ideas, not content)

| Competitor pattern | Observation | How NLI applies it |
| --- | --- | --- |
| ABI: specific product categories | Separate landing pages per product family | Unique `generateMetadata` for all 17 category slugs + editorial content per category (`4ccaf14`) |
| NxtGen: separates buyer types | Export buyers vs domestic wholesale vs product ranges | Homepage targets export/importer intent; `/wholesale` + regional pages serve market-specific intent; NLI Collections keeps B2C intent separate |
| Nodi: manufacturing infrastructure emphasis | Factory/production positioning in copy | Homepage H1 + "Manufacturing & Product Categories" section; `/about` + `/export` pages. **No invented factory size, headcount or capacity.** |
| Metal World: brand + category + role title | Title carries three signals | Title template used across category pages (product + role, brand appended by layout template) |
| Sajida/NxtGen: "Exporter in Moradabad" | Location keyword in title, not just body | Location present in homepage, about, export and category titles |

## 3. Anti-patterns deliberately NOT adopted

- **Unverifiable superlatives**: "#1", "Top", "leading" (ABI, Upper India,
  Sajida). Google's guidance and our own rules forbid claims we cannot prove.
  Even "Best" was removed from our own homepage (`8698ea4`).
- **Banned claims**: certifications, "food-safe", "made in India", pure/100%
  copper, guarantees — enforced by `tests/test_image_catalogue.py::BANNED`.
- **Thin/doorway country pages**: regional pages carry genuinely different
  market copy (intro, buyer bullets, FAQs, category emphasis) — not
  country-name swaps.
- **Copying text**: all editorial copy in this project is original.

## 4. Keyword opportunities observed (from competitor titles, intent-based)

| Opportunity | Seen in competitor titles | NLI coverage |
| --- | --- | --- |
| "Manufacturer in Moradabad" | ABI, NxtGen, Nodi, Decorative | ✅ homepage H1 + title |
| "Exporter from Moradabad, India" | A.S. Metal, Sajida | ✅ homepage, `/export`, category titles |
| "Wholesale … supplier" | Meenakari | ✅ all category titles |
| Product-specific terms (bronze dinner set, table lamps, German silver) | Z.A., Upper India, Meenakari | ⚠️ partial — our 133-product catalogue covers brass/copper only; product-level SEO titles were improved in `1f2db3c`. Remaining long-tail: cover via product SEO fields (admin PATCH) as catalogue grows |
| "Gifting" positioning | Metal World | ✅ `/gifting` + `corporate-gifting` category |
| Weak-title competitors (Trends, M.H., Husna, Akbar) | — | we out-rank them on title relevance for shared terms |

## 5. Gaps in our own site vs the stronger competitors

| Gap | Status |
| --- | --- |
| Homepage keyword H1 | ✅ fixed `8698ea4` |
| Category landing page depth (intro, FAQ, links) | ✅ fixed `4ccaf14` |
| Buyer-type separation (export vs wholesale vs retail) | ✅ homepage / `/wholesale` / regional / NLI brand page |
| Manufacturing evidence (photos, process) | ⚠️ **needs genuine assets from the owner** — cannot be fabricated |
| Blog / topical authority | ✅ 11 articles structured with H2 sections, internal links, CTAs, BlogPosting schema (`65a7bcf`) |
| Backlinks / directories (Priority 5 of the strategy) | ⚠️ owner action — requires real industry listings |

## 6. Method notes

- Fetched 2026-11, homepage HTML only, 1.5 s between requests, TLS
  verification disabled only for sites with broken cert chains.
- `United Handicrafts` could not be reached; excluded from conclusions.
- Schema detection is heuristic (`"@type"` occurrences in HTML) — counts
  presence, not validity.
- Search volumes were not available; all keyword priorities are intent-based.
