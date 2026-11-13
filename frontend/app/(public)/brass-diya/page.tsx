import type { Metadata } from "next";
import { DedicatedCategoryPage } from "@/components/public/DedicatedCategoryPage";

export const metadata: Metadata = {
  title: "Brass Diyas Wholesale — Manufacturer from Moradabad India",
  description:
    "Wholesale brass diyas from New Look Impex — manufacturer and exporter of traditional Indian brass diyas, oil lamps and festive lighting from Moradabad, India. Bulk B2B pricing for retailers and distributors. GSTIN 09AFKPA4462R1ZW.",
  alternates: { canonical: "https://www.newlookimpex.store/brass-diya" },
  openGraph: {
    title: "Brass Diyas Wholesale — Manufacturer India | New Look Impex",
    description: "Brass diyas manufacturer and exporter from Moradabad, India — traditional oil lamps and festive lighting wholesale.",
    type: "website",
    url: "https://www.newlookimpex.store/brass-diya",
  },
};

export default function BrassDiyasPage() {
  return (
    <DedicatedCategoryPage
      title="Brass Diyas — Wholesale Manufacturer from Moradabad, India"
      description="New Look Impex manufactures and exports hand-hammered brass diyas, oil lamps and festive lighting from Moradabad, India. Factory-direct wholesale pricing for B2B buyers worldwide."
      h1="Brass Diyas — Wholesale Manufacturer & Exporter from Moradabad"
      intro="New Look Impex is a brass products manufacturer based in Moradabad, Uttar Pradesh, India. We supply hand-hammered brass diyas, oil lamps and traditional festive lighting at wholesale prices quoted per order. Our products are exported to retailers, importers, wholesalers and corporate buyers globally."
      filterParams={{ q: "diya", page_size: "24" }}
      ctaLabel="Request Brass Diyas Wholesale Quote"
      ctaHref="/request-quote"
      relatedLinks={[
        { label: "Brass Lanterns", href: "/brass-lanterns/" },
        { label: "Brass Urlis & Diyas", href: "/brass-urli/" },
        { label: "Brass Handicrafts", href: "/brass-handicrafts/" },
      ]}
      faqs={[
        {
          q: "What is the MOQ for wholesale brass diyas?",
          a: "MOQs vary by product and finish. Each product page lists its MOQ; custom and bulk quantities are quoted per enquiry.",
        },
        {
          q: "Do you export brass diyas internationally?",
          a: "Yes. We handle bulk and export enquiries from buyers worldwide. Each order receives a written quotation with price, MOQ, lead time, and shipping terms.",
        },
        {
          q: "Can brass diyas be customised?",
          a: "Yes. Custom sizes, finishes, engravings, and private labelling are available. Customization is quoted like any wholesale order.",
        },
      ]}
    />
  );
}
