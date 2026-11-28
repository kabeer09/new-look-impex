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
    <>
      {/* Server-rendered so crawlers get a real H1 and an honest description
          before the interactive catalogue mounts. */}
      <section className="container-x pt-10 pb-2">
        <h1 className="font-serif font-bold text-navy text-3xl md:text-4xl">
          Wholesale Brass &amp; Copper Products Catalogue
        </h1>
        <p className="text-gray mt-3 max-w-3xl text-sm leading-relaxed">
          Browse New Look Impex&apos;s handcrafted brass and copper homeware, kitchenware,
          décor and gifting ranges from Moradabad, India. Search by product, category,
          material or finish, then request a wholesale quotation or product catalogue
          for bulk and export enquiries.
        </p>
      </section>
      <Suspense fallback={<div className="container-x section"><Loading label="Loading catalogue…" /></div>}>
        <CatalogueClient />
      </Suspense>
    </>
  );
}
