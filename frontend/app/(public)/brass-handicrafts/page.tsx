import type { Metadata } from "next";
import { DedicatedCategoryPage } from "@/components/public/DedicatedCategoryPage";

export const metadata: Metadata = {
  title: "Brass Handicrafts Manufacturer — Wholesale from Moradabad India",
  description:
    "Wholesale brass handicrafts from New Look Impex — manufacturer and exporter of brass urlis, diyas, lanterns, décor and gifting from Moradabad, India. Bulk B2B pricing. GSTIN 09AFKPA4462R1ZW.",
  alternates: { canonical: "https://newlookimpex.store/brass-handicrafts/" },
  openGraph: {
    title: "Brass Handicrafts Manufacturer — Wholesale India | New Look Impex",
    description: "Brass handicrafts manufacturer and exporter from Moradabad, India — urlis, diyas, lanterns, décor and festive gifting wholesale.",
    type: "website",
    url: "https://newlookimpex.store/brass-handicrafts/",
  },
};

export default function BrassHandicraftsPage() {
  return (
    <DedicatedCategoryPage
      title="Brass Handicrafts — Wholesale Manufacturer from Moradabad, India"
      description="New Look Impex manufactures and exports hand-hammered brass handicrafts — urlis, diyas, lanterns, vases, décor and festive pieces — from Moradabad, India. Factory-direct wholesale pricing for B2B buyers worldwide."
      h1="Brass Handicrafts — Wholesale Manufacturer & Exporter from Moradabad"
      intro="New Look Impex is a brass and copper products manufacturer based in Moradabad, Uttar Pradesh, India. We supply hand-hammered brass handicrafts including urlis, diyas, lanterns, decorative pieces and festive gifting items at factory-direct wholesale prices. Our products are exported to retailers, importers, wholesalers and corporate buyers globally."
      filterParams={{ material: "Brass", page_size: "24" }}
      ctaLabel="Request Brass Handicrafts Wholesale Quote"
      ctaHref="/request-quote"
      relatedLinks={[
        { label: "Brass Lanterns", href: "/brass-lanterns/" },
        { label: "Brass Urlis & Diyas", href: "/brass-urli/" },
        { label: "Brass Utensils", href: "/products?material=Brass" },
      ]}
      faqs={[
        {
          q: "What is the MOQ for wholesale brass handicrafts?",
          a: "MOQs vary by product and finish. Each product page lists its MOQ; custom and bulk quantities are quoted per enquiry.",
        },
        {
          q: "Do you export brass handicrafts internationally?",
          a: "Yes. We handle bulk and export enquiries from buyers worldwide. Each order receives a written quotation with price, MOQ, lead time, and shipping terms.",
        },
        {
          q: "Can brass handicrafts be customised?",
          a: "Yes. Custom sizes, finishes, engravings, and private labelling are available. Customization is quoted like any wholesale order.",
        },
      ]}
    />
  );
}
