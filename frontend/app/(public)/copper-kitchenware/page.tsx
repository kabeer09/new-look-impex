import type { Metadata } from "next";
import { DedicatedCategoryPage } from "@/components/public/DedicatedCategoryPage";

export const metadata: Metadata = {
  title: "Copper Kitchenware Manufacturer — Wholesale from Moradabad India",
  description:
    "Wholesale copper kitchenware from New Look Impex — hand-hammered copper cookware, pots, pans and serveware manufacturer in Moradabad, India. Bulk B2B pricing for retailers and distributors. GSTIN 09AFKPA4462R1ZW.",
  alternates: { canonical: "https://www.newlookimpex.store/copper-kitchenware" },
  openGraph: {
    title: "Copper Kitchenware Manufacturer — Wholesale India | New Look Impex",
    description: "Hand-hammered copper kitchenware manufacturer and exporter from Moradabad, India — wholesale cookware, pots, pans and serveware.",
    type: "website",
    url: "https://www.newlookimpex.store/copper-kitchenware",
  },
};

export default function CopperKitchenwarePage() {
  return (
    <DedicatedCategoryPage
      title="Copper Kitchenware — Wholesale Manufacturer from Moradabad"
      description="New Look Impex manufactures and exports hand-hammered copper kitchenware — cookware, pots, pans, serveware and tabletop pieces — from Moradabad, India. Wholesale pricing quoted per order for B2B buyers worldwide."
      h1="Copper Kitchenware — Wholesale Manufacturer & Exporter from Moradabad"
      intro="New Look Impex is a brass and copper products manufacturer based in Moradabad, Uttar Pradesh, India. We supply hand-hammered copper kitchenware including cookware, pots, pans, serveware and tabletop pieces at wholesale prices quoted per order. Our products are exported to retailers, importers, wholesalers and corporate buyers globally."
      filterParams={{ material: "Copper", q: "kitchenware", page_size: "24" }}
      ctaLabel="Request Copper Kitchenware Wholesale Quote"
      ctaHref="/request-quote"
      relatedLinks={[
        { label: "Copper Bottles", href: "/copper-bottles/" },
        { label: "Brass Kitchenware", href: "/products?material=Brass" },
        { label: "Copper Drinkware", href: "/products?material=Copper" },
      ]}
      faqs={[
        {
          q: "What is the MOQ for wholesale copper kitchenware?",
          a: "MOQs vary by product and finish. Each product page lists its MOQ; custom and bulk quantities are quoted per enquiry.",
        },
        {
          q: "Do you export copper kitchenware internationally?",
          a: "Yes. We handle bulk and export enquiries from buyers worldwide. Each order receives a written quotation with price, MOQ, lead time, and shipping terms.",
        },
        {
          q: "Can copper kitchenware be customised?",
          a: "Yes. Custom sizes, finishes, engravings, and private labelling are available. Customization is quoted like any wholesale order.",
        },
      ]}
    />
  );
}
