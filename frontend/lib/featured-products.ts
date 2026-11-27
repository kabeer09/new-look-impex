import type { ProductCard } from "./types";

const API = process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production" ? "https://api.newlookimpex.store" : "http://localhost:8000");

/** Server-side featured products for SEO-only country pages. Returns null on a
 *  cold API so the caller can show a catalogue link instead of a broken block. */
export async function fetchFeaturedProducts(limit = 12): Promise<ProductCard[] | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(`${API}/api/public/products?page_size=${limit}&sort=featured`, {
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(12000),
      });
      if (!r.ok) continue;
      const d = await r.json();
      return Array.isArray(d.items) ? d.items : null;
    } catch {
      // retry once
    }
  }
  return null;
}
