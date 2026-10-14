import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/public/States";
import SearchClient from "./SearchClient";

export const metadata: Metadata = {
  title: "Search the Catalogue",
  description:
    "Search the New Look Impex wholesale catalogue by product name, SKU, category, material or keyword.",
  alternates: { canonical: "https://newlookimpex.store/search" },
  openGraph: {
    title: "Search the Catalogue — New Look Impex",
    description: "Search handcrafted brass and copper décor by name, SKU, category or material.",
    type: "website",
    url: "https://newlookimpex.store/search",
  },
};

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container-x section"><Loading label="Loading search…" /></div>}>
      <SearchClient />
    </Suspense>
  );
}
