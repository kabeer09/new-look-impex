import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EUROPE_COUNTRIES, getEuropeCountry } from "./europe-data";
import { europeMetadata } from "./europe-meta";
import { fetchEuropeProducts } from "./europe-products";
import { EuropeCountryPage } from "./EuropeCountryPage";

export const revalidate = 300;

export function generateStaticParams() {
  return EUROPE_COUNTRIES.map((c) => ({ country: c.slug }));
}

export function generateMetadata({ params }: { params: { country: string } }): Metadata {
  const cfg = getEuropeCountry(params.country);
  if (!cfg) return { title: "Europe Markets", alternates: { canonical: "/europe" } };
  return europeMetadata(cfg);
}

export default async function EuropeCountryRoute({ params }: { params: { country: string } }) {
  const cfg = getEuropeCountry(params.country);
  if (!cfg) notFound();
  const products = await fetchEuropeProducts(cfg.slug);
  return <EuropeCountryPage cfg={cfg} initialProducts={products} />;
}
