import type { ProductCard } from "@/lib/types";
import { getEuropeCountry } from "./europe-data";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** Server-side fetch of the products relevant to a Europe-market page so real
 *  product links are present in crawlable HTML. Returns null on failure — the
 *  client falls back to its own fetch, then to the full catalogue. */
export async function fetchEuropeProducts(slug: string): Promise<ProductCard[] | null> {
  const cfg = getEuropeCountry(slug);
  if (!cfg) return null;
  try {
    const r = await fetch(`${API}/api/public/products?page_size=100&sort=featured`, {
      next: { revalidate: 300 },
    });
    if (!r.ok) return null;
    const d = await r.json();
    const items: ProductCard[] = Array.isArray(d.items) ? d.items : [];
    const matched = items.filter(
      (p) => p.category && cfg.categories.includes(p.category.slug)
    );
    return matched.length ? matched : items; // never show an empty shelf if catalogue changed
  } catch {
    return null;
  }
}
