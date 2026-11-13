import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/public/Shared";
import { POSTS } from "./posts";

export const metadata: Metadata = {
  title: "Buying Guides & Blog",
  description:
    "Practical buying guides for wholesale brass and copper handicrafts from Moradabad — sourcing tips, styling advice, and export insights.",
  alternates: { canonical: "https://www.newlookimpex.store/blog" },
};

export default function BlogPage() {
  return (
    <>
      <PageHero title="Buying Guides" subtitle="Practical notes for wholesale décor buyers" />
      <div className="container-x section">
        <div className="grid md:grid-cols-2 gap-6">
          {POSTS.map((p) => (
            <article key={p.slug} className="card">
              <p className="text-xs text-gray">
                <time dateTime={p.date}>{p.date}</time>
              </p>
              <h2 className="font-serif font-bold text-navy text-xl mt-1">
                <Link href={`/blog/${p.slug}`} className="hover:text-clay">
                  {p.title}
                </Link>
              </h2>
              <p className="text-sm text-gray mt-2">{p.description}</p>
              <Link href={`/blog/${p.slug}`} className="btn btn-outline btn-sm mt-4 inline-block">
                Read more
              </Link>
            </article>
          ))}
        </div>

        <div className="mt-12 card p-6 bg-cream max-w-3xl">
          <h2 className="font-serif font-bold text-navy text-xl">
            Ready to source brass or copper products?
          </h2>
          <p className="text-gray text-sm mt-2">
            Send your product list and quantities — we respond with a written quotation covering
            price, MOQ, lead time and packaging.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/request-quote" className="btn btn-primary btn-sm">Request Wholesale Quote</Link>
            <Link href="/categories" className="btn btn-outline btn-sm">Browse Categories</Link>
          </div>
        </div>
      </div>
    </>
  );
}
