import { redirect } from "next/navigation";

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
