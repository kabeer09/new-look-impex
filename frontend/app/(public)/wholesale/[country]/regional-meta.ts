import type { Metadata } from "next";
import type { CountryConfig } from "./country-data";

const SITE = "https://www.newlookimpex.store";

/**
 * hreflang cluster for the six market-specific regional pages.
 *
 * These are genuinely localized equivalents of the same page type (each has
 * its own market intro, buyer bullets, FAQs and category emphasis), so they
 * form a reciprocal hreflang set: searchers get the page for their market.
 * The B2B homepage and /nli-collections are NOT part of this cluster —
 * different content, different audience. No x-default is declared for the
 * same reason (it would pull the global B2B page into a consumer cluster).
 */
const REGIONAL_LANGUAGES: Record<string, string> = {
  "en-us": "/usa",
  "en-gb": "/uk",
  "en-ae": "/uae",
  "en-au": "/au",
  "en-ca": "/canada",
  "en-eu": "/europe",
};

/** Metadata for a top-level regional page (canonical = the short /xx path).
 *  Reuses the shared country config so copy stays in one place. */
export function regionalMetadata(cfg: CountryConfig, path: string): Metadata {
  const description = cfg.intro[0].slice(0, 155);
  const url = `${SITE.replace(/\/$/, "")}/${path}`;
  return {
    // layout template appends " | New Look Impex" — keep it out of the value
    title: cfg.h1,
    description,
    keywords: cfg.keywords,
    alternates: { canonical: url, languages: REGIONAL_LANGUAGES },
    openGraph: {
      title: `${cfg.h1} — New Look Impex`,
      description,
      type: "website",
      url,
    },
    twitter: {
      card: "summary_large_image",
      title: `${cfg.h1} | New Look Impex`,
      description,
    },
  };
}
