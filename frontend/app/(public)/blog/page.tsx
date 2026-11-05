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
  {
    slug: "copper-bottles-wholesale-guide",
    title: "Copper Bottles Wholesale: A Guide for International Buyers",
    excerpt:
      "Everything you need to know before sourcing copper bottles wholesale — MOQ, packaging, export documentation, and trusted suppliers from Moradabad, India.",
    date: "2026-03-01",
  },
  {
    slug: "copper-kitchenware-sourcing-india",
    title: "How to Source Copper Kitchenware from India",
    excerpt:
      "A practical buyer's guide to sourcing copper cookware, pots, pans and serveware from Indian manufacturers — quality checks, certifications and shipping.",
    date: "2026-03-15",
  },
  {
    slug: "brass-handicrafts-moradabad-buyer-guide",
    title: "Brass Handicrafts from Moradabad: A Buyer Guide",
    excerpt:
      "Discover traditional Moradabad brass handicrafts — urlis, diyas, lanterns and décor. Learn how to evaluate quality, finish and craftsmanship before placing bulk orders.",
    date: "2026-04-01",
  },
  {
    slug: "brass-home-decor-retail-guide",
    title: "How to Select Brass Home Décor for Retail Stores",
    excerpt:
      "Curating brass home décor for your retail assortment — urlis, vases, lanterns and serveware. Style trends, price points and supplier evaluation tips.",
    date: "2026-04-15",
  },
  {
    slug: "brass-lanterns-wholesale-guide",
    title: "Brass Lanterns: Wholesale Sourcing Guide",
    excerpt:
      "Sourcing brass lanterns and festive lighting from India — styles, finishes, MOQ, packaging and export considerations for wholesale buyers.",
    date: "2026-05-01",
  },
  {
    slug: "private-label-copper-brass-products",
    title: "Private Label Copper and Brass Products",
    excerpt:
      "OEM and private label manufacturing for copper and brass products — custom finishes, engravings, branding and packaging for your retail brand.",
    date: "2026-05-15",
  },
  {
    slug: "questions-ask-indian-handicrafts-exporter",
    title: "Questions to Ask an Indian Handicrafts Exporter",
    excerpt:
      "Before placing your first bulk order with an Indian handicrafts exporter — MOQ, samples, certifications, packaging, lead time and payment terms checklist.",
    date: "2026-06-01",
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