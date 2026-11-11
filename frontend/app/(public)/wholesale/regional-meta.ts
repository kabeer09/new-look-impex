export function regionalMetadata(country: { slug: string; name: string; h1: string; intro: string[]; keywords: string }, countryCode: string) {
  const cfg = country;
  return {
    title: `${cfg.h1} | New Look Impex`,
    description: cfg.intro[0]?.slice(0, 155) || "New Look Impex",
    keywords: cfg.keywords || "",
    alternates: { canonical: `https://newlookimpex.store/wholesale/${cfg.slug}` },
    openGraph: {
      title: `${cfg.h1} — New Look Impex`,
      description: cfg.intro[0]?.slice(0, 155) || "",
      type: "website",
      url: `https://newlookimpex.store/wholesale/${cfg.slug}`,
    },
  };
}