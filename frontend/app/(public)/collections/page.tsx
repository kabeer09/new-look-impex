import type { Metadata } from "next";
import CollectionsClient from "./CollectionsClient";

export const metadata: Metadata = {
  title: "Collections — Curated Wholesale Ranges",
  description:
    "Browse curated wholesale collections from New Look Impex — brass edits, copper ranges and seasonal selections of handcrafted metal décor.",
  alternates: { canonical: "https://newlookimpex.store/collections" },
  openGraph: {
    title: "Collections — New Look Impex",
    description: "Curated wholesale collections of handcrafted brass and copper décor.",
    type: "website",
    url: "https://newlookimpex.store/collections",
  },
};

export default function CollectionsPage() {
  return <CollectionsClient />;
}
