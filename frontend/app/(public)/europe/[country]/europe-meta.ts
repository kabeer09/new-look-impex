import type { Metadata } from "next";
import type { EuropeCountry } from "./europe-data";
import { marketMetaDescription } from "@/lib/country-seo";

const SITE = "https://www.newlookimpex.store";

/**
 * hreflang cluster for the Europe-market pages. These are the same page
 * type, differentiated by market focus and buyer copy, so they form a
 * reciprocal set. All use `en` (the site is published in English); no x-default
 * is declared because the global B2B homepage is a different page/audience.
 */
export const EUROPE_LANGUAGES: Record<string, string> = {
  "en": "/europe",
  "en-de": "/europe/germany",
  "en-fr": "/europe/france",
  "en-it": "/europe/italy",
  "en-nl": "/europe/netherlands",
  "en-es": "/europe/spain",
  "en-be": "/europe/belgium",
  "en-pl": "/europe/poland",
  "en-se": "/europe/sweden",
  "en-dk": "/europe/denmark",
  "en-at": "/europe/austria",
  "en-ch": "/europe/switzerland",
};

export function europeMetadata(cfg: EuropeCountry): Metadata {
  const path = `/europe/${cfg.slug}`;
  const url = `${SITE}${path}`;
  const description = marketMetaDescription(cfg.h1, cfg.bullets, cfg.focus);
  return {
    // layout template appends " | New Look Impex"
    title: cfg.h1,
    description,
    keywords: cfg.keywords,
    alternates: { canonical: url, languages: EUROPE_LANGUAGES },
    openGraph: { title: `${cfg.h1} — New Look Impex`, description, type: "website", url },
    twitter: { card: "summary_large_image", title: `${cfg.h1} | New Look Impex`, description },
  };
}
