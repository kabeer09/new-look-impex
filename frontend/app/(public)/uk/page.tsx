import type { Metadata } from "next";
import { COUNTRIES } from "@/app/(public)/wholesale/[country]/country-data";
import { regionalMetadata } from "@/app/(public)/wholesale/[country]/regional-meta";
import { CountryPage } from "@/app/(public)/wholesale/[country]/CountryPage";
import { fetchRegionalProducts } from "@/app/(public)/wholesale/[country]/regional-products";

export const metadata: Metadata = regionalMetadata(COUNTRIES.uk, "uk");
export const revalidate = 300;

export default async function UKRegionalPage() {
  const products = await fetchRegionalProducts("uk");
  return <CountryPage slug="uk" initialProducts={products} />;
}
