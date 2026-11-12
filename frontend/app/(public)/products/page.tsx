import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/public/States";
import CatalogueClient from "./CatalogueClient";

export const metadata: Metadata = {
  title: "Shop Products — Wholesale Catalogue",
  description:
    "Browse the New Look Impex wholesale catalogue: handcrafted brass and copper décor searchable by name, SKU, category, material and finish. Request pricing on any piece.",
  alternates: { canonical: "https://www.newlookimpex.store/products" },
  openGraph: {
    title: "Shop Products — New Look Impex Wholesale Catalogue",
    description:
      "Searchable wholesale catalogue of handcrafted brass and copper décor. Filter by category, material and finish.",
    type: "website",
    url: "https://www.newlookimpex.store/products",
  },
};

export const revalidate = 60; // ISR: revalidate every 60 seconds

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="container-x section"><Loading label="Loading catalogue…" /></div>}>
      <CatalogueClient />
    </Suspense>
  );
}
