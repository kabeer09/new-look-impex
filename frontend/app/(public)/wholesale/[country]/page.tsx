import type { Metadata } from "next";
import { COUNTRIES, COUNTRY_SLUGS } from "./country-data";
import { CountryPage } from "./CountryPage";

export function generateStaticParams() {
  return COUNTRY_SLUGS.map((country) => ({ country }));
}

export async function generateMetadata({
  params,
}: {
  params: { country: string };
}): Promise<Metadata> {
  const cfg = COUNTRIES[params.country];
  if (!cfg) return { title: "Wholesale" };
  const description = cfg.intro[0].slice(0, 155);
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
  return <CountryPage slug={params.country} />;
}
