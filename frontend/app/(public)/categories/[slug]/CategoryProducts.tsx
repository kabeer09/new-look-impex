"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Category, ProductCard } from "@/lib/types";
import { Loading, ErrorBox, EmptyState } from "@/components/public/States";
import { ProductGrid } from "@/components/public/Shared";

/**
 * Product grid for /categories/[slug] — the editorial copy, H1 and schema are
 * rendered server-side by page.tsx; this client component only owns the
 * paginated product fetching and "load more" interaction.
 */
export default function CategoryProducts({
  slug,
  initialProducts = null,
  initialTotal = 0,
}: {
  slug: string;
  initialProducts?: ProductCard[] | null;
  initialTotal?: number;
}) {
  const [products, setProducts] = useState<ProductCard[]>(initialProducts || []);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [moreLoading, setMoreLoading] = useState(false);
  const [err, setErr] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(initialProducts === null);
  const PAGE_SIZE = 24;

  useEffect(() => {
    if (initialProducts !== null) return; // server already provided page 1
    if (!slug) return;
    setLoading(true);
    api<Category & { items?: ProductCard[]; total?: number }>(
      `/api/public/categories/${encodeURIComponent(slug)}`
    )
      .then((d) => {
        setProducts(d.items || []);
        setTotal(d.total || 0);
      })
      .catch((e) => {
        if (String(e).startsWith("404")) setNotFound(true);
        else setErr(String(e));
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <EmptyState
        title="Category not found"
        action={<Link href="/categories" className="btn btn-primary btn-sm">Browse categories</Link>}
      />
    );
  }
  if (err) return <ErrorBox error={err} />;
  if (loading) return <Loading label="Loading products…" />;

  const hasMore = products.length < total;

  if (products.length === 0) {
    return (
      <EmptyState
        title="No products in this category yet"
        action={<Link className="btn btn-outline btn-sm" href="/products">Browse all products</Link>}
      />
    );
  }

  return (
    <>
      <p className="text-xs text-gray mb-3">
        Showing {products.length} of {total} product{(total || products.length) === 1 ? "" : "s"}
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
  );
}
