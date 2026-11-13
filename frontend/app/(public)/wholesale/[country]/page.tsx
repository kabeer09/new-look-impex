import type { Metadata } from "next";
import { COUNTRIES } from "./country-data";
import { CountryPage } from "./CountryPage";
import { fetchRegionalProducts } from "./regional-products";

// Country slugs for the 6 supported regions
const COUNTRY_SLUGS = Object.keys(COUNTRIES) as string[];

export const dynamic = "force-static";

export function generateStaticParams() {
  return COUNTRY_SLUGS.map((country) => ({ country }));
}

/** Short canonical regional URL for each country slug (e.g. usa -> /usa). */
const SHORT_URL: Record<string, string> = {
  usa: "/usa",
  uk: "/uk",
  uae: "/uae",
  australia: "/au",
  au: "/au",
  canada: "/canada",
  europe: "/europe",
};

export async function generateMetadata({
  params,
}: {
  params: { country: string };
}): Promise<Metadata> {
  const cfg = COUNTRIES[params.country];
  if (!cfg) {
    return {
      title: { absolute: "Wholesale Country Not Found | New Look Impex" },
      robots: { index: false, follow: false },
    };
  }
  const description = cfg.intro[0]?.slice(0, 155) || "Wholesale copper & brass products";
  const shortPath = SHORT_URL[params.country] || `/wholesale/${cfg.slug}`;
  return {
    // layout template appends " | New Look Impex" — keep it out of the value
    title: cfg.h1,
    description,
    keywords: cfg.keywords,
    // This route duplicates the short regional URL (/usa, /uk, …), which is
    // the canonical, sitemap-listed page. Point the canonical there so the
    // pair consolidates instead of competing in the index.
    alternates: { canonical: `https://www.newlookimpex.store${shortPath}` },
    robots: { index: false, follow: true },
    openGraph: {
      title: `${cfg.h1} — New Look Impex`,
      description,
      type: "website",
      url: `https://www.newlookimpex.store${shortPath}`,
    },
  };
}

export default async function WholesaleCountryPage({ params }: { params: { country: string } }) {
  const country = params.country as keyof typeof COUNTRIES;
  const cfg = COUNTRIES[country];
  if (!cfg) {
    return <div>Wholesale country page</div>;
  }
  // Same full content as the short regional URL — canonical there.
  const products = await fetchRegionalProducts(cfg.slug);
  return <CountryPage slug={cfg.slug} initialProducts={products} />;
}
