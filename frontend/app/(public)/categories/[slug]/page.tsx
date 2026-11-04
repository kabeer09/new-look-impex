"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, mediaUrl } from "@/lib/api";
import type { Category, ProductCard } from "@/lib/types";
import { Loading, ErrorBox, EmptyState } from "@/components/public/States";
import { PageHero, ProductGrid } from "@/components/public/Shared";

export default function CategoryDetailPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<ProductCard[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [moreLoading, setMoreLoading] = useState(false);
  const [err, setErr] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const PAGE_SIZE = 24;

  const PAGES = (n: number) => Math.max(1, Math.ceil(n / PAGE_SIZE));

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setPage(1);
    setErr("");
    setNotFound(false);
    api<Category & { items?: ProductCard[]; total?: number }>(`/api/public/categories/${encodeURIComponent(slug)}`)
      .then((d) => {
        setCategory(d);
        setProducts(d.items || []);
        setTotal(d.total || 0);
      })
      .catch((e) => {
        if (String(e).startsWith("404")) setNotFound(true);
        else setErr(String(e));
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const loadMore = () => {
    const next = page + 1;
    setMoreLoading(true);
    api<Category & { items?: ProductCard[]; total?: number }>(
      `/api/public/categories/${encodeURIComponent(slug)}?page=${next}&page_size=${PAGE_SIZE}`
    )
      .then((d) => {
        setProducts((prev) => [...prev, ...(d.items || [])]);
        setPage(next);
      })
      .catch((e) => setErr(String(e)))
      .finally(() => setMoreLoading(false));
  };

  if (notFound) {
    return (
      <div className="container-x section">
        <EmptyState title="Category not found" action={<Link href="/categories" className="btn btn-primary btn-sm">Browse categories</Link>} />
      </div>
    );
  }

  const hasMore = products.length < total;

  return (
    <>
      <PageHero
        title={category?.name || "Category"}
        subtitle={category?.seo_description || category?.description || "A wholesale product category."}
      />
      <div className="container-x section">
        {loading && <Loading label="Loading category…" />}
        {err && <ErrorBox error={err} />}
        {!loading && !err && (
          <>
            {category?.image_url && (
              <div className="relative aspect-[21/9] bg-sand rounded-xl overflow-hidden mb-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl(category.image_url)} alt={`${category.name} — wholesale by New Look Impex, Moradabad`} className="object-cover w-full h-full" />
              </div>
            )}
            {category?.description && <p className="text-gray max-w-2xl mb-8">{category.description}</p>}
            {products.length === 0 ? (
              <EmptyState title="No products in this category yet" action={<Link className="btn btn-outline btn-sm" href="/products">Browse all products</Link>} />
            ) : (
              <>
                <p className="text-xs text-gray mb-3">
                  Showing {products.length} of {total} product{(total || products.length) === 1 ? "" : "s"} in {category?.name}
                </p>
                <ProductGrid products={products} />
                {hasMore && (
                  <div className="text-center mt-10">
                    <button
                      type="button"
                      onClick={loadMore}
                      disabled={moreLoading}
                      className="btn btn-primary !px-8"
                    >
                      {moreLoading ? "Loading…" : `Load More Products (${total - products.length} remaining)`}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
