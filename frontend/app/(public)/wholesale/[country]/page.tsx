import type { Metadata } from "next";
import { COUNTRIES } from "./country-data";
import { CountryPage } from "./CountryPage";

// Country slugs for the 6 supported regions
const COUNTRY_SLUGS = Object.keys(COUNTRIES) as string[];

export const dynamic = "force-static";

export function generateStaticParams() {
  return COUNTRY_SLUGS.map((country) => ({ country }));
}

export async function generateMetadata({
  params,
}: {
  params: { country: string };
}): Promise<Metadata> {
  const cfg = COUNTRIES[params.country];
  if (!cfg) {
    return {
      title: "Wholesale",
      description: "New Look Impex wholesale",
    };
  }
  const description = cfg.intro[0]?.slice(0, 155) || "Wholesale copper & brass products";
  return {
    title: `${cfg.h1} | New Look Impex`,
    description,
    keywords: cfg.keywords,
    alternates: { canonical: `https://newlookimpex.store/wholesale/${cfg.slug}` },
    openGraph: {
      title: `${cfg.h1} — New Look Impex`,
      description,
      type: "website",
      url: `https://newlookimpex.store/wholesale/${cfg.slug}`,
    },
  };
}

export default function WholesaleCountryPage({ params }: { params: { country: string } }) {
  const country = params.country as keyof typeof COUNTRIES;
  const cfg = COUNTRIES[country];
  if (!cfg) {
    return <div>Wholesale country page</div>;
  }
  return (
    <div className="wholesale-country-page">
      <h1>{cfg.h1}</h1>
      <p>{cfg.intro?.[0]}</p>
      <p>Slug: {cfg.slug}</p>
    </div>
  );
}