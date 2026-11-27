"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api, mediaUrl } from "@/lib/api";
import type { ProductCard } from "@/lib/types";
import { Loading, ErrorBox, EmptyState } from "@/components/public/States";
import { PageHero, ProductGrid } from "@/components/public/Shared";

interface DedicatedCategoryPageProps {
  title: string;
  description: string;
  h1: string;
  intro: string;
  filterParams: Record<string, string>;
  ctaLabel: string;
  ctaHref: string;
  relatedLinks: { label: string; href: string }[];
  faqs: { q: string; a: string }[];
}

export function DedicatedCategoryPage({
  title, description, h1, intro, filterParams, ctaLabel, ctaHref, relatedLinks, faqs,
}: DedicatedCategoryPageProps) {
  const [products, setProducts] = useState<ProductCard[] | null>(null);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const pathname = usePathname() || "/";
  const canonical = `https://www.newlookimpex.store${pathname}`;
  // Same source as the visible FAQ/breadcrumb — structured data cannot drift.
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.newlookimpex.store/" },
      { "@type": "ListItem", position: 2, name: h1, item: canonical },
    ],
  };
  const faqLd = faqs.length ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  } : null;

  useEffect(() => {
    setLoading(true);
    setErr("");
    const params = new URLSearchParams(filterParams);
    api<{ items: ProductCard[]; total?: number }>(`/api/public/products?${params.toString()}`)
      .then((d) => {
        setProducts(d.items || []);
        setTotal(d.total || 0);
      })
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}
      {/* One H1 only: the hero owns it. The body keeps the fuller intro as a
          lead paragraph — no repeated title or duplicate description. */}
      <PageHero title={h1} subtitle={description} />
      <div className="container-x section">
        <p className="text-gray mt-0 mb-10 max-w-3xl text-sm leading-relaxed">{intro}</p>

        {err && <ErrorBox error={err} />}
        {loading && <Loading label="Loading products…" />}
        {!loading && !err && (!products || products.length === 0) && (
          <EmptyState title="No products in this category yet" hint="Check back soon or browse the full catalogue." action={<Link className="btn btn-outline btn-sm" href="/products">Browse all products</Link>} />
        )}
        {!loading && !err && products && products.length > 0 && (
          <>
            <p className="text-xs text-gray mb-3">{total} product{total === 1 ? "" : "s"}</p>
            <ProductGrid products={products} />
            <div className="text-center mt-8">
              <Link href={ctaHref} className="btn btn-clay !px-6 !py-3">{ctaLabel}</Link>
            </div>
          </>
        )}

        {/* Related categories */}
        {relatedLinks.length > 0 && (
          <div className="mt-16 border-t border-sand pt-8">
            <h2 className="font-serif font-bold text-navy text-xl mb-6">Related Categories</h2>
            <div className="flex flex-wrap gap-4">
              {relatedLinks.map((l) => (
                <Link key={l.href} href={l.href} className="btn btn-outline btn-sm">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* FAQ */}
        {faqs.length > 0 && (
          <div className="mt-16 border-t border-sand pt-8">
            <h2 className="font-serif font-bold text-navy text-xl mb-6">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {faqs.map((f, i) => (
                <div key={i} className="bg-white border border-sand rounded-xl p-5">
                  <p className="font-sans font-semibold text-navy text-sm">{f.q}</p>
                  <p className="text-sm text-gray mt-2">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
