import type { ProductCard } from "@/lib/types";
import NliCollectionsBrandPage from "./NliCollectionsClient";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "https://api.newlookimpex.store" : "http://localhost:8000");

/**
 * Server-fetch the brand pins so the product names, images and links are in
 * the first HTML response. Search engines should not have to execute JS to
 * discover NLI Collections products. On a transient API failure we pass null
 * and the client component retries, so the page still renders.
 */
async function fetchPins(): Promise<ProductCard[] | null> {
  try {
    const r = await fetch(`${API_BASE}/api/public/products?page_size=40`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const data = await r.json();
    return Array.isArray(data?.items) ? data.items : null;
  } catch {
    return null;
  }
}

export default async function NliCollectionsPage() {
  const initialProducts = await fetchPins();
  return <NliCollectionsBrandPage initialProducts={initialProducts} />;
}
