import type { Metadata } from "next";
import { CompareClient } from "./CompareClient";

export const metadata: Metadata = {
  title: "Compare Products",
  description:
    "Compare up to four New Look Impex wholesale products side by side — price, MOQ, material, finish and specifications.",
  alternates: { canonical: "https://www.newlookimpex.store/compare" },
  openGraph: {
    title: "Compare Products — New Look Impex",
    description: "Side-by-side comparison of shortlisted brass and copper wholesale products.",
    type: "website",
    url: "https://www.newlookimpex.store/compare",
  },
};

export default function ComparePage() {
  return <CompareClient />;
}
