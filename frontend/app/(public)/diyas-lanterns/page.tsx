"use client";
import { FilteredProductPage, fetchFiltered } from "@/components/public/FilteredProductPage";

export default function DiyasLanternsPage() {
  return (
    <FilteredProductPage
      title="Diyas & Lanterns"
      subtitle="Wholesale diyas and metal lanterns for festivals, gifting and retail — brass and copper finishes."
      editorial={{
        heading: "Light for every season",
        paragraphs: [
          "Diyas and lanterns are a core part of the Moradabad metalcraft range — from single-wick diyas to embossed lanterns, in brass and copper with a variety of finishes.",
          "Festival seasons drive bulk orders: add the quantities you need to your RFQ cart and we will confirm lead times in your written quote before production.",
          "Many buyers pair diyas and lanterns with our gifting range for corporate and festival gift programmes.",
        ],
      }}
      fetchProducts={() =>
        fetchFiltered(
          new URLSearchParams({ category: "diyas-lanterns", page_size: "24" }),
          new URLSearchParams({ q: "diya lantern", page_size: "24" })
        )
      }
      ctaHref="/gifting"
      ctaLabel="See the gifting range"
    />
  );
}
