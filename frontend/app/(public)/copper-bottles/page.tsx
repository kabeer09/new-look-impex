import type { Metadata } from "next";
import { DedicatedCategoryPage } from "@/components/public/DedicatedCategoryPage";

export const metadata: Metadata = {
  title: "Copper Bottles Manufacturer — Wholesale Copper Drinkware from Moradabad, India",
  description:
    "Buy wholesale copper bottles direct from New Look Impex, a manufacturer and exporter based in Moradabad, India. Hand-hammered copper bottles, jugs and tumblers for retailers, importers and corporate gifting. GSTIN 09AFKPA4462R1ZW.",
  alternates: { canonical: "https://newlookimpex.store/copper-bottles/" },
  openGraph: {
    title: "Copper Bottles Manufacturer — Wholesale from Moradabad | New Look Impex",
    description: "Hand-hammered copper bottles, jugs and tumblers — wholesale manufacturer and exporter from Moradabad, India.",
    type: "website",
    url: "https://newlookimpex.store/copper-bottles/",
  },
};

export default function CopperBottlesPage() {
  return (
    <DedicatedCategoryPage
      title="Copper Bottles — Wholesale Manufacturer from Moradabad, India"
      description="New Look Impex manufactures and exports hand-hammered copper bottles, jugs, tumblers and drinkware from Moradabad, Uttar Pradesh. Factory-direct wholesale pricing for B2B buyers worldwide."
      h1="Copper Bottles — Wholesale Manufacturer & Exporter from Moradabad"
      intro="New Look Impex is a brass and copper products manufacturer based in Moradabad, India. We supply hand-hammered copper bottles, water bottles, jugs and tumblers at factory-direct wholesale prices. Every piece is crafted by skilled artisans and exported globally to retailers, importers, wholesalers and corporate gifting programmes."
      filterParams={{ material: "Copper", q: "bottle", page_size: "24" }}
      ctaLabel="Request Wholesale Quote for Copper Bottles"
      ctaHref="/request-quote"
      relatedLinks={[
        { label: "Copper Kitchenware", href: "/copper-kitchenware/" },
        { label: "Copper Drinkware", href: "/products?material=Copper" },
        { label: "Brass Utensils", href: "/brass-urli/" },
      ]}
      faqs={[
        {
          q: "What is the MOQ for wholesale copper bottles?",
          a: "MOQs vary by product and finish. Each product page lists its MOQ; custom and bulk quantities are quoted per enquiry.",
        },
        {
          q: "Do you export copper bottles internationally?",
          a: "Yes. We handle bulk and export enquiries from buyers worldwide. Each order receives a written quotation with price, MOQ, lead time, and shipping terms.",
        },
        {
          q: "Can copper bottles be customised?",
          a: "Yes. Custom sizes, finishes, engravings, and private labelling are available. Customization is quoted like any wholesale order.",
        },
      ]}
    />
  );
}
