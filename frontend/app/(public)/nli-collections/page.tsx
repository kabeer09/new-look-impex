"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, mediaUrl, whatsappLink } from "@/lib/api";
import type { ProductCard } from "@/lib/types";
import { Loading, ErrorBox } from "@/components/public/States";
import { PageHero } from "@/components/public/Shared";

/** Explore section — every href points at a real, live collection slug. */
const COLLECTION_CARDS: { title: string; copy: string; href: string }[] = [
  {
    title: "Brass Home Décor",
    copy: "Brass decorative items and metal home accents — vases, trays, bowls and wall pieces for living rooms and retail floors.",
    href: "/collections/metal-home-decor",
  },
  {
    title: "Copper Essentials",
    copy: "Copper bottles, jugs and drinkware — hand-hammered copper pieces for everyday use and premium gifting.",
    href: "/collections/copper-collection",
  },
  {
    title: "Brass Tableware",
    copy: "Brass serveware, dinner sets and kitchenware — handcrafted brass tableware for dining and hospitality.",
    href: "/collections/brass-kitchen-collection",
  },
  {
    title: "Pooja & Festive",
    copy: "Diyas, urlis, lanterns and festive décor — traditional Indian brass pieces for pooja and celebration.",
    href: "/collections/diyas-lanterns",
  },
];

