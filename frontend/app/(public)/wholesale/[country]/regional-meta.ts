import type { Metadata } from "next";
import type { CountryConfig } from "./country-data";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://newlookimpex.example";

/** Metadata for a top-level regional page (canonical = the short /xx path).
 *  Reuses the shared country config so copy stays in one place. */
export function regionalMetadata(cfg: CountryConfig, path: string): Metadata {
  const description = cfg.intro[0].slice(0, 155);
  const url = `${SITE.replace(/\/$/, "")}/${path}`;
  return {
    title: `${cfg.h1} | New Look Impex`,
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
