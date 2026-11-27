import type { Metadata } from "next";
import { redirect } from "next/navigation";

/** Redirect-only legacy route: must not be indexable or appear in the sitemap. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** Legacy shop route — redirects to the canonical catalogue, preserving filters. */
export default function ShopRedirect({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const qs = new URLSearchParams();
  Object.entries(searchParams).forEach(([k, v]) => {
    if (typeof v === "string" && v) qs.set(k, v);
    else if (Array.isArray(v)) v.forEach((x) => x && qs.append(k, x));
  });
  const suffix = qs.toString();
  redirect(suffix ? `/products?${suffix}` : "/products");
}
