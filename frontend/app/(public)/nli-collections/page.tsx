"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, mediaUrl, whatsappLink } from "@/lib/api";
import type { ProductCard } from "@/lib/types";
import { Loading, ErrorBox } from "@/components/public/States";
import { PageHero } from "@/components/public/Shared";

export default function NliCollectionsBrandPage() {
  const [products, setProducts] = useState<ProductCard[] | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    setErr("");
    api<{ items: ProductCard[]; total?: number }>(
      "/api/public/products?page_size=40"
    )
      .then((d) => setProducts(d.items || []))
      .catch((e) => setErr(String(e)));
  }, []);

  return (
    <>
      <PageHero
        title="NLI Collections"
        subtitle="The consumer brand of New Look Impex — handcrafted brass & copper masterpieces from Moradabad."
      />
      {/* Brand story — Pinterest-style editorial */}
      <section className="section border-y border-sand bg-cream">
        <div className="container-x">
          <div className="grid md:grid-cols-[1fr_450px] gap-12 items-center py-16">
            <div>
              <h2 className="font-serif font-bold text-navy text-4xl md:text-5xl mt-4 leading-[1.1]">
                NLI Collections
              </h2>
              <p className="text-clay uppercase tracking-[0.2em] text-xs font-semibold mt-6">
                New Look Impex • Moradabad, India
              </p>
              <p className="text-gray mt-8 text-lg leading-relaxed max-w-lg">
                NLI Collections is the consumer-facing brand of New Look Impex — a Moradabad-based
                manufacturer, exporter and wholesale supplier of hand-hammered brass and copper
                metalware. Every piece is crafted by artisans using generations-old techniques,
                then finished for modern homes, hospitality spaces and gifting programmes worldwide.
              </p>
              <ul className="mt-10 space-y-3 text-sm text-navy/70 font-semibold">
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-gold" aria-hidden="true" />
                  Factory-direct brass & copper manufacturer
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-gold" aria-hidden="true" />
                  Wholesale MOQ & bulk export enquiries welcome
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-gold" aria-hidden="true" />
                  OEM / private label & custom finishes available
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-gold" aria-hidden="true" />
                  GSTIN: 09AFKPA4462R1ZW
                </li>
              </ul>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link href="/products" className="btn bg-clay text-cream hover:bg-clay-dark !px-6 !py-3">
                  Shop NLI Collections →
                </Link>
                <Link href="/request-quote" className="btn border border-clay !text-clay hover:bg-clay hover:!text-cream !px-6 !py-3">
                  Request Wholesale Quote
                </Link>
              </div>
            </div>
            {/* Pinterest-style brand pin */}
            <div className="relative aspect-[4/5] bg-navy overflow-hidden rounded-3xl shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/hero-brass-kitchen.jpg"
                alt="NLI Collections — handcrafted brass and copper metalware from Moradabad"
                className="absolute inset-0 w-full h-full object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/40 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <span className="inline-block bg-gold text-navy text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-3">
                  New Brand
                </span>
                <h3 className="font-serif font-bold text-cream text-2xl mb-2">Handcrafted in Moradabad</h3>
                <p className="text-cream/90 text-sm">NLI Collections — brass and copper masterpieces for global buyers.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pinterest-style product grid — brand pin board */}
      <section className="section" aria-labelledby="nli-collections-pins">
        <div className="container-x">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="eyebrow text-clay uppercase tracking-[0.2em] text-xs font-semibold">Featured Pins</p>
              <h2 id="nli-collections-pins" className="font-serif font-bold text-navy text-3xl md:text-4xl mt-2">
                The NLI Collections Pin Board
              </h2>
              <p className="text-gray mt-2">Hand-selected brass & copper pieces from our wholesale catalogue.</p>
            </div>
            <Link href="/products" className="btn btn-ghost btn-sm">View All Products →</Link>
          </div>

          {err && <ErrorBox error={err} />}
          {products === null && <Loading label="Loading brand pins…" />}
          {products && products.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.slice(0, 16).map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.slug}`}
                  className="group block border border-sand rounded-3xl overflow-hidden bg-white transition-all hover:border-brass/50 hover:shadow-lg"
                >
                  <div className="relative aspect-[4/5] bg-cream overflow-hidden">
                    {p.image?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mediaUrl(p.image.url)}
                        alt={p.image.alt_text || `${p.name} — NLI Collections`}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-cream/30">
                        <span className="font-serif text-4xl font-bold text-clay-light">{p.name.charAt(0)}</span>
                      </div>
                    )}
                    {p.featured && (
                      <span className="absolute top-3 left-3 inline-block bg-gold text-navy text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
                        Featured
                      </span>
                    )}
                    <span className="absolute top-3 right-3 inline-block bg-white/90 backdrop-blur text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full text-navy/70">
                      {p.material || "Metalware"}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-gray mb-1">{p.sku || "NLI"}</p>
                    <h3 className="font-serif font-bold text-espresso text-lg leading-snug group-hover:text-clay transition-colors">
                      {p.name}
                    </h3>
                    <p className="text-xs text-navy/60 mt-1 font-semibold">
                      {p.material} · {p.finish || "Hand-finished"}
                    </p>
                    <div className="mt-4 flex items-center justify-between">
                      {p.price_on_request || p.price == null ? (
                        <span className="text-xs font-bold tracking-wide text-clay uppercase">Price on request</span>
                      ) : (
                        <span className="text-base font-bold text-espresso">
                          ₹{typeof p.price === "number" ? p.price.toLocaleString() : p.price}
                        </span>
                      )}
                      <span className="text-[10px] uppercase tracking-wider text-brass-dark font-bold">
                        MOQ {p.moq || "—"}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Brand contact / trade CTA */}
      <section className="section bg-navy text-white">
        <div className="container-x py-20 text-center rounded-3xl overflow-hidden bg-gradient-to-br from-navy via-navy to-clay-dark">
          <h2 className="font-serif font-bold text-cream text-4xl md:text-5xl mt-2">
            Wholesale enquiries welcome
          </h2>
          <p className="text-cream/80 mt-4 max-w-2xl mx-auto text-lg">
            Retailers, importers, interior designers and corporate buyers — source NLI Collections
            directly from the manufacturer in Moradabad. Written quotations, bulk MOQ and export
            documentation on every order.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/request-quote" className="btn bg-gold text-navy hover:bg-cream !px-8 !py-3">
              Request a Quote
            </Link>
            <a
              href={whatsappLink(`Hi NLI Collections, I'm interested in wholesale pricing for brass & copper products from Moradabad.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn border border-white text-white hover:bg-white hover:text-navy !px-8 !py-3"
            >
              WhatsApp Us
            </a>
          </div>
          <p className="text-cream/60 text-sm mt-8">
            New Look Impex • Moradabad, Uttar Pradesh 244001, India • GSTIN 09AFKPA4462R1ZW
          </p>
        </div>
      </section>
    </>
  );
}
