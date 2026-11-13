import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductClient from "./ProductClient";
import type { ProductDetail } from "@/lib/types";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const SITE = "https://www.newlookimpex.store";

/** ProductDetail plus the canonical_slug the API returns after 308 slug
 *  redirects (not declared on the shared type). */
type ProductMeta = ProductDetail & { canonical_slug?: string };

type FetchResult =
  | { status: "ok"; data: ProductMeta }
  | { status: "404" }
  | { status: "unavailable" };

/**
 * Server-side product fetch with one retry. The retry matters: a transient
 * API failure during ISR revalidation would otherwise cache the fallback
 * "Product" title for the whole revalidate window.
 */
async function fetchProduct(slug: string): Promise<FetchResult> {
  const url = `${API}/api/public/products/${encodeURIComponent(slug)}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(url, { next: { revalidate: 300 } });
      if (r.status === 404) return { status: "404" };
      if (r.ok) return { status: "ok", data: await r.json() };
    } catch {
      // transient failure — retry once before giving up
    }
  }
  return { status: "unavailable" };
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const result = await fetchProduct(params.slug);
  if (result.status === "404") {
    return {
      title: { absolute: "Product Not Found | New Look Impex" },
      description: "This product is not in the New Look Impex wholesale catalogue.",
      robots: { index: false, follow: false },
    };
  }
  if (result.status === "unavailable") {
    // API unreachable at render time — keep a valid (non-keyword) title; ISR
    // revalidates within 5 minutes and the retry above makes this rare.
    return {
      title: "Product",
      description: "Product details from the New Look Impex wholesale catalogue.",
    };
  }
  const p = result.data;
  // fetch follows 308 slug redirects — canonical/OG always use the CURRENT slug.
  const canonicalSlug = p.canonical_slug || p.slug || params.slug;
  const canonical = `${SITE}/products/${canonicalSlug}`;
  const rawTitle = p.seo_title || p.name || "Product";
  // The layout template already appends " | New Look Impex" — strip it from
  // the stored title so the rendered <title> never doubles the brand.
  const title = rawTitle.replace(/\s*\|\s*New Look Impex\s*$/i, "").trim() || rawTitle;
  const description =
    p.seo_description || p.short_description || p.description?.slice(0, 160) ||
    "Product details from the New Look Impex wholesale catalogue.";
  const ogImage = p.image?.url
    ? p.image.url.startsWith("http") ? p.image.url : `${API}${p.image.url}`
    : undefined;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: rawTitle,
      description,
      type: "website",
      url: canonical,
      ...(ogImage ? { images: [{ url: ogImage, alt: p.image?.alt_text || p.name }] } : {}),
    },
  };
}

/**
 * Server component: fetches the product so the name, description, specs,
 * breadcrumb, Product JSON-LD and enquiry CTAs are present in the initial
 * HTML instead of being JavaScript-loaded. ProductClient keeps the
 * interactive behaviour (gallery, RFQ cart, wishlist) and re-fetches client-
 * side only if this server fetch failed.
 */
export default async function ProductPage({ params }: { params: { slug: string } }) {
  const result = await fetchProduct(params.slug);
  if (result.status === "404") notFound();
  const initialProduct = result.status === "ok" ? result.data : null;
  return <ProductClient slug={params.slug} initialProduct={initialProduct} />;
}
