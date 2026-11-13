import type { Metadata } from "next";
import { DedicatedCategoryPage } from "@/components/public/DedicatedCategoryPage";

export const metadata: Metadata = {
  title: "Brass Home Décor Wholesale — Manufacturer from Moradabad India",
  description:
    "Wholesale brass home décor from New Look Impex — manufacturer and exporter of brass urlis, diyas, lanterns, vases and decorative items from Moradabad, India. Bulk B2B pricing for retailers and distributors. GSTIN 09AFKPA4462R1ZW.",
  alternates: { canonical: "https://www.newlookimpex.store/brass-home-decor" },
  openGraph: {
    title: "Brass Home Décor Wholesale — Manufacturer India | New Look Impex",
    description: "Brass home décor manufacturer and exporter from Moradabad, India — urlis, diyas, lanterns and decorative items wholesale.",
    type: "website",
    url: "https://www.newlookimpex.store/brass-home-decor",
  },
};

export default function BrassHomeDecorPage() {
  return (
    <DedicatedCategoryPage
      title="Brass Home Décor — Wholesale Manufacturer from Moradabad, India"
      description="New Look Impex manufactures and exports hand-hammered brass home décor — urlis, diyas, lanterns, vases and decorative pieces — from Moradabad, India. Factory-direct wholesale pricing for B2B buyers worldwide."
      h1="Brass Home Décor — Wholesale Manufacturer & Exporter from Moradabad"
      intro="New Look Impex is a brass products manufacturer based in Moradabad, Uttar Pradesh, India. We supply hand-hammered brass home décor including urlis, diyas, lanterns, vases, planters and decorative pieces at wholesale prices quoted per order. Our products are exported to retailers, importers, wholesalers and corporate buyers globally."
      filterParams={{ q: "home decor", page_size: "24" }}
      ctaLabel="Request Brass Home Décor Wholesale Quote"
      ctaHref="/request-quote"
      relatedLinks={[
        { label: "Brass Lanterns", href: "/brass-lanterns/" },
        { label: "Brass Urlis & Diyas", href: "/brass-urli/" },
        { label: "Brass Handicrafts", href: "/brass-handicrafts/" },
      ]}
      faqs={[
        {
          q: "What is the MOQ for wholesale brass home décor?",
          a: "MOQs vary by product and finish. Each product page lists its MOQ; custom and bulk quantities are quoted per enquiry.",
        },
        {
          q: "Do you export brass home décor internationally?",
          a: "Yes. We handle bulk and export enquiries from buyers worldwide. Each order receives a written quotation with price, MOQ, lead time, and shipping terms.",
        },
        {
          q: "Can brass home décor be customised?",
          a: "Yes. Custom sizes, finishes, engravings, and private labelling are available. Customization is quoted like any wholesale order.",
        },
      ]}
    />
  );
}
