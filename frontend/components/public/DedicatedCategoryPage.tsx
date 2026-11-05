"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, mediaUrl } from "@/lib/api";
import type { ProductCard } from "@/lib/types";
import { Loading, ErrorBox, EmptyState } from "@/components/public/States";
import { PageHero, ProductGrid } from "@/components/public/Shared";

interface DedicatedCategoryPageProps {
  title: string;
  description: string;
  h1: string;
  intro: string;
  filterParams: Record<string, string>;
  ctaLabel: string;
  ctaHref: string;
  relatedLinks: { label: string; href: string }[];
  faqs: { q: string; a: string }[];
}

export function DedicatedCategoryPage({
  title, description, h1, intro, filterParams, ctaLabel, ctaHref, relatedLinks, faqs,
}: DedicatedCategoryPageProps) {
  const [products, setProducts] = useState<ProductCard[] | null>(null);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setErr("");
    const params = new URLSearchParams(filterParams);
    api<{ items: ProductCard[]; total?: number }>(`/api/public/products?${params.toString()}`)
      .then((d) => {
        setProducts(d.items || []);
        setTotal(d.total || 0);
      })
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHero title={h1} subtitle={description} />
      <div className="container-x section">
        <div className="text-center mb-10">
          <p className="eyebrow text-clay uppercase tracking-[0.2em] text-xs font-semibold">Category</p>
          <h1 className="font-serif font-bold text-navy text-3xl md:text-4xl mt-2">{h1}</h1>
          <p className="text-gray mt-4 max-w-3xl mx-auto text-sm leading-relaxed">{intro}</p>
        </div>

        {err && <ErrorBox error={err} />}
        {loading && <Loading label="Loading products…" />}
        {!loading && !err && (!products || products.length === 0) && (
          <EmptyState title="No products in this category yet" hint="Check back soon or browse the full catalogue." action={<Link className="btn btn-outline btn-sm" href="/products">Browse all products</Link>} />
        )}
        {!loading && !err && products && products.length > 0 && (
          <>
            <p className="text-xs text-gray mb-3">{total} product{total === 1 ? "" : "s"}</p>
            <ProductGrid products={products} />
            <div className="text-center mt-8">
              <Link href={ctaHref} className="btn btn-clay !px-6 !py-3">{ctaLabel}</Link>
            </div>
          </>
        )}

        {/* Related categories */}
        {relatedLinks.length > 0 && (
          <div className="mt-16 border-t border-sand pt-8">
            <h2 className="font-serif font-bold text-navy text-xl mb-6">Related Categories</h2>
            <div className="flex flex-wrap gap-4">
              {relatedLinks.map((l) => (
                <Link key={l.href} href={l.href} className="btn btn-outline btn-sm">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* FAQ */}
        {faqs.length > 0 && (
          <div className="mt-16 border-t border-sand pt-8">
            <h2 className="font-serif font-bold text-navy text-xl mb-6">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {faqs.map((f, i) => (
                <div key={i} className="bg-white border border-sand rounded-xl p-5">
                  <p className="font-sans font-semibold text-navy text-sm">{f.q}</p>
                  <p className="text-sm text-gray mt-2">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
