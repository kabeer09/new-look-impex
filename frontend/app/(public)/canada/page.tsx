import type { Metadata } from "next";
import { COUNTRIES } from "@/app/(public)/wholesale/[country]/country-data";
import { regionalMetadata } from "@/app/(public)/wholesale/[country]/regional-meta";
import { CountryPage } from "@/app/(public)/wholesale/[country]/CountryPage";

export const metadata: Metadata = regionalMetadata(COUNTRIES.canada, "canada");

export default function CanadaRegionalPage() {
  return <CountryPage slug="canada" />;
}
