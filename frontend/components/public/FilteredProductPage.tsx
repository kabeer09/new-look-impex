"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, mediaUrl } from "@/lib/api";
import type { Paged, ProductCard } from "@/lib/types";
import { Loading, ErrorBox, EmptyState } from "@/components/public/States";
import { PageHero, ProductGrid } from "@/components/public/Shared";

/** Try a structured filter first; fall back to a keyword search when the filter returns nothing. */
export function fetchFiltered(primary: URLSearchParams, fallback: URLSearchParams): Promise<Paged<ProductCard>> {
  return api<Paged<ProductCard>>(`/api/public/products?${primary.toString()}`).then((d) => {
    if (d.total > 0) return d;
    return api<Paged<ProductCard>>(`/api/public/products?${fallback.toString()}`);
  });
}

export function FilteredProductPage({
  title,
  subtitle,
  editorial,
  fetchProducts,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  subtitle: string;
  editorial: { heading: string; paragraphs: string[] };
  fetchProducts: () => Promise<Paged<ProductCard>>;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  const [products, setProducts] = useState<ProductCard[]>([]);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setErr("");
    fetchProducts()
      .then((d) => {
        setProducts(d.items || []);
        setTotal(d.total || 0);
      })
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <PageHero title={title} subtitle={subtitle} />
      <div className="container-x section">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <h2 className="font-serif font-bold text-navy text-xl">{editorial.heading}</h2>
            {editorial.paragraphs.map((p, i) => (
              <p key={i} className="text-sm text-gray mt-3">{p}</p>
            ))}
            {ctaHref && (
              <Link href={ctaHref} className="btn btn-primary btn-sm mt-5">{ctaLabel || "View all"}</Link>
            )}
          </div>
          <div className="lg:col-span-2">
            {loading && <Loading label="Loading products…" />}
            {err && <ErrorBox error={err} retry={load} />}
            {!loading && !err && products.length === 0 && (
              <EmptyState title="No products in this range yet" hint="Check back soon or browse the full catalogue." action={<Link className="btn btn-outline btn-sm" href="/products">Browse all products</Link>} />
            )}
            {!loading && !err && products.length > 0 && (
              <>
                <p className="text-xs text-gray mb-3">{total} product{total === 1 ? "" : "s"}</p>
                <ProductGrid products={products} />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

