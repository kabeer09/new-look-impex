"use client";
import { FilteredProductPage, fetchFiltered } from "@/components/public/FilteredProductPage";

export default function MetalHomeDecorPage() {
  return (
    <FilteredProductPage
      title="Metal Home Décor"
      subtitle="Wholesale metal home décor — brass, copper and mixed-metal pieces for retail and hospitality."
      editorial={{
        heading: "About the décor range",
        paragraphs: [
          "Metal home décor is a broad category: table centrepieces, wall pieces, bowls, trays and sculptural objets in brass, copper and other metals. Use the filters on the shop page to narrow by material, finish or price band.",
          "Dimensions, weight and packaging details are listed per product where the catalogue provides them, so you can plan freight and shelf space before ordering.",
          "Wholesalers and hospitality buyers typically order mixed containers — add several products to your RFQ cart and submit one quote request.",
        ],
      }}
      fetchProducts={() =>
        fetchFiltered(
          new URLSearchParams({ category: "metal-home-decor", page_size: "24" }),
          new URLSearchParams({ q: "home decor", page_size: "24" })
        )
      }
      ctaHref="/request-quote"
      ctaLabel="Request a mixed quote"
    />
  );
}
