import type { Paged, ProductCard } from "@/lib/types";
import { mediaUrl } from "@/lib/api";

/**
 * Google Merchant Center product feed — GET /merchant/products.xml
 *
 * Generated live from the published catalogue so Google's scheduled feed
 * fetch always sees current data. Per Merchant Center policy only products
 * with a genuine price are included — price-on-request items are excluded
 * rather than given invented prices. Items without a primary image are
 * also skipped because image_link is required.
 */

const API = process.env.NEXT_PUBLIC_API_URL || "https://new-look-impex-api.onrender.com";
/** Canonical host — matches the sitemap's product URLs. */
const SITE = "https://www.newlookimpex.store";
const BRAND = "New Look Impex";

/** Rendered per request; product data itself is cached via fetch revalidate. */
export const dynamic = "force-dynamic";

/** XML text escaping (also used inside attribute-free element text). */
function esc(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Fetch every page of the public catalogue (published products only). */
async function fetchAllProducts(): Promise<ProductCard[]> {
  const items: ProductCard[] = [];
  const pageSize = 100;
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(`${API}/api/public/products?page=${page}&page_size=${pageSize}`, {
      next: { revalidate: 1800 }, // refresh at most every 30 minutes
    });
    if (!res.ok) throw new Error(`catalogue fetch failed: ${res.status}`);
    const data = (await res.json()) as Paged<ProductCard>;
    const batch = data.items ?? [];
    items.push(...batch);
    if (batch.length === 0 || (typeof data.total === "number" && items.length >= data.total)) break;
  }
  return items;
}

/** Build one <item>; returns null when the product cannot be listed. */
function itemXml(p: ProductCard): string | null {
  // Defensive: only published products may appear in the feed.
  if (p.status && p.status !== "published") return null;
  // Never invent prices — price-on-request items are excluded.
  if (p.price_on_request || typeof p.price !== "number" || p.price <= 0) return null;
  // image_link is required by Merchant Center.
  const imageUrl = p.image?.url ? mediaUrl(p.image.url) : "";
  if (!imageUrl) return null;

  const currency = (p.currency || "INR").toUpperCase();
  const id = p.sku?.trim() ? p.sku.trim() : `NLI-${p.id}`;
  const description =
    p.short_description ||
    `${p.name}${p.category ? ` — ${p.category.name}` : ""}${p.material ? ` · ${p.material}` : ""}`;

  const lines = [
    "    <item>",
    `      <g:id>${esc(id)}</g:id>`,
    `      <g:title>${esc(p.name)}</g:title>`,
    `      <g:description>${esc(description)}</g:description>`,
    `      <g:link>${SITE}/products/${encodeURIComponent(p.slug)}</g:link>`,
    `      <g:image_link>${esc(imageUrl)}</g:image_link>`,
    `      <g:price>${p.price.toFixed(2)} ${esc(currency)}</g:price>`,
    "      <g:availability>in_stock</g:availability>",
    "      <g:condition>new</g:condition>",
    `      <g:brand>${esc(BRAND)}</g:brand>`,
    // Handcrafted goods have no GTIN/barcode — tell Google explicitly.
    "      <g:identifier_exists>no</g:identifier_exists>",
  ];
  if (p.material) lines.push(`      <g:material>${esc(p.material)}</g:material>`);
  if (p.category?.name) lines.push(`      <g:product_type>${esc(p.category.name)}</g:product_type>`);
  lines.push("    </item>");
  return lines.join("\n");
}

export async function GET(): Promise<Response> {
  try {
    const products = await fetchAllProducts();
    const items = products
      .map(itemXml)
      .filter((x): x is string => x !== null)
      .join("\n");

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">',
      "  <channel>",
      `    <title>${esc(`${BRAND} — Handcrafted Copper & Brass`)}</title>`,
      `    <link>${SITE}/</link>`,
      "    <description>Wholesale handcrafted copper and brass products from Moradabad, India.</description>",
      items,
      "  </channel>",
      "</rss>",
      "",
    ].join("\n");

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=1800, stale-while-revalidate=3600",
      },
    });
  } catch {
    // Backend unreachable — ask Google to retry instead of serving a bad feed.
    return new Response("Feed temporarily unavailable. Please retry later.", {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Retry-After": "300",
      },
    });
  }
}
