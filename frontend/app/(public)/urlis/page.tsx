"use client";
import { FilteredProductPage, fetchFiltered } from "@/components/public/FilteredProductPage";

export default function UrlisPage() {
  return (
    <FilteredProductPage
      title="Urlis"
      subtitle="Wholesale brass & copper urlis — the traditional Moradabad water vessel, in classic and contemporary finishes."
      editorial={{
        heading: "The Moradabad urli",
        paragraphs: [
          "The urli is one of Moradabad's most recognised brass crafts — a broad, shallow vessel traditionally used for holding water, flowers or as a decorative centrepiece. It remains a staple of wholesale orders from retailers and exporters.",
          "Urlis in our catalogue are listed with material, finish, dimensions and MOQ where available. Finishes and polishes vary by design — check each product page for the exact specification.",
          "Need a specific size or a finish to match an existing range? Send a customisation enquiry with your brief.",
        ],
      }}
      fetchProducts={() =>
        fetchFiltered(
          new URLSearchParams({ category: "urlis", page_size: "24" }),
          new URLSearchParams({ q: "urli", page_size: "24" })
        )
      }
      ctaHref="/customisation"
      ctaLabel="Custom urli enquiry"
    />
  );
}
