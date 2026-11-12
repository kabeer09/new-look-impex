import type { Metadata } from "next";
import type { CountryConfig } from "./country-data";

const SITE = "https://www.newlookimpex.store";

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
    alternates: { canonical: url },
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
