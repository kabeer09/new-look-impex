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
    const title = p.seo_title || p.name || "Product";
    const description =
      p.seo_description || p.short_description || p.description?.slice(0, 160) || fallback.description;
    return {
      title,
      description,
      alternates: { canonical: `https://newlookimpex.store/products/${params.slug}` },
      openGraph: {
        title,
        description,
        type: "website",
        url: `https://newlookimpex.store/products/${params.slug}`,
      },
    };
  } catch {
    return fallback;
  }
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  return <ProductClient slug={params.slug} />;
}
