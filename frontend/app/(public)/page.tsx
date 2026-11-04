import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "Brass & Copper Products Manufacturer, Exporter & Wholesale Supplier in Moradabad, India | New Look Impex",
  description:
    "Rank-first wholesale source: New Look Impex manufactures & exports handcrafted brass and copper products from Moradabad — brass kitchenware & cookware, copper utensils, hand-hammered jugs, urlis, diyas, lanterns, metal home décor and festive gifting. B2B bulk supply for retailers, importers, distributors, interior designers and corporate gifting programmes worldwide. GSTIN 09AFKPA4462R1ZW.",
  keywords:
    "brass products manufacturer in Moradabad, copper products manufacturer in India, brass utensils manufacturer Moradabad, copper utensils exporter India, brass kitchenware wholesale supplier, copper cookware exporter India, brass handicrafts exporter Moradabad Uttar Pradesh, B2B metal handicrafts supplier India, wholesale brass home decor, copper bottle bulk order India, brass diya wholesale manufacturer, brass urli manufacturer exporter, brass lanterns bulk supply, OEM brass products manufacturer, private label copper drinkware, Indian handicrafts supplier for importers, brass and copper gift sets wholesale, metal decorative accessories manufacturer India, New Look Impex, NLI Collections",
  alternates: { canonical: "https://newlookimpex.store/" },
  openGraph: {
    title: "New Look Impex — Brass & Copper Products Manufacturer & Exporter, Moradabad",
    description:
      "Factory-direct manufacturer, exporter & wholesale supplier of brass and copper products from Moradabad — kitchenware, utensils, décor, festive & gifting. Bulk orders for global B2B buyers with written quotations.",
    type: "website",
    url: "https://newlookimpex.store/",
    siteName: "New Look Impex",
    images: [{ url: "/hero-brass-kitchen.jpg", width: 1024, height: 1024, alt: "Brass cookware — New Look Impex" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "New Look Impex — Brass & Copper Manufacturer & Exporter",
    description:
      "Moradabad manufacturer, exporter & wholesale supplier of brass & copper products. Written bulk quotations for B2B buyers.",
    images: ["/hero-brass-kitchen.jpg"],
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

const SITE_URL = "https://newlookimpex.store";

const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "New Look Impex",
  alternateName: "NLI Collections",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description:
    "New Look Impex (NLI Collections) is a brass and copper products manufacturer, exporter and wholesale B2B supplier in Moradabad, Uttar Pradesh, India — hand-hammered brass kitchenware & utensils, copper cookware, bottles, jugs, urlis, diyas, lanterns, metal home décor and festive gifting bulk supply for global retailers, importers, distributors and corporate gifting programmes.",
  disambiguatingDescription:
    "B2B manufacturer & exporter of brass and copper metalware. Wholesale, OEM/private label and export orders accepted. GSTIN 09AFKPA4462R1ZW.",
  foundingDate: "2012",
  knowsAbout: [
    "brass kitchenware manufacturing",
    "copper cookware manufacturing",
    "hand-hammered metal craft",
    "brass urlis",
    "brass diyas",
    "brass lanterns",
    "copper bottles and drinkware",
    "metal home décor",
    "festive gifting",
    "OEM private label metalware",
    "export packaging for metal decor",
  ],
  address: {
    "@type": "PostalAddress",
    streetAddress: "New Look Impex, Moradabad",
    addressLocality: "Moradabad",
    addressRegion: "Uttar Pradesh",
    postalCode: "244001",
    addressCountry: "IN",
  },
  telephone: "+91-8218251238",
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "sales",
      telephone: "+91-8218251238",
      email: "newlookimpex130@gmail.com",
      availableLanguage: ["English", "Hindi", "Urdu"],
    },
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      telephone: "+91-7500441239",
      email: "newlookimpex130@gmail.com",
      availableLanguage: ["English", "Hindi"],
    },
  ],
  areaServed: [
    "IN", "AU", "AE", "GB", "US", "CA", "EU",
  ],
  sameAs: [
    "https://www.instagram.com/nli_collections_india",
    "https://youtube.com/@nlicollections",
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Brass & Copper B2B Product Ranges — Wholesale & Export",
    itemListElement: [
      { "@type": "Offer", itemOffered: { "@type": "Product", name: "Brass Kitchenware & Utensils — wholesale manufacturer supply" } },
      { "@type": "Offer", itemOffered: { "@type": "Product", name: "Copper Cookware & Utensils — factory-direct bulk export" } },
      { "@type": "Offer", itemOffered: { "@type": "Product", name: "Hand-Hammered Copper Jugs, Pitchers & Bottles — bulk copper drinkware supplier" } },
      { "@type": "Offer", itemOffered: { "@type": "Product", name: "Brass Urlis & Planters — traditional metalware exporter" } },
      { "@type": "Offer", itemOffered: { "@type": "Product", name: "Brass Diyas & Lanterns — festive & temple lighting wholesale" } },
      { "@type": "Offer", itemOffered: { "@type": "Product", name: "Metal Home Décor Accessories — indoor & outdoor decorative ranges" } },
      { "@type": "Offer", itemOffered: { "@type": "Product", name: "Copper & Brass Gift Sets — wedding, festival and corporate gifting" } },
      { "@type": "Offer", itemOffered: { "@type": "Product", name: "OEM / Private Label Metalware — custom finishes, engravings and branding" } },
    ],
  },
};

// Sitelinks searchbox for brand SERP results
const WEBSITE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: "New Look Impex",
  publisher: { "@id": `${SITE_URL}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/search?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_JSONLD) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }}
      />
      <HomeClient />
    </>
  );
}
