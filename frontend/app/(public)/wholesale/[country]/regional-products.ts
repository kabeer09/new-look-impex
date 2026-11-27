import type { ProductCard } from "@/lib/types";
import { COUNTRIES } from "./country-data";

const API = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "https://api.newlookimpex.store" : "http://localhost:8000");

/**
 * Server-side fetch of the products relevant to a regional page, so the
 * product links are present in the initial HTML (crawlable) instead of only
 * appearing after the client-side effect runs. Returns null on failure —
 * CountryProducts then falls back to its own client fetch.
 */
export async function fetchRegionalProducts(slug: string): Promise<ProductCard[] | null> {
  const cfg = COUNTRIES[slug];
  if (!cfg) return null;
  // Retry once: a cold Render service can make the first build-time request
  // time out, which used to leave country pages showing "Loading products…".
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(`${API}/api/public/products?page_size=100&sort=featured`, {
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(12000),
      });
      if (!r.ok) continue;
      const d = await r.json();
      const items: ProductCard[] = Array.isArray(d.items) ? d.items : [];
      return items.filter((p) => p.category && cfg.categories.includes(p.category.slug));
    } catch {
      // try once more
    }
  }
  return null;
}
