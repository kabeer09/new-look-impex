import type { Metadata } from "next";
import { COUNTRIES } from "@/app/(public)/wholesale/[country]/country-data";
import { regionalMetadata } from "@/app/(public)/wholesale/[country]/regional-meta";
import { CountryPage } from "@/app/(public)/wholesale/[country]/CountryPage";
import { fetchRegionalProducts } from "@/app/(public)/wholesale/[country]/regional-products";

export const metadata: Metadata = regionalMetadata(COUNTRIES.singapore, "singapore");
export const revalidate = 300;

export default async function SingaporeRegionalPage() {
  const products = await fetchRegionalProducts("singapore");
  return <CountryPage slug="singapore" initialProducts={products} />;
}
