"use client";
import { FilteredProductPage, fetchFiltered } from "@/components/public/FilteredProductPage";

export default function CopperCollectionPage() {
  return (
    <FilteredProductPage
      title="Copper Collection"
      subtitle="Wholesale copper homeware and décor — kitchenware, vessels and statement pieces."
      editorial={{
        heading: "About our copper range",
        paragraphs: [
          "Copper brings warmth and patina to any space. Our copper range covers vessels, kitchenware and decorative pieces, each listed with material, finish and dimensions where available.",
          "As with all our ranges, wholesale pricing is quoted per order — MOQ, finish selection and shipping destination are confirmed in your quote before production begins.",
          "For bulk quantities or export orders, start an RFQ from any product page or request a full catalogue quote.",
        ],
      }}
      fetchProducts={() =>
        fetchFiltered(
          new URLSearchParams({ material: "copper", page_size: "24" }),
          new URLSearchParams({ q: "copper", page_size: "24" })
        )
      }
      ctaHref="/wholesale"
      ctaLabel="How wholesale RFQ works"
    />
  );
}
