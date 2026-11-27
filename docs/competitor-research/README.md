# 30-country competitor SEO research — status & Batch 1 report

**Date:** 2026-11-26 · **Method:** public web search results (search snippets and
the linked public pages), no proprietary traffic/revenue data. **Evidence level:**
"Search-result observation" — URLs and visible page statements were captured from
search results; individual pages were **not** re-fetched line-by-line. Fields not
observed are recorded as `Not captured`, ownership that could not be evidenced is
`Not verified`. No sales, revenue, traffic, ranking, backlink or conversion claim
is made, and no competitor text, image or branding was copied.

## Scope completed

| Batch | Countries | Records captured | Status |
|---|---|---|---|
| 1 | USA, Germany, UK, UAE, France | 29 | ✅ Research pass complete (pilot depth, not a full 10/country audit) |
| 2 | Netherlands, Canada, Italy, Australia, Spain | 0 | ⏳ Not started |
| 3 | Belgium, Switzerland, Saudi Arabia, Japan, Singapore | 0 | ⏳ Not started |
| 4 | Sweden, Denmark, Norway, New Zealand, South Africa | 0 | ⏳ Not started |
| 5 | Poland, Austria, Portugal, Greece, Turkey | 0 | ⏳ Not started |
| 6 | Malaysia, Indonesia, South Korea, Mexico, Brazil | 0 | ⏳ Not started |

**This is not a 300-site study.** The master brief asks for up to 10 per country;
only 29 genuinely relevant, source-linked records were captured in Batch 1.
The remaining batches require further search work and must not be filled with
invented records. Data: `batch1-2026-11-26.csv`.

## What is actually comparable to our catalogue

All 29 records were selected because their public pages show at least one
overlapping family: copper bottles/mugs/jugs/drinkware/kitchenware, brass
bowls/urlis/trays/candle holders/lanterns/diyas/home décor, or metal giftware.
Businesses selling unrelated furniture, jewellery, clothing or electronics were
excluded unless a relevant metalware category was visible.

Indian-origin status was recorded only where the searched page explicitly stated
an India/Moradabad base (e.g. ExportXTrades, Sajida International, Indique
Exports, Om Shiv Export, Angel International, Kaarigar, Blue Roses). A business
selling Indian products was **not** assumed to be Indian-owned.

## Observable terminology by market (use as keyword candidates, not volumes)

| Market | Terms visible on competitor pages | Our matching real categories |
|---|---|---|
| USA | "copper bottles wholesale", "copper water bottle supplier", "brass home decor wholesale", "brass candleholder wholesale", "private label" | copper-bottles, copper-kitchenware, brass-kitchenware, decorative-bowls |
| Germany | "Kupferflaschen Großhandel", "Kupferbecher", "Messing Dekoration", "Kupferkaraffe" | copper bottles, copper drinkware, brass décor |
| UK | "copperware wholesale UK", "copper jug wholesale", "brass giftware", "copper barware" | copper bottles/jugs, brassware, gifting |
| UAE | "brass handicrafts exporter UAE", "brass lantern supplier UAE", "brass Dallah", "luxury lanterns" | brass lanterns, brass kitchenware, decorative bowls, gifting |
| France | "bouteille cuivre en gros", "gourdes cuivre", "décoration laiton", "bols laiton" | copper bottles, brass décor, bowls/trays |

These are **observed competitor phrases**, not Search Console data. Keyword
volume and difficulty remain unvalidated; do not present them as measured.

## Gap hypotheses to verify (not implemented as claims)

1. Competitor pages publish explicit MOQs, lead times and sample policies; our
   country pages state enquiries are quoted per order but rarely show a
   structured buyer FAQ about samples/MOQ. (Verify against real capability
   before adding any number.)
2. German and French competitor pages use local-language product terms; our
   market pages are English-only. Translate only with professional review;
   do not add hreflang to non-equivalent pages.
3. UAE competitors use dedicated country export pages with hospitality/gifting
   positioning; our `/uae` page covers wholesale but does not isolate gifting.
4. US/UK competitors lead with clear bulk tiers and trade accounts; our RFQ flow
   is enquiry-led (correct for our model) but does not surface sample-type
   guidance.

## Honest limitations

- No GSC/GA4 data was accessible in this pass; no impressions, clicks, average
  position, indexed-page count or country traffic is claimed.
- "Rank within shortlist" is a relevance ordering of the captured records, not
  a search-ranking or sales ranking.
- Several records are marketplaces/directories (Faire, wlw, ExpoBazaar); they
  are kept as demand/terminology signals, not as direct supplier competitors.
- Further batches must be researched and recorded in the same CSV format before
  any country-page rewrite is justified.

## Weekly agent review (configured)

`backend/app/agent_scheduler.py` now includes `weekly_competitor_review` and it
is enabled by default (Monday 00:00 UTC tick). It counts records per country in
this folder and reads real GSC keyword rows from the database. If no research
file or no GSC data exists, it reports `not_configured` rather than inventing
results. It can be paused from `/admin/agents/schedules`.
