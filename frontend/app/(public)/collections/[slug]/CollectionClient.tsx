"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, mediaUrl, whatsappLink } from "@/lib/api";
import type { Collection, ProductCard } from "@/lib/types";
import { Loading, ErrorBox, EmptyState } from "@/components/public/States";
import { ProductGrid } from "@/components/public/Shared";

export default function CollectionClient({ slug }: { slug: string }) {
  const [collection, setCollection] = useState<Collection | null>(null);
  const [products, setProducts] = useState<ProductCard[]>([]);
  const [total, setTotal] = useState(0);
  const [related, setRelated] = useState<Collection[]>([]);
  const [err, setErr] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [moreLoading, setMoreLoading] = useState(false);
  const PAGE_SIZE = 24;

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setPage(1);
    setErr("");
    setNotFound(false);
    api<Collection & { items?: ProductCard[]; total?: number }>(
      `/api/public/collections/${encodeURIComponent(slug)}`
    )
      .then((d) => {
        setCollection(d);
        setProducts(d.items || []);
        setTotal(d.total ?? (d.items || []).length);
        // Related collections for cross-discovery (best effort).
        api<{ items: Collection[] }>("/api/public/collections")
          .then((all) => setRelated((all.items || []).filter((c) => c.slug !== slug).slice(0, 3)))
          .catch(() => undefined);
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
    api<Collection & { items?: ProductCard[]; total?: number }>(
      `/api/public/collections/${encodeURIComponent(slug)}?page=${next}&page_size=${PAGE_SIZE}`
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
        <EmptyState
          title="Collection not found"
          hint="This collection may have been removed or the link is incorrect."
          action={<Link href="/collections" className="btn btn-primary btn-sm">Browse collections</Link>}
        />
      </div>
    );
  }

  return (
    <>
      {/* Editorial header */}
      <section className="bg-navy text-ivory">
        <div className="container-x py-12 md:py-16">
          <nav className="text-xs text-ivory/60 mb-3" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-1">/</span>
            <Link href="/collections" className="hover:text-white">Collections</Link>
            {collection && (
              <>
                <span className="mx-1">/</span>
                <span className="text-ivory">{collection.name}</span>
              </>
            )}
          </nav>
          <p className="text-gold-light uppercase tracking-widest text-xs font-semibold">Collection</p>
          <h1 className="font-serif font-bold text-4xl md:text-5xl mt-2 text-white">
            {collection?.name || "Collection"}
          </h1>
          {(collection?.seo_description || collection?.description) && (
            <p className="text-ivory/75 mt-4 max-w-2xl">
              {collection.seo_description || collection.description}
            </p>
          )}
        </div>
      </section>

      <div className="container-x section">
        {loading && <Loading label="Loading collection…" />}
        {err && <ErrorBox error={err} />}
        {!loading && !err && (
          <>
            {collection?.image_url && (
              <div className="relative aspect-[21/9] bg-sand overflow-hidden mb-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl(collection.image_url)} alt={collection.name} className="object-cover w-full h-full" />
              </div>
            )}
            {collection?.description && collection.description !== collection.seo_description && (
              <p className="text-gray max-w-2xl mb-8">{collection.description}</p>
            )}
            {products.length === 0 ? (
              <EmptyState
                title="No products in this collection yet"
                hint="Check back soon or browse the full catalogue."
                action={<Link className="btn btn-outline btn-sm" href="/products">Browse all products</Link>}
              />
            ) : (
              <>
                <p className="text-xs text-gray mb-3">Showing {products.length} of {total} product{total === 1 ? "" : "s"} in {collection?.name}</p>
                <ProductGrid products={products} />
                {products.length < total && (
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

            {/* Enquiry CTA */}
            <div className="mt-12 bg-sand/60 border border-sand p-8 grid md:grid-cols-2 gap-6 items-center">
              <div>
                <h2 className="font-serif font-bold text-navy text-2xl">Interested in this collection?</h2>
                <p className="text-sm text-gray mt-2">
                  Add pieces to your enquiry list and request wholesale pricing — confirmed in writing per order.
                </p>
              </div>
              <div className="flex flex-wrap md:justify-end gap-3">
                <Link href="/request-quote" className="btn btn-primary">Request Wholesale Pricing</Link>
                <a
                  className="btn btn-outline"
                  href={whatsappLink(`Hi, I'm interested in the "${collection?.name || "collection"}" collection. Please share wholesale details.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp
                </a>
              </div>
            </div>

            {/* Related collections */}
            {related.length > 0 && (
              <div className="mt-12">
                <h2 className="font-serif font-bold text-navy text-2xl mb-5">Related collections</h2>
                <div className="grid sm:grid-cols-3 gap-4">
                  {related.map((c) => (
                    <Link key={c.slug} href={`/collections/${c.slug}`} className="card-flat bg-white hover:border-brass transition-colors group">
                      <p className="font-serif font-semibold text-navy group-hover:underline underline-offset-2">{c.name}</p>
                      {c.description && <p className="text-xs text-gray mt-1 line-clamp-2">{c.description}</p>}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
