"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, trackEvent } from "@/lib/api";
import type { ProductCard } from "@/lib/types";
import { ProductGrid } from "@/components/public/Shared";
import { Loading, ErrorBox } from "@/components/public/States";

import type { CountryConfig } from "./country-data";
import { COUNTRIES } from "./country-data";

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

  useEffect(() => {
    if (!cfg) return;
    if (initialProducts !== null) {
      // Server already provided the crawlable list — only fire analytics.
      trackEvent({ event_type: "product_view", country: cfg.name });
      return;
    }
    api<{ items: ProductCard[] }>("/api/public/products?page_size=100&sort=featured")
      .then((d) => {
        const items = (d.items || []).filter(
          (p) => p.category && cfg.categories.includes(p.category.slug)
        );
        setProducts(items);
        trackEvent({ event_type: "product_view", country: cfg.name });
      })
      .catch((e) => setErr(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (!cfg) return null;

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

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <section className="bg-cream border-b border-clay/15">
        <div className="container-x py-12 md:py-16">
          <nav className="text-xs text-gray mb-3" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-navy">Home</Link>
            <span className="mx-1">/</span>
            <span className="text-charcoal">Wholesale · {cfg.name}</span>
          </nav>
          <p className="eyebrow text-clay">Wholesale · {cfg.name}</p>
          <h1 className="page-title mt-2">{cfg.h1}</h1>
        </div>
      </section>
      <div className="container-x section max-w-4xl">
        {cfg.intro.map((p, i) => (
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
        <h2 className="font-serif font-bold text-espresso text-2xl mt-10">Relevant products</h2>
        <div className="mt-4">
          {err && <ErrorBox error={err} retry={() => window.location.reload()} />}
          {!err && products === null && <Loading label="Loading products…" />}
          {!err && products !== null && (
            <ProductGrid
              products={products.slice(0, 12)}
              emptyHint="No matching products are published yet — browse the full catalogue."
            />
          )}
        </div>
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
            Request a Wholesale Quote
          </Link>
          <Link href="/products" className="btn btn-ghost">
            Browse the Catalogue
          </Link>
        </div>
      </div>
    </div>
  );
}
