import type { Metadata } from "next";
import ProductClient from "./ProductClient";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const fallback: Metadata = {
    title: "Product",
    description: "Product details from the New Look Impex wholesale catalogue.",
  };
  try {
    const r = await fetch(`${API}/api/public/products/${encodeURIComponent(params.slug)}`, {
      next: { revalidate: 300 },
    });
    if (!r.ok) return fallback;
    const p = await r.json();
    // fetch follows 308 slug redirects — canonical/OG always use the CURRENT slug.
    const canonicalSlug = p.canonical_slug || p.slug || params.slug;
    const canonical = `https://newlookimpex.store/products/${canonicalSlug}`;
    const title = p.seo_title || p.name || "Product";
    const description =
      p.seo_description || p.short_description || p.description?.slice(0, 160) || fallback.description;
    const ogImage = p.image?.url
      ? p.image.url.startsWith("http") ? p.image.url : `${API}${p.image.url}`
      : undefined;
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description,
        type: "website",
        url: canonical,
        ...(ogImage ? { images: [{ url: ogImage, alt: p.image?.alt_text || p.name }] } : {}),
      },
    };
  } catch {
    return fallback;
  }
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  return <ProductClient slug={params.slug} />;
}
