"use client";
import { FilteredProductPage, fetchFiltered } from "@/components/public/FilteredProductPage";

export default function GiftingPage() {
  return (
    <FilteredProductPage
      title="Gifting"
      subtitle="Corporate & festival gifting — wholesale brass and copper pieces suitable for bulk gift programmes."
      editorial={{
        heading: "Gifting at wholesale volumes",
        paragraphs: [
          "Brass and copper pieces are a distinctive choice for corporate and festival gifting. Our gifting range draws from across the catalogue — diyas, lanterns, urlis and homeware — and each product page lists MOQ and lead time so you can plan around your event date.",
          "For large programmes, quantities above standard MOQ are quoted individually. Add the items and quantities you need to the RFQ cart and include your delivery timeframe in the notes.",
          "Custom engraving, packaging or branding requirements can be described in the customisation enquiry form — we quote them like any wholesale order.",
        ],
      }}
      fetchProducts={() =>
        fetchFiltered(
          new URLSearchParams({ q: "gifting", page_size: "24" }),
          new URLSearchParams({ q: "gift", page_size: "24" })
        )
      }
      ctaHref="/request-quote"
      ctaLabel="Request a gifting quote"
    />
  );
}
