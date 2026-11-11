"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, trackEvent } from "@/lib/api";
import type { ProductCard } from "@/lib/types";
import { ProductGrid } from "@/components/public/Shared";
import { Loading, ErrorBox } from "@/components/public/States";

export function CountryPage({ slug }: { slug: string }) {
  const [products, setProducts] = useState<ProductCard[] | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api<{ items: ProductCard[] }>("/api/public/products?page_size=100&sort=featured")
      .then((d) => {
        setProducts(d.items || []);
        trackEvent({ event_type: "product_view", country: slug });
      })
      .catch((e) => setErr(String(e)));
  }, [slug]);

  if (!products) return null;

  return (
    <div>
      <section className="bg-cream border-b border-clay/15">
        <div className="container-x py-12 md:py-16">
          <p className="eyebrow text-clay">Wholesale · {slug.toUpperCase()}</p>
          <h1 className="page-title mt-2">Wholesale Copper & Brass</h1>
        </div>
      </section>
      <div className="container-x section max-w-4xl">
        <p className="text-gray mt-4 leading-relaxed">Loading products for {slug}...</p>
        <div className="mt-4">
          {err && <ErrorBox error={err} retry={() => window.location.reload()} />}
          {products !== null && (
            <ProductGrid
              products={products.slice(0, 12)}
              emptyHint="No matching products are published yet — browse the full catalogue."
            />
          )}
        </div>
      </div>
    </div>
  );
}