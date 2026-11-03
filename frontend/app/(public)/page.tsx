import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "Handcrafted Brass & Copper Décor — Wholesale | New Look Impex",
  description:
    "New Look Impex (Moradabad, India) is a manufacturer and exporter of handcrafted brass and copper home décor — urlis, diyas, lanterns, bottles, cookware and metal home décor. Wholesale and bulk orders for retailers, importers and interior designers. Request pricing.",
  keywords:
    "handcrafted brass decor, copper home decor, Moradabad brass manufacturer, brass urli wholesale, copper bottle wholesale, brass diya bulk, metal home decor wholesale, brass cookware, gifting India",
  alternates: { canonical: "https://newlookimpex.store/" },
  openGraph: {
    title: "New Look Impex — Handcrafted Brass & Copper Décor Wholesale",
    description:
      "Handcrafted brass and copper décor from Moradabad for retailers, importers, interior designers and gifting programmes. Explore the wholesale collection.",
    type: "website",
    url: "https://newlookimpex.store/",
    siteName: "New Look Impex",
    images: [{ url: "/og-home.jpg", width: 1200, height: 630, alt: "New Look Impex brass & copper handicrafts" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "New Look Impex — Handcrafted Brass & Copper Décor Wholesale",
    description:
      "Handcrafted brass & copper décor from Moradabad. Wholesale quotes for bulk orders.",
  },
};

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "Do you ship across India and internationally?", acceptedAnswer: { "@type": "Answer", text: "Yes. We handle domestic (pan-India) and export enquiries. Shipping terms, freight and lead time are confirmed in writing per order based on destination and volume." } },
    { "@type": "Question", name: "What is the minimum order quantity (MOQ)?", acceptedAnswer: { "@type": "Answer", text: "MOQs vary by product and finish. Each product page lists its MOQ; custom or bulk quantities are quoted per enquiry." } },
    { "@type": "Question", name: "Can I request custom sizes, finishes or bespoke designs?", acceptedAnswer: { "@type": "Answer", text: "Yes. Customisation (size, finish, bespoke design) is quoted like any wholesale order." } },
    { "@type": "Question", name: "How do I place a bulk / wholesale order?", acceptedAnswer: { "@type": "Answer", text: "Browse the catalogue, add items to your enquiry list with quantities, and submit a Request a Quote. You receive a reference number and a written quotation." } },
    { "@type": "Question", name: "Are prices listed on the website?", acceptedAnswer: { "@type": "Answer", text: "Pricing is on request (B2B). Every enquiry receives a written per-order quote." } },
  ],
};

const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "New Look Impex",
  url: "https://newlookimpex.store",
  logo: "https://newlookimpex.store/logo.png",
  description:
    "Manufacturer and exporter of handcrafted brass and copper handicrafts from Moradabad, Uttar Pradesh, India.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Moradabad",
    addressRegion: "Uttar Pradesh",
    addressCountry: "IN",
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "sales",
    email: "newlookimpex130@gmail.com",
  },
  sameAs: [],
};

export const revalidate = 60; // ISR: revalidate every 60 seconds

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSONLD) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }}
      />
      <HomeClient />
    </>
  );
}
