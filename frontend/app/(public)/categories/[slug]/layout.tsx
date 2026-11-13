import type { Metadata } from "next";

/**
 * Per-category SEO metadata for /categories/[slug].
 *
 * Titles are hand-written per category (not a template) so every category page
 * has a unique, keyword-led title; the site-wide layout template appends
 * " | New Look Impex", so the brand is deliberately left out of `title`.
 * `seo_title` / `seo_description` set by the admin in the catalogue API take
 * precedence when present.
 */

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type CatMeta = { title: string; description: string; noindex?: boolean };

const CATEGORY_META: Record<string, CatMeta> = {
  "copper-bottles": {
    title: "Copper Bottles Manufacturer & Wholesale Supplier",
    description:
      "Wholesale copper water bottles from New Look Impex — hand-hammered in Moradabad, India. Bulk orders, custom engraving and export supply.",
  },
  "copper-jugs-pitchers": {
    title: "Copper Jugs & Pitchers — Manufacturer & Supplier",
    description:
      "Wholesale copper jugs and pitchers — hand-hammered and hand-finished in Moradabad, India. Bulk and export supply for retailers and importers.",
  },
  "copper-mugs-tumblers": {
    title: "Copper Mugs & Tumblers — Wholesale Manufacturer",
    description:
      "Wholesale copper mugs and tumblers for retail, hospitality and gifting — handcrafted in Moradabad, India. Bulk and export supply.",
  },
  "copper-kitchenware": {
    title: "Copper Kitchenware Manufacturer & Exporter",
    description:
      "Wholesale copper kitchenware and cookware — hand-hammered in Moradabad, India. Bulk orders, private label and export supply.",
  },
  "brass-kitchenware": {
    title: "Brass Kitchenware Manufacturer & Exporter",
    description:
      "Wholesale brass kitchenware, dinner sets and serveware — handcrafted in Moradabad, India. Bulk orders and export supply.",
  },
  "brass-urlis": {
    title: "Brass Urlis Manufacturer & Wholesale Supplier",
    description:
      "Wholesale brass urlis — the traditional Moradabad water vessel in hammered and polished finishes. Bulk and export supply.",
  },
  "copper-urlis": {
    title: "Copper Urlis — Manufacturer & Wholesale Supplier",
    description:
      "Wholesale copper urlis for décor, pooja and gifting — handcrafted in Moradabad, India. Bulk orders and export supply.",
  },
  "brass-diyas": {
    title: "Brass Diyas Manufacturer & Bulk Supplier",
    description:
      "Wholesale brass diyas and pooja items — handcrafted in Moradabad, India. Festival bulk orders, custom finishes and export supply.",
  },
  "metal-diyas": {
    title: "Metal Diyas Manufacturer & Wholesale Supplier",
    description:
      "Wholesale metal diyas for festivals and retail — brass and copper finishes, handcrafted in Moradabad, India. Bulk and export supply.",
  },
  "brass-lanterns": {
    title: "Brass Lanterns Manufacturer & Exporter",
    description:
      "Wholesale brass lanterns and metal lighting — handcrafted in Moradabad, India. Festival, retail and export bulk supply.",
  },
  "decorative-bowls": {
    title: "Decorative Brass & Metal Bowls — Wholesale",
    description:
      "Wholesale decorative brass and metal bowls for table décor, hospitality and retail — handcrafted in Moradabad, India.",
  },
  "festival-decor": {
    title: "Festival Décor Manufacturer & Wholesale Supplier",
    description:
      "Wholesale festival décor — diyas, lanterns, urlis and festive metal pieces from Moradabad, India. Bulk and export supply.",
  },
  "corporate-gifting": {
    title: "Corporate Gifting — Brass & Copper Gift Supplier",
    description:
      "Brass and copper corporate gifting at wholesale volume — custom packaging and engraving from Moradabad, India.",
  },
  "custom-bulk-orders": {
    title: "Custom Bulk Orders & OEM Metal Manufacturing",
    description:
      "Custom and bulk metal handicraft orders — bespoke sizes, finishes and private label, quoted per order from Moradabad, India.",
  },
  // Published in the catalogue but deliberately served by dedicated pages
  // (/brass-handicrafts, /copper-handicrafts, /metal-home-decor): the API 404s
  // them, so they keep a title for consistency but are kept out of the index.
  "brass-handicrafts": {
    title: "Brass Handicrafts Manufacturer & Exporter",
    description: "Brass handicrafts manufacturer and exporter from Moradabad, India.",
    noindex: true,
  },
  "copper-handicrafts": {
    title: "Copper Handicrafts Manufacturer & Exporter",
    description: "Copper handicrafts manufacturer and exporter from Moradabad, India.",
    noindex: true,
  },
  "metal-home-decor": {
    title: "Metal Home Décor Manufacturer & Exporter",
    description: "Metal home décor manufacturer and exporter from Moradabad, India.",
    noindex: true,
  },
};

const FALLBACK_TITLE = (name: string) =>
  `${name} — Wholesale Manufacturer & Exporter`;

const FALLBACK_DESCRIPTION = (name: string) =>
  `Wholesale ${name.toLowerCase()} from New Look Impex — handcrafted in Moradabad, India. Bulk orders and export supply.`;

async function fetchCategory(slug: string): Promise<{
  name?: string;
  seo_title?: string | null;
  seo_description?: string | null;
} | null> {
  try {
    const r = await fetch(`${API}/api/public/categories/${encodeURIComponent(slug)}`, {
      next: { revalidate: 3600 },
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const slug = params.slug;
  const known = CATEGORY_META[slug];
  // Only hit the API for unknown slugs (new categories) — known ones are static.
  const cat = known ? null : await fetchCategory(slug);

  if (!known && !cat) {
    // Unknown / API-404 slug (e.g. categories served by a dedicated page):
    // render the page but keep it out of the index.
    return {
      title: { absolute: "Category Not Found | New Look Impex" },
      robots: { index: false, follow: false },
      alternates: { canonical: `/categories/${slug}` },
    };
  }

  const name = cat?.name || slug.replace(/-/g, " ");
  const title = cat?.seo_title || known?.title || FALLBACK_TITLE(name);
  const description =
    cat?.seo_description || known?.description || FALLBACK_DESCRIPTION(name);
  const url = `https://www.newlookimpex.store/categories/${slug}`;

  return {
    title,
    description,
    // Hidden categories render a not-found state (dedicated page owns the
    // topic) — never let /categories/* compete with it in the index.
    ...(known?.noindex ? { robots: { index: false, follow: true } } : {}),
    alternates: { canonical: `/categories/${slug}` },
    openGraph: {
      title: `${title} | New Look Impex`,
      description,
      type: "website",
      url,
      siteName: "New Look Impex",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | New Look Impex`,
      description,
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
