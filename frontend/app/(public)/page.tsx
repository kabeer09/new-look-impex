import type { Metadata } from "next";
import type { Category, ProductCard as ProductCardType } from "@/lib/types";
import { HOME_FAQ } from "./home-faq";
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
    images: [{ url: "/hero-brass-kitchen.webp", width: 1024, height: 1024, alt: "Brass cookware — New Look Impex" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Brass & Copper Handicraft Manufacturer in Moradabad, India | New Look Impex",
    description:
      "Manufacturer and exporter of brass handicrafts, copper bottles, kitchenware and metal home décor from Moradabad, India. Written quotations for bulk orders.",
    images: ["/hero-brass-kitchen.webp"],
  },
};

/** FAQPage schema generated from the editable FAQ content, so structured data
 *  and the visible accordion stay in sync when an admin edits answers. */
function faqJsonld(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

const SITE_URL = "https://www.newlookimpex.store";

const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@type": ["Organization", "Manufacturer", "WholesaleStore", "LocalBusiness"],
  "@id": `${SITE_URL}/#organization`,
  name: "New Look Impex",
  alternateName: ["NLI Collections", "New Look Impex NLI Collections"],
  url: SITE_URL,
  logo: `${SITE_URL}/logo-newlookimpex.jpg`,
  image: `${SITE_URL}/hero-brass-kitchen.webp`,
  description:
    "New Look Impex (NLI Collections) is a brass and copper products manufacturer, exporter and wholesale B2B supplier based in Moradabad, Uttar Pradesh, India. We supply hand-hammered brass kitchenware & utensils, copper cookware, bottles, jugs, urlis, diyas, lanterns, metal home décor and festive gifting at wholesale prices quoted per order to global retailers, importers, distributors, HORECA buyers and corporate gifting programmes.",
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
    streetAddress: "New Look Impex, Ganga Mandir, Thana Nagphani Road, Kisrol",
    addressLocality: "Moradabad",
    addressRegion: "Uttar Pradesh",
    postalCode: "244001",
    addressCountry: "IN",
  },
  telephone: "+91-9808588603",
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "sales",
      telephone: "+91-9808588603",
      email: "newlookimpex130@gmail.com",
      availableLanguage: ["English", "Hindi", "Urdu"],
      areaServed: ["IN", "AU", "AE", "GB", "US", "CA", "EU"],
    },
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      telephone: "+91-96900-53913",
      email: "newlookimpex130@gmail.com",
      availableLanguage: ["English", "Hindi"],
      areaServed: ["IN", "AU", "AE", "GB", "US", "CA", "EU"],
    },
  ],
  areaServed: [
    "IN", "AU", "AE", "GB", "US", "CA", "EU",
  ],
  sameAs: [
    "https://www.facebook.com/profile.php?id=100083216147871",
    "https://www.linkedin.com/in/new-look-impex-b1b473218/",
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

// Render per request so AI Manager content edits (hero headline/video, FAQ,
// site content) appear on the live site immediately without a redeploy.
export const dynamic = "force-dynamic";

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
    fetch(`${API_BASE}/api/public/categories`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(8000) }).then((r) =>
      r.ok ? r.json() : Promise.reject(new Error(String(r.status)))
    ),
    fetch(`${API_BASE}/api/public/products?sort=featured&page_size=12`, {
      next: { revalidate: 60 }, signal: AbortSignal.timeout(8000),
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
  // Site content (hero, FAQ, etc.) is editable in the AI Manager / Site Control.
  // Pass the hero down so the new video/headline are in the very first HTML load,
  // not only after the client-side fetch finishes.
  let faqs: { q: string; a: string }[] = HOME_FAQ;
  let initialHero: Record<string, any> | null = null;
  try {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const r = await fetch(`${API_BASE}/api/public/site-content`, { signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const c = await r.json();
      if (Array.isArray(c?.home_faq) && c.home_faq.length) faqs = c.home_faq;
      if (c?.hero && typeof c.hero === "object") initialHero = c.hero;
    }
  } catch { /* keep defaults */ }
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonld(faqs)) }}
      />
      <HomeClient initialCategories={categories} initialFeatured={featured} initialHero={initialHero} />
    </>
  );
}