/** FAQ — answers reflect the site's real shipping/terms pages (no invented policies). */
const FAQ: { q: string; a: string }[] = [
  {
    q: "What materials are used in NLI Collections products?",
    a: "NLI Collections pieces are made from solid brass and copper, in hammered, polished, antique, etched and matte finishes. Each product page lists its own material and finish.",
  },
  {
    q: "Are NLI Collections products handmade in India?",
    a: "Yes — every piece is crafted and hand-finished by artisans in Moradabad, Uttar Pradesh, India, and brought to you under the NLI Collections brand of New Look Impex.",
  },
  {
    q: "How do I care for brass and copper homeware?",
    a: "Wipe pieces with a soft dry cloth after use and store them away from moisture. To restore shine, use a mild metal polish and avoid harsh chemicals or abrasive scrubbers.",
  },
  {
    q: "Do you ship internationally?",
    a: "Yes. We ship worldwide — freight, transit time and any import duties are quoted per order and confirmed in writing before production begins.",
  },
  {
    q: "How do I order or get a price for a piece?",
    a: "Prices are confirmed per order. Add the products you like to a quote request or message us on WhatsApp — we reply in writing with price, availability and delivery terms.",
  },
  {
    q: "Can I buy NLI Collections products as gifts?",
    a: "Yes — the gifting collection covers home and festive gifting, with gift-ready packaging available. Tell us your requirements when you enquire.",
  },
];

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

  const canonical = "https://www.newlookimpex.store/nli-collections";
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.newlookimpex.store/" },
      { "@type": "ListItem", position: 2, name: "NLI Collections", item: canonical },
    ],
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <PageHero
        title="NLI Collections — Handcrafted Brass & Copper for Beautiful Homes"
        subtitle="Premium handcrafted brass and copper home décor — tableware, copper bottles and distinctive gifts from Moradabad, India."
      />
      {/* =====================================================
         HERO SECTION
         ===================================================== */}
      <section className="section border-y border-sand bg-cream">
        <div className="container-x">
          <div className="grid md:grid-cols-[1fr_450px] gap-12 items-center py-16">
            <div>
              <h2 className="font-serif font-bold text-navy text-4xl md:text-5xl mt-4 leading-[1.1]">
                Timeless Metal Craftsmanship from Moradabad
              </h2>
              <p className="text-clay uppercase tracking-[0.2em] text-xs font-semibold mt-6">
                New Look Impex • Moradabad, India
              </p>
              <p className="text-gray mt-8 text-lg leading-relaxed max-w-lg">
                Discover handcrafted brass and copper home décor by NLI Collections. Explore
                elegant metal tableware, copper bottles, brass serveware and timeless Indian
                craftsmanship from Moradabad, India.
              </p>
              <ul className="mt-10 space-y-3 text-sm text-navy/70 font-semibold">
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-gold" aria-hidden="true" />
                  Handcrafted by artisans in Moradabad
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-gold" aria-hidden="true" />
                  Premium homeware for modern households
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-gold" aria-hidden="true" />
                  Gift-ready packaging available
                </li>
              </ul>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link href="/collections" className="btn bg-clay text-cream hover:bg-clay-dark !px-6 !py-3">
                  Explore Collections
                </Link>
                <Link href="/collections/metal-home-decor" className="btn bg-brass text-white hover:bg-brass-dark !px-6 !py-3">
                  Brass Décor
                </Link>
                <Link href="/collections/copper-collection" className="btn border border-clay text-clay hover:bg-clay/10 !px-6 !py-3">
                  Copper Essentials
                </Link>
                <Link href="/collections/gifting" className="btn border border-clay text-clay hover:bg-clay/10 !px-6 !py-3">
                  Gifting
                </Link>
              </div>
              <p className="mt-4 text-xs text-gold uppercase tracking-wider">
                Crafted in Moradabad, India | By New Look Impex
              </p>
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
                <h3 className="font-serif font-bold text-cream text-2xl mb-2">
                  Handcrafted in Moradabad
                </h3>
                <p className="text-cream/90 text-sm">
                  NLI Collections — brass and copper masterpieces for home.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
         EXPLORE OUR COLLECTIONS
         ===================================================== */}
      <section className="section" aria-labelledby="nli-explore">
        <div className="container-x">
          <p className="eyebrow text-clay uppercase tracking-[0.2em] text-xs font-semibold">
            Shop by Category
          </p>
          <h2 id="nli-explore" className="font-serif font-bold text-navy text-3xl md:text-4xl mt-2">
            Explore Our Collections
          </h2>
          <p className="text-gray mt-2 max-w-2xl">
            Four ways into the catalogue — handcrafted brass décor, copper essentials,
            brass tableware and festive pieces, all from Moradabad, India.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            {COLLECTION_CARDS.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="group block border border-sand rounded-3xl p-6 bg-white hover:border-brass/50 hover:shadow-lg transition-all"
              >
                <h3 className="font-serif font-bold text-espresso text-xl group-hover:text-clay transition-colors">
                  {c.title}
                </h3>
                <p className="text-sm text-gray mt-3 leading-relaxed">{c.copy}</p>
                <span className="inline-block mt-4 text-[11px] uppercase tracking-wider text-brass-dark font-bold">
                  View Collection →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
         BRAND STORY / PIN BOARD
         ===================================================== */}
      <section className="section" aria-labelledby="nli-collections-pins">
        <div className="container-x">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="eyebrow text-clay uppercase tracking-[0.2em] text-xs font-semibold">
                Featured Pins
              </p>
              <h2 id="nli-collections-pins" className="font-serif font-bold text-navy text-3xl md:text-4xl mt-2">
                The NLI Collections Pin Board
              </h2>
              <p className="text-gray mt-2">
                Hand-selected brass & copper pieces for beautiful homes.
              </p>
            </div>
            <Link href="/products" className="btn btn-ghost btn-sm">
              View All Products →
            </Link>
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
                        <span className="font-serif text-4xl font-bold text-clay-light">
                          {p.name.charAt(0)}
                        </span>
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
                    <p className="text-[11px] uppercase tracking-[0.12em] text-gray mb-1">
                      {p.sku || "NLI"}
                    </p>
                    <h3 className="font-serif font-bold text-espresso text-lg leading-snug group-hover:text-clay transition-colors">
                      {p.name}
                    </h3>
                    <p className="text-xs text-navy/60 mt-1 font-semibold">
                      {p.material} · {p.finish || "Hand-finished"}
                    </p>
                    <div className="mt-4">
                      {p.price_on_request || p.price == null ? (
                        <span className="text-xs font-bold tracking-wide text-clay uppercase">
                          Price on request
                        </span>
                      ) : (
                        <span className="text-base font-bold text-espresso">
                          ₹{typeof p.price === "number" ? p.price.toLocaleString() : p.price}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
         CRAFTED IN MORADABAD
         ===================================================== */}
      <section className="section bg-cream border-y border-sand" aria-labelledby="nli-crafted">
        <div className="container-x">
          <div className="max-w-3xl">
            <p className="eyebrow text-clay uppercase tracking-[0.2em] text-xs font-semibold">
              Our Craftsmanship
            </p>
            <h2 id="nli-crafted" className="font-serif font-bold text-navy text-3xl md:text-4xl mt-2">
              Crafted in Moradabad, India
            </h2>
            <p className="text-gray mt-5 leading-relaxed">
              Moradabad's artisans have worked brass and copper for generations, and every
              NLI Collections piece carries that heritage. Pieces are shaped, hammered and
              hand-finished in Moradabad, Uttar Pradesh, then brought together under the
              NLI Collections brand by New Look Impex.
            </p>
            <p className="text-gray mt-4 leading-relaxed">
              From hammered copper bottles and polished brass serveware to antique-finish
              diyas and etched decorative items, the range covers hammered, polished,
              antique, etched and matte finishes for every style of home — with the
              material and finish of each piece listed on its own product page.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/craft" className="btn btn-outline btn-sm">
                Our Story
              </Link>
              <Link href="/about" className="btn btn-ghost btn-sm">
                About New Look Impex
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
         FAQ
         ===================================================== */}
      <section className="section" aria-labelledby="nli-faq">
        <div className="container-x max-w-3xl">
          <p className="eyebrow text-clay uppercase tracking-[0.2em] text-xs font-semibold">
            Buyer Questions
          </p>
          <h2 id="nli-faq" className="font-serif font-bold text-navy text-3xl md:text-4xl mt-2">
            Frequently Asked Questions
          </h2>
          <dl className="mt-8 space-y-6">
            {FAQ.map((f) => (
              <div key={f.q} className="border-b border-sand pb-6">
                <dt className="font-serif font-bold text-espresso text-lg">{f.q}</dt>
                <dd className="text-gray mt-2 leading-relaxed">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* =====================================================
         BRAND CONTACT / ENQUIRY CTA
         ===================================================== */}
      <section className="section bg-navy text-white">
        <div className="container-x py-20 text-center rounded-3xl overflow-hidden bg-gradient-to-br from-navy via-navy to-clay-dark">
          <h2 className="font-serif font-bold text-cream text-4xl md:text-5xl mt-2">
            Bring Timeless Indian Craftsmanship Into Your Home
          </h2>
          <p className="text-cream/80 mt-4 max-w-2xl mx-auto text-lg">
            Explore the full collection, or message us about a piece you love — we confirm
            price, availability and delivery terms in writing. Shipping is quoted worldwide,
            per order.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/collections" className="btn bg-gold text-navy hover:bg-cream !px-8 !py-3">
              Explore Collections
            </Link>
            <Link href="/contact" className="btn border border-white text-white hover:bg-white hover:text-navy !px-8 !py-3">
              Contact Us
            </Link>
            <a
              href={whatsappLink("Hi NLI Collections, I'd like to know more about your handcrafted brass and copper products.")}
              target="_blank"
              rel="noopener noreferrer"
              className="btn border border-white text-white hover:bg-white hover:text-navy !px-8 !py-3"
            >
              WhatsApp Us
            </a>
          </div>
          <p className="text-cream/60 text-sm mt-8">
            Crafted in Moradabad, India | By New Look Impex
          </p>
          <p className="text-cream/50 text-xs mt-2">
            Trade buyer?{" "}
            <Link href="/wholesale" className="underline underline-offset-2 hover:text-gold">
              Wholesale, bulk & export enquiries
            </Link>{" "}
            · New Look Impex
          </p>
        </div>
      </section>
    </>
  );
}
