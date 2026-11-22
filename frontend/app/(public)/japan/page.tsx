import type { Metadata } from "next";
import { COUNTRIES } from "@/app/(public)/wholesale/[country]/country-data";
import { regionalMetadata } from "@/app/(public)/wholesale/[country]/regional-meta";
import { CountryPage } from "@/app/(public)/wholesale/[country]/CountryPage";
import { fetchRegionalProducts } from "@/app/(public)/wholesale/[country]/regional-products";

export const metadata: Metadata = regionalMetadata(COUNTRIES.japan, "japan");
export const revalidate = 300;

export default async function JapanRegionalPage() {
  const products = await fetchRegionalProducts("japan");
  return <CountryPage slug="japan" initialProducts={products} />;
}
