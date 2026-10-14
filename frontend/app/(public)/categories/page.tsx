"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, mediaUrl } from "@/lib/api";
import type { Category } from "@/lib/types";
import { Loading, ErrorBox, EmptyState } from "@/components/public/States";
import { PageHero } from "@/components/public/Shared";

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ items: Category[] }>("/api/public/categories")
      .then((d) => setItems(d.items || []))
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHero title="Categories" subtitle="Browse the full wholesale range by category." />
      <div className="container-x section">
        {loading && <Loading label="Loading categories…" />}
        {err && <ErrorBox error={err} retry={() => window.location.reload()} />}
        {!loading && !err && items.length === 0 && <EmptyState title="No categories published yet" />}
        {!loading && !err && items.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((c) => (
              <Link key={c.slug} href={`/categories/${c.slug}`} className="product-card group">
                <div className="relative aspect-[16/9] bg-sand overflow-hidden">
                  {c.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl(c.image_url)} alt={c.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform" />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center font-serif text-5xl font-bold text-brass-dark" aria-hidden="true">
                      {c.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <h2 className="font-serif font-semibold text-navy text-xl group-hover:underline underline-offset-2">{c.name}</h2>
                  {c.description && <p className="text-sm text-gray mt-1 line-clamp-2">{c.description}</p>}
                  <p className="text-xs font-semibold text-brass-dark mt-3">
                    {c.product_count != null ? `${c.product_count} product${c.product_count === 1 ? "" : "s"}` : "View range"} →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
