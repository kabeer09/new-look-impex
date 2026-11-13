import type { Metadata } from "next";
import { COUNTRIES } from "@/app/(public)/wholesale/[country]/country-data";
import { regionalMetadata } from "@/app/(public)/wholesale/[country]/regional-meta";
import { CountryPage } from "@/app/(public)/wholesale/[country]/CountryPage";
import { fetchRegionalProducts } from "@/app/(public)/wholesale/[country]/regional-products";

export const metadata: Metadata = regionalMetadata(COUNTRIES.au, "au");
export const revalidate = 300;

export default async function AustraliaRegionalPage() {
  const products = await fetchRegionalProducts("au");
  return <CountryPage slug="au" initialProducts={products} />;
}
