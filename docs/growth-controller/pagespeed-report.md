# PageSpeed report — 2026-11-28

**No scores are claimed.** No successful PageSpeed Insights response was obtained
in this environment and `PAGESPEED_API_KEY` is not configured locally.

Targets (Google "good" thresholds): LCP <= 2.5s, INP < 200ms, CLS <= 0.1.

Pages to baseline on mobile and desktop:
`/`, `/products`, `/copper-bottles`, `/brass-handicrafts`, `/copper-kitchenware`,
`/usa`, `/uk`, `/europe/germany`, a product detail page, `/request-quote`, `/blog`.

Implementation: `growth.service._pagespeed_baseline` returns `not_configured`
until the key is set, then creates an owned, deduped controller task. No synthetic
scores, no content removal to chase a score.
