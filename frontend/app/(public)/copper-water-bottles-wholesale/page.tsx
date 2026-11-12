import type { Metadata } from "next";
import { DedicatedCategoryPage } from "@/components/public/DedicatedCategoryPage";

export const metadata: Metadata = {
  title: "Copper Water Bottles Wholesale — Manufacturer & Exporter India",
  description:
    "Wholesale copper water bottles from New Look Impex — hand-hammered copper drinkware manufacturer in Moradabad, India. Bulk pricing for retailers, importers and exporters. GSTIN 09AFKPA4462R1ZW.",
  alternates: { canonical: "https://www.newlookimpex.store/copper-water-bottles-wholesale" },
  openGraph: {
    title: "Copper Water Bottles Wholesale — Manufacturer India | New Look Impex",
    description: "Wholesale copper water bottles and drinkware — hand-hammered manufacturer from Moradabad, India.",
    type: "website",
    url: "https://www.newlookimpex.store/copper-water-bottles-wholesale",
  },
};

export default function CopperWaterBottlesWholesalePage() {
  return (
    <DedicatedCategoryPage
      title="Copper Water Bottles Wholesale — Manufacturer from India"
      description="New Look Impex supplies wholesale copper water bottles, jugs and tumblers direct from our Moradabad workshop. Bulk pricing, MOQ details and written quotations for B2B buyers."
      h1="Copper Water Bottles Wholesale — Hand-Hammered Manufacturer India"
      intro="Buy wholesale copper water bottles direct from New Look Impex — a Moradabad-based manufacturer and exporter of hand-hammered copper drinkware. We supply copper bottles, jugs, tumblers and drinkware sets to retailers, importers, wellness shops and corporate gifting programmes worldwide. Every enquiry receives a written quotation with MOQ, lead time, and shipping terms."
      filterParams={{ material: "Copper", q: "water bottle", page_size: "24" }}
      ctaLabel="Request Copper Water Bottle Wholesale Quote"
      ctaHref="/request-quote"
      relatedLinks={[
        { label: "Copper Bottles", href: "/copper-bottles/" },
        { label: "Copper Kitchenware", href: "/copper-kitchenware/" },
        { label: "Copper Drinkware", href: "/products?material=Copper" },
      ]}
      faqs={[
        {
          q: "What is the wholesale MOQ for copper water bottles?",
          a: "MOQs vary by product and finish. Each product page lists its MOQ; custom and bulk quantities are quoted per enquiry.",
        },
        {
          q: "Do you ship copper water bottles outside India?",
          a: "Yes. We handle export enquiries from buyers worldwide with written quotations covering price, MOQ, lead time, packaging, and shipping terms.",
        },
        {
          q: "Can I request private label copper water bottles?",
          a: "Yes. Private label and OEM manufacturing are available for bulk orders. Discuss your requirements via Request a Quote.",
        },
      ]}
    />
  );
}
