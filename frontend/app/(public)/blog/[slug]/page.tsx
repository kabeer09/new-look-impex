import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/public/Shared";

const POSTS: Record<string, { title: string; description: string; content: string[] }> = {
  "sourcing-brass-decor-moradabad": {
    title: "How to Source Brass & Copper Décor from Moradabad: A Buyer's Guide",
    description:
      "Moradabad is India's brass and copper handicraft capital. Learn how to find reliable manufacturers, evaluate quality, and place wholesale orders.",
    content: [
      "Moradabad, Uttar Pradesh, is known as the brass city of India — a centre for handcrafted metalware with centuries of craft tradition. Buyers worldwide source urlis, diyas, lanterns, bottles, kitchenware and home décor from Moradabad manufacturers.",
      "When sourcing, start by identifying the product range you need: copper drinkware, brass kitchenware, decorative urlis, or gifting sets. Request the supplier's catalogue and ask for SKU-level details including material, finish, dimensions, weight, MOQ and packaging.",
      "Always request samples before committing to bulk orders. Confirm lead times, packaging standards for export, and whether customisation (size, finish, private label) is available. Get everything in writing — price, MOQ, lead time, and shipping terms.",
      "New Look Impex is a Moradabad-based manufacturer and exporter of handcrafted brass and copper handicrafts. We supply wholesale buyers across the USA, UK, UAE, Australia, Canada and Europe with written quotations per order. Contact us to discuss your requirements.",
    ],
  },
  "copper-vs-brass-homeware": {
    title: "Copper vs Brass Homeware: Which Is Right for Your Store?",
    description:
      "Understanding the differences between copper and brass — durability, finish, maintenance, and customer appeal — to make better sourcing decisions.",
    content: [
      "Copper and brass are both popular metals for home décor, but they serve different markets. Copper has a warm reddish tone and is often associated with wellness and hydration (copper bottles). Brass has a golden hue and suits traditional and festive décor.",
      "Copper drinkware — bottles, jugs, tumblers — appeals to health-conscious and design-led customers. Brass items — diyas, urlis, lanterns — suit festive, traditional and gifting markets.",
      "Maintenance differs: copper develops a patina over time (some buyers prefer this), while brass can be polished to maintain its golden shine. Both are durable and long-lasting.",
      "For wholesale buyers, the choice depends on your customer base and price point. Many retailers carry both. New Look Impex manufactures both copper and brass collections — request our catalogue to compare.",
    ],
  },
  "wholesale-ordering-checklist": {
    title: "Wholesale Sourcing Checklist: Questions to Ask Your Handicraft Supplier",
    description:
      "Before placing a bulk order, confirm MOQ, samples, specifications, packaging, lead time, and written quotations. A practical checklist for B2B buyers.",
    content: [
      "Before placing a wholesale order, confirm these essentials with your supplier:",
      "1. Minimum Order Quantity (MOQ) — varies by product and finish.",
      "2. Samples — availability, cost, and lead time for samples before bulk production.",
      "3. Specifications — material, dimensions, weight, finish, and any certifications.",
      "4. Packaging — export packaging standards, gift-box options, and labelling.",
      "5. Lead time — production time from order confirmation to shipment.",
      "6. Written quotation — price, MOQ, lead time, packaging, and shipping terms in writing.",
      "7. Customisation — whether sizes, finishes, or private labelling are available.",
      "New Look Impex provides written per-order quotations covering all of the above. Contact us to discuss your requirements.",
    ],
  },
  "seasonal-gifting-programme": {
    title: "Planning a Seasonal Gifting Programme with Indian Handicrafts",
    description:
      "What to confirm early when sourcing décor for festive or corporate gifting: quantities, finishes, packaging, and timelines.",
    content: [
      "Seasonal gifting — Diwali, Christmas, Eid, corporate events — requires early planning. Start by identifying your product range: diyas, lanterns, urlis, or gift-boxed sets.",
      "Confirm quantities and timelines with your supplier well in advance. Gift-box presentation, custom branding, and special packaging should be discussed during the enquiry stage.",
      "Request a written quotation covering price, MOQ, lead time, packaging, and shipping. Plan for quality inspection before shipment and allow buffer time for customs and transit.",
      "New Look Impex supports corporate and festive gifting programmes with gift-boxed copper and brass sets. Contact us early to plan your next gifting season.",
    ],
  },
};

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = POSTS[params.slug];
  if (!post) {
    return { title: "Blog Post | New Look Impex" };
  }
  return {
    title: `${post.title} | New Look Impex`,
    description: post.description,
    alternates: { canonical: `https://newlookimpex.store/blog/${params.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      url: `https://newlookimpex.store/blog/${params.slug}`,
    },
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = POSTS[params.slug];
  if (!post) {
    return (
      <div className="container-x section">
        <h1 className="font-serif font-bold text-navy text-3xl">Post not found</h1>
        <Link href="/blog" className="btn btn-outline mt-4">
          Back to blog
        </Link>
      </div>
    );
  }
  return (
    <>
      <PageHero title={post.title} subtitle={post.description} />
      <article className="container-x section max-w-3xl">
        {post.content.map((para, i) => (
          <p key={i} className="text-gray leading-relaxed mb-4">
            {para}
          </p>
        ))}
        <div className="mt-8">
          <Link href="/blog" className="btn btn-outline btn-sm">
            ← Back to Buying Guides
          </Link>
        </div>
      </article>
    </>
  );
}