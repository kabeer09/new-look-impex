import type { Metadata } from "next";
import { DedicatedCategoryPage } from "@/components/public/DedicatedCategoryPage";

export const metadata: Metadata = {
  title: "Brass Lanterns Wholesale — Manufacturer from Moradabad India",
  description:
    "Wholesale brass lanterns from New Look Impex — manufacturer and exporter of hand-hammered brass lanterns, diyas and festive lighting from Moradabad, India. Bulk B2B pricing for retailers and distributors. GSTIN 09AFKPA4462R1ZW.",
  alternates: { canonical: "https://www.newlookimpex.store/brass-lanterns" },
  openGraph: {
    title: "Brass Lanterns Wholesale — Manufacturer India | New Look Impex",
    description: "Brass lanterns manufacturer and exporter from Moradabad, India — hand-hammered festive lighting and diyas wholesale.",
    type: "website",
    url: "https://www.newlookimpex.store/brass-lanterns",
  },
};

export default function BrassLanternsPage() {
  return (
    <DedicatedCategoryPage
      title="Brass Lanterns — Wholesale Manufacturer from Moradabad, India"
      description="New Look Impex manufactures and exports hand-hammered brass lanterns, diyas and festive lighting from Moradabad, India. Factory-direct wholesale pricing for B2B buyers worldwide."
      h1="Brass Lanterns — Wholesale Manufacturer & Exporter from Moradabad"
      intro="New Look Impex is a brass products manufacturer based in Moradabad, Uttar Pradesh, India. We supply hand-hammered brass lanterns, diyas and festive lighting at wholesale prices quoted per order. Our products are exported to retailers, importers, wholesalers and corporate buyers globally."
      filterParams={{ q: "lantern", page_size: "24" }}
      ctaLabel="Request Brass Lanterns Wholesale Quote"
      ctaHref="/request-quote"
      relatedLinks={[
        { label: "Brass Urlis & Diyas", href: "/brass-urli/" },
        { label: "Brass Handicrafts", href: "/brass-handicrafts/" },
        { label: "Brass Utensils", href: "/products?material=Brass" },
      ]}
      faqs={[
        {
          q: "What is the MOQ for wholesale brass lanterns?",
          a: "MOQs vary by product and finish. Each product page lists its MOQ; custom and bulk quantities are quoted per enquiry.",
        },
        {
          q: "Do you export brass lanterns internationally?",
          a: "Yes. We handle bulk and export enquiries from buyers worldwide. Each order receives a written quotation with price, MOQ, lead time, and shipping terms.",
        },
        {
          q: "Can brass lanterns be customised?",
          a: "Yes. Custom sizes, finishes, engravings, and private labelling are available. Customization is quoted like any wholesale order.",
        },
      ]}
    />
  );
}
