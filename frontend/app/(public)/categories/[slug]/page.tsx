import Link from "next/link";
import { mediaUrl } from "@/lib/api";
import type { Category, ProductCard } from "@/lib/types";
import { PageHero } from "@/components/public/Shared";
import { EmptyState } from "@/components/public/States";
import CategoryProducts from "./CategoryProducts";
import { CATEGORY_EDITORIAL } from "./category-editorial";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const revalidate = 300; // ISR: category data refreshes every 5 minutes

type CategoryPayload = Category & { items?: ProductCard[]; total?: number };

type FetchResult =
  | { status: "ok"; data: CategoryPayload }
  | { status: "404" }
  | { status: "unavailable" };

/**
 * Server-side fetch so the H1, description, editorial copy, FAQ and product
 * links are present in the initial HTML instead of being JavaScript-loaded.
 * On API failure the page still renders and CategoryProducts fetches client-side.
 */
async function fetchCategory(slug: string): Promise<FetchResult> {
  try {
    const r = await fetch(
      `${API}/api/public/categories/${encodeURIComponent(slug)}?page_size=24`,
      { next: { revalidate: 300 } }
    );
    if (r.status === 404) return { status: "404" };
    if (!r.ok) return { status: "unavailable" };
    return { status: "ok", data: await r.json() };
  } catch {
    return { status: "unavailable" };
  }
}

export default async function CategoryDetailPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const result = await fetchCategory(slug);
  const editorial = CATEGORY_EDITORIAL[slug];

  if (result.status === "404") {
    // API said 404 (unknown or hidden slug) — layout already noindexes it.
    return (
      <div className="container-x section">
        <EmptyState
          title="Category not found"
          action={<Link href="/categories" className="btn btn-primary btn-sm">Browse categories</Link>}
        />
      </div>
    );
  }

  const data = result.status === "ok" ? result.data : null;
  const name = data?.name || slug.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  const description = data?.seo_description || data?.description || editorial?.paragraphs[0] || "";
  const products = data?.items || [];
  const total = data?.total || 0;
  const canonical = `https://www.newlookimpex.store/categories/${slug}`;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.newlookimpex.store/" },
      { "@type": "ListItem", position: 2, name: "Categories", item: "https://www.newlookimpex.store/categories" },
      { "@type": "ListItem", position: 3, name, item: canonical },
    ],
  };

  const faqLd = editorial
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: editorial.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}

      <PageHero title={name} subtitle={description} />

      <div className="container-x section">
        {/* Breadcrumb navigation (visible + schema above) */}
        <nav className="text-xs text-gray mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-navy">Home</Link>
          <span className="mx-1">/</span>
          <Link href="/categories" className="hover:text-navy">Categories</Link>
          <span className="mx-1">/</span>
          <span className="text-charcoal">{name}</span>
        </nav>

        {data?.image_url && (
          <div className="relative aspect-[21/9] bg-sand rounded-xl overflow-hidden mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaUrl(data.image_url)}
              alt={`${name} — wholesale range manufactured and supplied by New Look Impex, Moradabad`}
              className="object-cover w-full h-full"
            />
          </div>
        )}

        {/* Server-rendered editorial: intro, FAQ and internal links in HTML */}
        {editorial && (
          <div className="max-w-3xl">
            <h2 className="font-serif font-bold text-navy text-2xl mb-3">{editorial.heading}</h2>
            {editorial.paragraphs.map((p) => (
              <p key={p.slice(0, 40)} className="text-gray mb-4 leading-relaxed">{p}</p>
            ))}
          </div>
        )}

        {/* Product grid — page 1 arrives server-side when the API responds */}
        <div className="mt-8">
          <CategoryProducts
            slug={slug}
            initialProducts={data ? products : null}
            initialTotal={total}
          />
        </div>

        {editorial && (
          <div className="max-w-3xl mt-12">
            <h2 className="font-serif font-bold text-navy text-2xl mb-4">
              Frequently asked questions about {name.toLowerCase()}
            </h2>
            <dl className="space-y-5">
              {editorial.faqs.map((f) => (
                <div key={f.q}>
                  <dt className="font-semibold text-navy">{f.q}</dt>
                  <dd className="text-gray text-sm mt-1">{f.a}</dd>
                </div>
              ))}
            </dl>

            <h2 className="font-serif font-bold text-navy text-2xl mt-10 mb-4">Related ranges & resources</h2>
            <ul className="grid sm:grid-cols-2 gap-3">
              {editorial.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="block card p-4 hover:shadow-lg transition-shadow"
                  >
                    <span className="font-semibold text-navy text-sm">{l.label}</span>
                    <span className="block text-gray text-xs mt-1">{l.blurb}</span>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-10 card p-6 bg-cream">
              <h2 className="font-serif font-bold text-navy text-xl">Need pricing for this range?</h2>
              <p className="text-gray text-sm mt-2">
                Send the products and quantities you need — we respond with a written quotation
                covering price, MOQ, lead time and packaging.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/request-quote" className="btn btn-primary btn-sm">Request Wholesale Quote</Link>
                <Link href="/catalogue" className="btn btn-outline btn-sm">Request Catalogue</Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
