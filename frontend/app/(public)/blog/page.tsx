import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/public/Shared";

export const metadata: Metadata = {
  title: "Buying Guides & Blog | New Look Impex",
  description:
    "Practical buying guides for wholesale brass and copper handicrafts from Moradabad — sourcing tips, styling advice, and export insights.",
  alternates: { canonical: "https://newlookimpex.store/blog" },
};

const POSTS = [
  {
    slug: "sourcing-brass-decor-moradabad",
    title: "How to Source Brass & Copper Décor from Moradabad: A Buyer's Guide",
    excerpt:
      "Moradabad is India's brass and copper handicraft capital. Learn how to find reliable manufacturers, evaluate quality, and place wholesale orders with confidence.",
    date: "2026-01-15",
  },
  {
    slug: "copper-vs-brass-homeware",
    title: "Copper vs Brass Homeware: Which Is Right for Your Store?",
    excerpt:
      "Understanding the differences between copper and brass — durability, finish, maintenance, and customer appeal — to make better sourcing decisions.",
    date: "2026-01-20",
  },
  {
    slug: "wholesale-ordering-checklist",
    title: "Wholesale Sourcing Checklist: Questions to Ask Your Handicraft Supplier",
    excerpt:
      "Before placing a bulk order, confirm MOQ, samples, specifications, packaging, lead time, and written quotations. A practical checklist for B2B buyers.",
    date: "2026-01-25",
  },
  {
    slug: "seasonal-gifting-programme",
    title: "Planning a Seasonal Gifting Programme with Indian Handicrafts",
    excerpt:
      "What to confirm early when sourcing décor for festive or corporate gifting: quantities, finishes, packaging, and timelines.",
    date: "2026-02-01",
  },
];

export default function BlogPage() {
  return (
    <>
      <PageHero title="Buying Guides" subtitle="Practical notes for wholesale décor buyers" />
      <div className="container-x section">
        <div className="grid md:grid-cols-2 gap-6">
          {POSTS.map((p) => (
            <article key={p.slug} className="card">
              <p className="text-xs text-gray">{p.date}</p>
              <h2 className="font-serif font-bold text-navy text-xl mt-1">
                <Link href={`/blog/${p.slug}`} className="hover:text-clay">
                  {p.title}
                </Link>
              </h2>
              <p className="text-sm text-gray mt-2">{p.excerpt}</p>
              <Link href={`/blog/${p.slug}`} className="btn btn-outline btn-sm mt-4 inline-block">
                Read more
              </Link>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}