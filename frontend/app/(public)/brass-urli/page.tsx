import type { Metadata } from "next";
import { DedicatedCategoryPage } from "@/components/public/DedicatedCategoryPage";

export const metadata: Metadata = {
  title: "Brass Urlis & Diyas Wholesale — Manufacturer from Moradabad India",
  description:
    "Wholesale brass urlis and diyas from New Look Impex — manufacturer and exporter of traditional Indian brass urlis, diyas and festive lighting from Moradabad, India. Bulk B2B pricing. GSTIN 09AFKPA4462R1ZW.",
  alternates: { canonical: "https://www.newlookimpex.store/brass-urli" },
  openGraph: {
    title: "Brass Urlis & Diyas Wholesale — Manufacturer India | New Look Impex",
    description: "Brass urlis and diyas manufacturer and exporter from Moradabad, India — traditional festive lighting wholesale.",
    type: "website",
    url: "https://www.newlookimpex.store/brass-urli",
  },
};

export default function BrassUrliPage() {
  return (
    <DedicatedCategoryPage
      title="Brass Urlis & Diyas — Wholesale Manufacturer from Moradabad, India"
      description="New Look Impex manufactures and exports hand-hammered brass urlis, diyas and festive lighting from Moradabad, India. Wholesale pricing quoted per order for B2B buyers worldwide."
      h1="Brass Urlis & Diyas — Wholesale Manufacturer & Exporter from Moradabad"
      intro="New Look Impex is a brass products manufacturer based in Moradabad, Uttar Pradesh, India. We supply hand-hammered brass urlis, diyas and traditional festive lighting at wholesale prices quoted per order. Our products are exported to retailers, importers, wholesalers and corporate buyers globally."
      filterParams={{ q: "urli", page_size: "24" }}
      ctaLabel="Request Brass Urlis Wholesale Quote"
      ctaHref="/request-quote"
      relatedLinks={[
        { label: "Brass Lanterns", href: "/brass-lanterns/" },
        { label: "Brass Handicrafts", href: "/brass-handicrafts/" },
        { label: "Brass Utensils", href: "/products?material=Brass" },
      ]}
      faqs={[
        {
          q: "What is the MOQ for wholesale brass urlis and diyas?",
          a: "MOQs vary by product and finish. Each product page lists its MOQ; custom and bulk quantities are quoted per enquiry.",
        },
        {
          q: "Do you export brass urlis and diyas internationally?",
          a: "Yes. We handle bulk and export enquiries from buyers worldwide. Each order receives a written quotation with price, MOQ, lead time, and shipping terms.",
        },
        {
          q: "Can brass urlis and diyas be customised?",
          a: "Yes. Custom sizes, finishes, engravings, and private labelling are available. Customization is quoted like any wholesale order.",
        },
      ]}
    />
  );
}
