"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHero } from "@/components/public/Shared";
import { Loading } from "@/components/public/States";
import { api, mediaUrl } from "@/lib/api";
import { useCompare } from "@/hooks/useCompare";
import { useMarket } from "@/lib/market";
import { useRfqCart } from "@/lib/rfq";
import type { ProductDetail } from "@/lib/types";

type LoadState = "loading" | "ready" | "error";

/** Rows shown for every product; specs[] rows come from each product's own data. */
const BASE_ROWS: { label: string; get: (p: ProductDetail) => string | null }[] = [
  { label: "SKU", get: (p) => p.sku },
  { label: "Category", get: (p) => p.category?.name ?? null },
  { label: "Material", get: (p) => p.material },
  { label: "Finish", get: (p) => p.finish },
  { label: "Colour", get: (p) => p.color },
  { label: "Dimensions", get: (p) => p.dimensions },
  { label: "Weight", get: (p) => p.weight },
  { label: "MOQ", get: (p) => p.moq },
  { label: "Lead time", get: (p) => p.lead_time },
  { label: "Stock", get: (p) => p.stock_status ?? null },
  { label: "Packaging", get: (p) => p.packaging_info ?? null },
];

export function CompareClient() {
  const { items, remove, clear } = useCompare();
  const { money, quoteIn, currency } = useMarket();
  const cart = useRfqCart();
  const [state, setState] = useState<LoadState>("loading");
  const [details, setDetails] = useState<ProductDetail[]>([]);

  useEffect(() => {
    if (items.length === 0) {
      setState("ready");
      return;
    }
    let cancelled = false;
    setState("loading");
    Promise.all(
      items.map((it) =>
        api<ProductDetail>(`/api/public/products/${encodeURIComponent(it.slug)}`).catch(() => null)
      )
    ).then((rows) => {
      if (cancelled) return;
      const ok = rows.filter((r): r is ProductDetail => r !== null);
      setDetails(ok);
      setState(ok.length > 0 || items.length === 0 ? "ready" : "error");
    });
    return () => { cancelled = true; };
    // Re-fetch when the shortlist changes (items identity changes on toggle).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // Union of every spec key across the shortlisted products.
  const specKeys: string[] = [];
  for (const d of details) {
    for (const s of d.specifications || []) {
      if (s.key && !specKeys.includes(s.key)) specKeys.push(s.key);
    }
  }

  const addAll = () => {
    for (const d of details) {
      const parsed = parseInt(String(d.moq ?? ""), 10);
      cart.add({
        product_id: d.id,
        product_name: d.name,
        quantity: Number.isFinite(parsed) && parsed > 0 ? parsed : 1,
      });
    }
  };

  return (
    <>
      <PageHero
        title="Compare Products"
        subtitle="Review up to four shortlisted products side by side before requesting a wholesale quotation."
      />
      <div className="container-x section">
        {state === "loading" && <Loading label="Loading your comparison…" />}

        {state !== "loading" && items.length === 0 && (
          <div className="mx-auto max-w-xl border border-clay/20 bg-white p-10 text-center">
            <h2 className="font-serif text-2xl text-espresso">Nothing to compare yet</h2>
            <p className="mt-3 text-sm text-gray">
              Tick <strong>Compare</strong> on any product card to build a side-by-side view — up to
              four products at a time.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/products" className="btn btn-outline">Browse the catalogue</Link>
              <Link href="/collections" className="btn btn-ghost">View collections</Link>
            </div>
          </div>
        )}

        {state === "error" && (
          <div className="mx-auto max-w-xl border border-clay/20 bg-white p-10 text-center">
            <h2 className="font-serif text-2xl text-espresso">We couldn&apos;t load those products</h2>
            <p className="mt-3 text-sm text-gray">Please remove a product or try again shortly.</p>
          </div>
        )}

        {state === "ready" && details.length > 0 && (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-gray">
                {details.length} of 4 products
                {currency ? ` · prices as listed until you pick a currency` : ""}
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={clear} className="btn btn-ghost btn-sm">
                  Clear all
                </button>
                <button type="button" onClick={addAll} className="btn btn-clay btn-sm">
                  Add all to enquiry
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-clay/20 bg-white">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="w-40 border-b border-clay/20 p-3 text-left align-bottom text-[10px] font-bold uppercase tracking-[0.14em] text-gray">
                      Product
                    </th>
                    {details.map((d) => (
                      <th key={d.id} className="border-b border-l border-clay/20 p-3 align-bottom">
                        <div className="mb-2 aspect-[4/3] overflow-hidden bg-cream">
                          {d.image?.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={mediaUrl(d.image.url)}
                              alt={d.image.alt_text || d.name}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <Link
                          href={`/products/${d.slug}`}
                          className="font-serif text-base font-semibold text-espresso hover:text-clay"
                        >
                          {d.name}
                        </Link>
                        <button
                          type="button"
                          onClick={() => remove(d.id)}
                          className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-gray hover:text-clay"
                        >
                          Remove
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th className="border-b border-clay/15 p-3 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-gray">
                      Price
                    </th>
                    {details.map((d) => {
                      const show = !d.price_on_request && d.price != null;
                      const priced = show ? money(d.price, d.currency) : null;
                      return (
                        <td key={d.id} className="border-b border-l border-clay/15 p-3">
                          {priced && priced.ok ? (
                            <>
                              <span className="font-bold text-espresso">{priced.text}</span>
                              {priced.converted && priced.date && (
                                <span className="mt-0.5 block text-[10px] text-gray">
                                  Indicative · rate date {priced.date}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-clay">
                              {quoteIn}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  {BASE_ROWS.map((row) => {
                    const values = details.map((d) => row.get(d));
                    if (values.every((v) => !v)) return null; // hide empty rows entirely
                    return (
                      <tr key={row.label}>
                        <th className="border-b border-clay/15 p-3 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-gray">
                          {row.label}
                        </th>
                        {values.map((v, i) => (
                          <td key={details[i].id} className="border-b border-l border-clay/15 p-3 text-espresso">
                            {v || <span className="text-gray">—</span>}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  {specKeys.map((key) => {
                    const values = details.map(
                      (d) => d.specifications?.find((s) => s.key === key)?.value ?? null
                    );
                    return (
                      <tr key={`spec-${key}`}>
                        <th className="border-b border-clay/15 p-3 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-gray">
                          {key}
                        </th>
                        {values.map((v, i) => (
                          <td key={details[i].id} className="border-b border-l border-clay/15 p-3 text-espresso">
                            {v || <span className="text-gray">—</span>}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  <tr>
                    <th className="p-3 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-gray">
                      Actions
                    </th>
                    {details.map((d) => {
                      const parsed = parseInt(String(d.moq ?? ""), 10);
                      return (
                        <td key={d.id} className="border-l border-clay/15 p-3">
                          <button
                            type="button"
                            className="btn btn-clay btn-sm mb-2 w-full"
                            onClick={() =>
                              cart.add({
                                product_id: d.id,
                                product_name: d.name,
                                quantity: Number.isFinite(parsed) && parsed > 0 ? parsed : 1,
                              })
                            }
                          >
                            Add to enquiry
                          </button>
                          <Link
                            href={`/products/${d.slug}`}
                            className="btn btn-ghost btn-sm block w-full text-center"
                          >
                            Full details
                          </Link>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-gray">
              Prices are indicative only and shown in your chosen currency where a rate is available —
              every order is confirmed by a written quotation. MOQ and lead times are per product
              listing.
            </p>
          </>
        )}
      </div>
    </>
  );
}
