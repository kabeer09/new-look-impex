import type { Metadata } from "next";
import type { Category, ProductCard as ProductCardType } from "@/lib/types";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  // absolute — bypasses the site-wide "| New Look Impex" title template so the
  // brand appears exactly once (75 chars; primary homepage keyword first)
  title: {
    absolute: "Brass & Copper Handicraft Manufacturer in Moradabad, India | New Look Impex",
  },
  description:
    "New Look Impex manufactures and exports brass handicrafts, copper bottles, kitchenware and metal home décor from Moradabad, India. Wholesale and bulk enquiries.",
  keywords:
    "brass and copper handicraft manufacturer in India, Moradabad handicraft manufacturer, brass handicraft exporter from India, copper products manufacturer in India, metal handicraft exporter in India, brass and copper wholesale supplier, Indian handicraft manufacturer and exporter, brass home décor manufacturer, copper kitchenware wholesale supplier, Moradabad brass handicraft exporter, brass products manufacturer in Moradabad, copper utensils exporter India, brass kitchenware wholesale supplier, brass urli manufacturer, brass diya wholesale manufacturer, brass lanterns bulk supply, OEM brass products manufacturer, private label copper drinkware, Indian handicrafts supplier for importers, New Look Impex, NLI Collections",
  alternates: { canonical: "https://www.newlookimpex.store/" },
  openGraph: {
    title: "Brass & Copper Handicraft Manufacturer in Moradabad, India | New Look Impex",
    description:
      "Manufacturer and exporter of brass handicrafts, copper bottles, kitchenware and metal home décor from Moradabad, India — wholesale, bulk, custom manufacturing and private label for global buyers.",
    type: "website",
    url: "https://www.newlookimpex.store/",
    siteName: "New Look Impex",
    images: [{ url: "/hero-brass-kitchen.jpg", width: 1024, height: 1024, alt: "Brass cookware — New Look Impex" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Brass & Copper Handicraft Manufacturer in Moradabad, India | New Look Impex",
    description:
      "Manufacturer and exporter of brass handicrafts, copper bottles, kitchenware and metal home décor from Moradabad, India. Written quotations for bulk orders.",
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

const SITE_URL = "https://www.newlookimpex.store";

const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@type": ["Organization", "Manufacturer", "WholesaleStore", "LocalBusiness"],
  "@id": `${SITE_URL}/#organization`,
  name: "New Look Impex",
  alternateName: ["NLI Collections", "New Look Impex NLI Collections"],
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  image: `${SITE_URL}/hero-brass-kitchen.jpg`,
  description:
    "New Look Impex (NLI Collections) is a brass and copper products manufacturer, exporter and wholesale B2B supplier based in Moradabad, Uttar Pradesh, India. We supply hand-hammered brass kitchenware & utensils, copper cookware, bottles, jugs, urlis, diyas, lanterns, metal home décor and festive gifting at factory-direct bulk prices to global retailers, importers, distributors, HORECA buyers and corporate gifting programmes.",
  disambiguatingDescription:
    "B2B brass & copper manufacturer, exporter and wholesale supplier. OEM/private label and export orders accepted. GSTIN 09AFKPA4462R1ZW. Based in Moradabad, Uttar Pradesh, India.",
  foundingDate: "2012",
  taxID: "09AFKPA4462R1ZW",
  vatID: "09AFKPA4462R1ZW",
  employeeCount: {
    "@type": "QuantitativeValue",
    value: "11-50",
  },
  slogan: "Handcrafted Brass & Copper for Global B2B Buyers",
  knowsAbout: [
    "brass manufacturer in Moradabad",
    "copper manufacturer in India",
    "brass utensils manufacturer Moradabad",
    "copper utensils exporter India",
    "brass kitchenware wholesale supplier",
    "copper cookware exporter India",
    "brass handicrafts exporter Moradabad Uttar Pradesh",
    "B2B metal handicrafts supplier India",
    "wholesale brass home decor manufacturer",
    "copper bottle manufacturer India bulk",
    "brass diya wholesale supplier",
    "brass urli manufacturer exporter",
    "brass lantern bulk exporter",
    "OEM brass products manufacturer India",
    "private label copper kitchenware",
    "Indian brass handicrafts for importers",
    "copper jug pitcher wholesale manufacturer",
    "brass planter exporter Moradabad",
    "festive gifting metal products wholesale",
  ],
  address: {
    "@type": "PostalAddress",
    streetAddress: "New Look Impex, Bartan Bazar, Moradabad",
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
      contactOption: ["tollFree"],
      areaServed: ["IN", "AU", "AE", "GB", "US", "CA", "EU"],
    },
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      telephone: "+91-7500441239",
      email: "newlookimpex130@gmail.com",
      availableLanguage: ["English", "Hindi"],
      areaServed: ["IN", "AU", "AE", "GB", "US", "CA", "EU"],
    },
  ],
  areaServed: [
    "IN", "AU", "AE", "GB", "US", "CA", "EU",
  ],
  sameAs: [
    "https://www.instagram.com/nli_collections_india",
    "https://youtube.com/@nlicollections",
    "https://www.newlookimpex.store",
  ],
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

/**
 * Server-side prefetch of the homepage's category and featured-product data so
 * the initial HTML contains real category/product links (crawlable internal
 * linking) instead of client-side loading placeholders. Any failure degrades to
 * null and the client component fetches as before.
 */
async function fetchHomeData(): Promise<{
  categories: Category[] | null;
  featured: ProductCardType[] | null;
}> {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const [cats, feats] = await Promise.allSettled([
    fetch(`${API_BASE}/api/public/categories`, { next: { revalidate: 3600 } }).then((r) =>
      r.ok ? r.json() : Promise.reject(new Error(String(r.status)))
    ),
    fetch(`${API_BASE}/api/public/products?sort=featured&page_size=24`, {
      next: { revalidate: 3600 },
    }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status))))),
  ]);
  return {
    categories:
      cats.status === "fulfilled" && Array.isArray(cats.value?.items)
        ? cats.value.items
        : null,
    featured:
      feats.status === "fulfilled" && Array.isArray(feats.value?.items)
        ? feats.value.items
        : null,
  };
}

export default async function HomePage() {
  const { categories, featured } = await fetchHomeData();
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
      <HomeClient initialCategories={categories} initialFeatured={featured} />
    </>
  );
}
