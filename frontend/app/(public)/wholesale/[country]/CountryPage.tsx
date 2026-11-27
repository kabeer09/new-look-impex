"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, trackEvent } from "@/lib/api";
import type { ProductCard } from "@/lib/types";
import { ProductGrid } from "@/components/public/Shared";
import { Loading, ErrorBox } from "@/components/public/States";
import { MarketHero, MarketGallery } from "@/components/public/MarketVisuals";
import { getMarketVisual } from "@/lib/market-visuals";
import { useMarket } from "@/lib/market";

import type { CountryConfig } from "./country-data";
import { COUNTRIES } from "./country-data";
import { EUROPE_COUNTRIES } from "@/app/(public)/europe/[country]/europe-data";

const SITE = "https://www.newlookimpex.store";

export function CountryPage({
  slug,
  initialProducts = null,
}: {
  slug: string;
  initialProducts?: ProductCard[] | null;
}) {
  const cfg = COUNTRIES[slug];
  const [products, setProducts] = useState<ProductCard[] | null>(initialProducts);
  const [err, setErr] = useState("");
  // Honest quote wording: "Request Wholesale Quote in USD" follows the
  // buyer's chosen currency, never a converted figure.
  const { quoteIn } = useMarket();

  useEffect(() => {
    if (!cfg) return;
    if (initialProducts !== null) {
      // Server already provided the crawlable list — only fire analytics.
      trackEvent({ event_type: "product_view", country: cfg.name });
      return;
    }
    let done = false;
    // Never leave a visitor (or a crawler snapshot) on a permanent spinner.
    const timer = setTimeout(() => { if (!done) setProducts([]); }, 8000);
    api<{ items: ProductCard[] }>("/api/public/products?page_size=100&sort=featured")
      .then((d) => {
        const items = (d.items || []).filter(
          (p) => p.category && cfg.categories.includes(p.category.slug)
        );
        setProducts(items);
        trackEvent({ event_type: "product_view", country: cfg.name });
      })
      .catch((e) => setErr(String(e)))
      .finally(() => { done = true; clearTimeout(timer); });
    return () => { done = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (!cfg) return null;
  const visual = getMarketVisual(slug);

  const canonical = `${SITE}/${slug === "australia" ? "au" : slug}`;
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: `Wholesale ${cfg.name}`, item: canonical },
    ],
  };
  // FAQPage schema generated from the same visible copy — never drifts.
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: cfg.faqs.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
  // Market-specific WebPage signal for Google — makes the served country explicit.
  const webpageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: cfg.h1,
    description: cfg.intro[0]?.slice(0, 160),
    url: canonical,
    inLanguage: "en",
    areaServed: { "@type": "Country", name: cfg.name },
    about: { "@type": "Thing", name: cfg.bullets[0] },
    mentions: cfg.categories.map((c) => ({ "@type": "Thing", name: c })),
    primaryImageOfPage: { "@type": "ImageObject", url: `${SITE}${visual.hero}` },
    isPartOf: { "@type": "WebSite", name: "New Look Impex", url: SITE },
  };
  const currentPath = slug === "australia" ? "/au" : `/${slug}`;
  const otherMarkets = [
    ...Object.values(COUNTRIES)
      .filter((c) => c.slug !== "europe")
      .map((c) => ({ name: c.name, href: `/${c.slug}` })),
    ...EUROPE_COUNTRIES.map((c) => ({ name: c.name, href: `/europe/${c.slug}` })),
  ].filter((m) => m.href !== currentPath);

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webpageLd) }} />

      <MarketHero
        visual={visual}
        eyebrow={`Wholesale · ${cfg.name}`}
        h1={cfg.h1}
        intro={cfg.intro[0]}
        breadcrumb={<><Link href="/" className="hover:text-navy">Home</Link><span className="mx-1">/</span><span className="text-charcoal">Wholesale · {cfg.name}</span></>}
        ctas={<><Link href="/request-quote" className="btn btn-clay">{quoteIn}</Link><Link href="/products" className="btn btn-ghost">Browse the Catalogue</Link></>}
      />
      <div className="container-x section max-w-4xl">
        {cfg.intro.slice(1).map((p, i) => (
          <p key={i} className="text-gray mt-4 first:mt-0 leading-relaxed">{p}</p>
        ))}
        <ul className="mt-6 space-y-2">
          {cfg.bullets.map((b) => (
            <li key={b} className="flex gap-2 text-sm">
              <span className="text-clay font-bold" aria-hidden="true">✓</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <MarketGallery images={visual.gallery} name={cfg.name} theme={visual.theme} />
        <h2 className="font-serif font-bold text-espresso text-2xl mt-10">Relevant products</h2>
        <div className="mt-4">
          {err && <ErrorBox error={err} retry={() => window.location.reload()} />}
          {!err && products === null && <Loading label="Loading products…" />}
          {!err && products !== null && (
            <ProductGrid
              products={products.slice(0, 12)}
              emptyHint="No matching products are published yet — browse the relevant ranges below."
            />
          )}
        </div>
        {/* Always-crawlable route to the actual catalogue, even when the API
            is cold or no published product currently matches this market. */}
        <section className="mt-8" aria-labelledby="relevant-ranges">
          <h3 id="relevant-ranges" className="font-serif font-bold text-espresso text-xl">
            Relevant product ranges
          </h3>
          <ul className="mt-3 flex flex-wrap gap-3">
            {cfg.categories.map((cat) => (
              <li key={cat}>
                <Link
                  href={`/products?category=${encodeURIComponent(cat)}`}
                  className="btn btn-outline btn-sm"
                >
                  {cat.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                </Link>
              </li>
            ))}
            <li><Link href="/products" className="text-sm text-navy underline underline-offset-2">Full catalogue</Link></li>
          </ul>
        </section>
        <h2 className="font-serif font-bold text-espresso text-2xl mt-10">Buyer questions</h2>
        <div className="mt-4 space-y-5">
          {cfg.faqs.map(([q, a]) => (
            <div key={q}>
              <h3 className="font-semibold">{q}</h3>
              <p className="text-sm text-gray mt-1">{a}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/request-quote" className="btn btn-clay">
            {quoteIn}
          </Link>
          <Link href="/products" className="btn btn-ghost">
            Browse the Catalogue
          </Link>
        </div>

        <section className="mt-12 border-t border-clay/20 pt-8">
          <h2 className="font-serif font-bold text-espresso text-xl">Other markets we serve</h2>
          <p className="text-sm text-gray mt-2">
            Country-specific wholesale guidance for buyers in other markets.
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {otherMarkets.map((m) => (
              <li key={m.href}>
                <Link href={m.href} className="text-sm text-navy hover:text-clay underline underline-offset-2">
                  {m.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>

      </div>
    </div>
  );
}
