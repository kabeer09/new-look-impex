import type { Metadata } from "next";
import { COUNTRIES } from "@/app/(public)/wholesale/[country]/country-data";
import { regionalMetadata } from "@/app/(public)/wholesale/[country]/regional-meta";
import { CountryPage } from "@/app/(public)/wholesale/[country]/CountryPage";
import { fetchRegionalProducts } from "@/app/(public)/wholesale/[country]/regional-products";

export const metadata: Metadata = regionalMetadata(COUNTRIES.canada, "canada");
export const revalidate = 300;

export default async function CanadaRegionalPage() {
  const products = await fetchRegionalProducts("canada");
  return <CountryPage slug="canada" initialProducts={products} />;
}
