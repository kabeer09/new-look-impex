"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, mediaUrl } from "@/lib/api";
import type { Collection } from "@/lib/types";
import { Loading, ErrorBox, EmptyState } from "@/components/public/States";
import { PageHero } from "@/components/public/Shared";

export default function CollectionsClient() {
  const [items, setItems] = useState<Collection[] | null>(null);
  const [err, setErr] = useState("");

  const load = () => {
    setErr("");
    api<{ items: Collection[] }>("/api/public/collections")
      .then((d) => setItems(d.items || []))
      .catch((e) => setErr(String(e)));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <PageHero
        title="Collections"
        subtitle="Curated wholesale ranges — brass edits, copper selections and seasonal groupings."
      />
      <div className="container-x section">
        {err && <ErrorBox error={err} retry={load} />}
        {!err && items === null && <Loading label="Loading collections…" />}
        {!err && items !== null && items.length === 0 && (
          <EmptyState
            title="No collections yet"
            hint="Collections will appear here once published."
            action={<Link className="btn btn-outline btn-sm" href="/products">Browse all products</Link>}
          />
        )}
        {!err && items !== null && items.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((c) => (
              <Link key={c.slug} href={`/collections/${c.slug}`} className="group block bg-white border border-sand hover:border-brass transition-colors">
                <span className="relative block aspect-[16/9] bg-navy overflow-hidden">
                  {c.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mediaUrl(c.image_url)}
                      alt={c.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <span
                      className="absolute inset-0 flex items-center justify-center font-serif text-6xl font-bold text-gold-light"
                      aria-hidden="true"
                    >
                      {c.name.trim().charAt(0).toUpperCase() || "N"}
                    </span>
                  )}
                </span>
                <span className="block p-5">
                  <span className="block font-serif font-semibold text-navy text-xl group-hover:underline underline-offset-2">
                    {c.name}
                  </span>
                  {c.description && <span className="block text-sm text-gray mt-2 line-clamp-2">{c.description}</span>}
                  <span className="block text-xs text-brass-dark mt-3 font-semibold">
                    {c.product_count != null ? `${c.product_count} product${c.product_count === 1 ? "" : "s"} →` : "View →"}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
