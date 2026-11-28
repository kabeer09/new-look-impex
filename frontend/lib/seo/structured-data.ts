/**
 * Single source of truth for the site's entity structured data.
 * Used by the root layout (Organization on every page) and the homepage
 * (WebSite + SearchAction). Keeping one object prevents the two copies from
 * drifting (different phone formats, logos, emails, etc.).
 *
 * Facts only: real address, phone, email, GSTIN and social profiles.
 * No employee counts, capacity, certifications or reviews are asserted.
 */
export const SITE_URL = "https://www.newlookimpex.store";

export const ORG_JSONLD = {
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
  email: "newlookimpex@gmail.com",
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "sales",
      telephone: "+91-9808588603",
      email: "newlookimpex@gmail.com",
      availableLanguage: ["English", "Hindi", "Urdu"],
      areaServed: ["IN", "AU", "AE", "GB", "US", "CA", "EU"],
    },
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      telephone: "+91-96900-53913",
      email: "newlookimpex@gmail.com",
      availableLanguage: ["English", "Hindi"],
      areaServed: ["IN", "AU", "AE", "GB", "US", "CA", "EU"],
    },
  ],
  areaServed: ["IN", "AU", "AE", "GB", "US", "CA", "EU"],
  sameAs: [
    "https://www.facebook.com/profile.php?id=100083216147871",
    "https://www.linkedin.com/in/new-look-impex-b1b473218/",
    "https://www.instagram.com/nli_collections_india",
    "https://youtube.com/@nlicollections",
    SITE_URL,
  ],
};

export const WEBSITE_JSONLD = {
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
