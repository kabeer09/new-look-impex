"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Category, Paged, ProductCard } from "@/lib/types";
import { ProductGrid } from "@/components/public/Shared";
import { Loading, ErrorBox } from "@/components/public/States";

const SORTS = [
  ["newest", "Newest"],
  ["name", "Name A–Z"],
  ["featured", "Featured"],
] as const;

const PAGE_SIZE = 24;

export default function CatalogueClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<Paged<ProductCard> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [moqAvailable, setMoqAvailable] = useState(false);

  const q = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";
  const material = searchParams.get("material") || "";
  const finish = searchParams.get("finish") || "";
  const style = searchParams.get("style") || "";
  const hasMoq = searchParams.get("has_moq") === "true";
  const sort = searchParams.get("sort") || "newest";
  const page = parseInt(searchParams.get("page") || "1", 10) || 1;

  const update = useCallback(
    (patch: Record<string, string>, keepPage = false) => {
      const next = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([k, v]) => {
        if (v) next.set(k, v);
        else next.delete(k);
      });
      if (!keepPage) next.delete("page");
      const qs = next.toString();
      router.push(qs ? `/products?${qs}` : "/products");
    },
    [router, searchParams]
  );

  const goPage = useCallback(
    (p: number) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("page", String(p));
      router.push(`/products?${next.toString()}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [router, searchParams]
  );

  // Category options for the filter.
  useEffect(() => {
    api<{ items: Category[] }>("/api/public/categories")
      .then((d) => setCategories(d.items || []))
      .catch(() => undefined);
  }, []);

  // Probe once: only show the MOQ toggle when the catalogue actually has MOQs.
  useEffect(() => {
    api<Paged<ProductCard>>("/api/public/products?has_moq=true&page_size=1")
      .then((d) => setMoqAvailable((d.total || 0) > 0))
      .catch(() => setMoqAvailable(false));
  }, []);

  useEffect(() => {
    setLoading(true);
    setErr("");
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (material) params.set("material", material);
    if (finish) params.set("finish", finish);
    if (style) params.set("style", style);
    if (hasMoq) params.set("has_moq", "true");
    params.set("sort", sort);
    params.set("page", String(page));
    params.set("page_size", String(PAGE_SIZE));
    api<Paged<ProductCard>>(`/api/public/products?${params.toString()}`)
      .then((d) => {
        setData(d);
        if ((d.items || []).some((p) => p.moq != null)) setMoqAvailable(true);
      })
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, [q, category, material, finish, style, hasMoq, sort, page]);

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 0;
  const hasFilters = Boolean(q || category || material || finish || style || hasMoq);

  return (
    <>
      <section className="bg-sand/60 border-b border-sand">
        <div className="container-x py-10 md:py-14">
          <p className="text-petrol uppercase tracking-widest text-xs font-semibold">Wholesale Catalogue</p>
          <h1 className="page-title mt-1">Shop Products</h1>
          <p className="page-subtitle">
            {data ? `${data.total} product${data.total === 1 ? "" : "s"}` : "Handcrafted brass & copper décor"}
            {q ? ` matching “${q}”` : ""}
          </p>
        </div>
      </section>

      <div className="container-x section">
        {/* Search + filters */}
        <div className="card mb-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="f-q">Search name, SKU or keyword</label>
              <input
                id="f-q"
                className="input"
                defaultValue={q}
                key={q}
                onChange={(e) => update({ q: e.target.value })}
                placeholder="e.g. brass urli, NLI-1024…"
              />
            </div>
            <div>
              <label className="label" htmlFor="f-cat">Category</label>
              <select id="f-cat" className="input" value={category} onChange={(e) => update({ category: e.target.value })}>
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="f-sort">Sort</label>
              <select id="f-sort" className="input" value={sort} onChange={(e) => update({ sort: e.target.value })}>
                {SORTS.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="f-mat">Material</label>
              <input id="f-mat" className="input" defaultValue={material} key={`m-${material}`} onBlur={(e) => update({ material: e.target.value.trim() })} placeholder="e.g. brass" />
            </div>
            <div>
              <label className="label" htmlFor="f-fin">Finish</label>
              <input id="f-fin" className="input" defaultValue={finish} key={`f-${finish}`} onBlur={(e) => update({ finish: e.target.value.trim() })} placeholder="e.g. antique, polished" />
            </div>
            <div>
              <label className="label" htmlFor="f-style">Style</label>
              <input id="f-style" className="input" defaultValue={style} key={`s-${style}`} onBlur={(e) => update({ style: e.target.value.trim() })} placeholder="e.g. traditional" />
            </div>
            <div className="flex items-end gap-3 flex-wrap">
              {(moqAvailable || hasMoq) && (
                <label className="flex items-center gap-2 text-sm pb-2">
                  <input
                    type="checkbox"
                    className="accent-[#172A3A]"
                    checked={hasMoq}
                    onChange={(e) => update({ has_moq: e.target.checked ? "true" : "" })}
                  />
                  MOQ listed only
                </label>
              )}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => router.push("/products")} disabled={!hasFilters && sort === "newest"}>
                Clear filters
              </button>
            </div>
          </div>
        </div>

        {loading && <Loading label="Searching the catalogue…" />}
        {err && <ErrorBox error={err} retry={() => router.refresh()} />}
        {!loading && !err && data && (
          <ProductGrid
            products={data.items}
            emptyHint={hasFilters ? "No products match these filters — try clearing them." : "No published products yet."}
          />
        )}

        {/* Pagination */}
        {!loading && !err && totalPages > 1 && (
          <nav className="mt-8 flex flex-wrap items-center gap-2" aria-label="Pagination">
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => goPage(page - 1)}>
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .map((p, i, arr) => (
                <span key={p} className="flex items-center gap-2">
                  {i > 0 && arr[i - 1] < p - 1 && <span className="text-gray">…</span>}
                  <button
                    className={`btn btn-sm ${p === page ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => goPage(p)}
                    aria-current={p === page ? "page" : undefined}
                  >
                    {p}
                  </button>
                </span>
              ))}
            <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => goPage(page + 1)}>
              Next →
            </button>
          </nav>
        )}

        <p className="text-xs text-gray mt-8">
          Can&apos;t find what you need? <Link className="link" href="/request-quote">Request a quote</Link> with
          your specifications, or <Link className="link" href="/contact">contact us</Link> directly.
        </p>
      </div>
    </>
  );
}
