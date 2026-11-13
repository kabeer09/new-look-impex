import type { ProductCard } from "@/lib/types";
import { COUNTRIES } from "./country-data";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Server-side fetch of the products relevant to a regional page, so the
 * product links are present in the initial HTML (crawlable) instead of only
 * appearing after the client-side effect runs. Returns null on failure —
 * CountryProducts then falls back to its own client fetch.
 */
export async function fetchRegionalProducts(slug: string): Promise<ProductCard[] | null> {
  const cfg = COUNTRIES[slug];
  if (!cfg) return null;
  try {
    const r = await fetch(`${API}/api/public/products?page_size=100&sort=featured`, {
      next: { revalidate: 300 },
    });
    if (!r.ok) return null;
    const d = await r.json();
    const items: ProductCard[] = Array.isArray(d.items) ? d.items : [];
    return items.filter((p) => p.category && cfg.categories.includes(p.category.slug));
  } catch {
    return null;
  }
}
