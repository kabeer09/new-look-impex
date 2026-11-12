import type { Metadata } from "next";
import CollectionClient from "./CollectionClient";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const fallback: Metadata = {
    title: "Collection",
    description: "A curated wholesale collection from New Look Impex.",
  };
  try {
    const r = await fetch(`${API}/api/public/collections/${encodeURIComponent(params.slug)}`, {
      next: { revalidate: 300 },
    });
    if (!r.ok) return fallback;
    const c = await r.json();
    const title = c.seo_title || c.name ? `${c.seo_title || c.name} — Collection` : "Collection";
    const description = c.seo_description || c.description || fallback.description;
    return {
      title,
      description,
      alternates: { canonical: `https://www.newlookimpex.store/collections/${params.slug}` },
      openGraph: {
        title,
        description,
        type: "website",
        url: `https://www.newlookimpex.store/collections/${params.slug}`,
      },
    };
  } catch {
    return fallback;
  }
}

export default function CollectionPage({ params }: { params: { slug: string } }) {
  return <CollectionClient slug={params.slug} />;
}
