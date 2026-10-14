"use client";
import { FilteredProductPage, fetchFiltered } from "@/components/public/FilteredProductPage";

export default function BrassCollectionPage() {
  return (
    <FilteredProductPage
      title="Brass Collection"
      subtitle="Wholesale brass handicrafts from Moradabad — urlis, homeware and décor, quoted per order."
      editorial={{
        heading: "About our brass range",
        paragraphs: [
          "Moradabad in Uttar Pradesh has been a centre of brass craftsmanship for generations, and brass remains the core of our wholesale catalogue — from traditional urlis to contemporary homeware pieces.",
          "Every brass item is listed with its material, finish, dimensions and MOQ where the catalogue provides them. Pricing is quoted per wholesale order, so quantities, finishes and destination all factor into your quote.",
          "Need a specific size, finish or design? Use the customisation enquiry form and we will quote it like any wholesale order.",
        ],
      }}
      fetchProducts={() =>
        fetchFiltered(
          new URLSearchParams({ material: "brass", page_size: "24" }),
          new URLSearchParams({ q: "brass", page_size: "24" })
        )
      }
      ctaHref="/customisation"
      ctaLabel="Request a custom brass piece"
    />
  );
}
