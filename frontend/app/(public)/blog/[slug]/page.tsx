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
  "copper-bottles-wholesale-guide": {
    title: "Copper Bottles Wholesale: A Guide for International Buyers",
    description:
      "Everything you need to know before sourcing copper bottles wholesale — MOQ, packaging, export documentation, and trusted suppliers from Moradabad, India.",
    content: [
      "Copper bottles are one of the fastest-growing wholesale categories for homeware, gift and wellness retailers. Before placing your first bulk order, understand what to look for in a manufacturer and how the export process works.",
      "Start by identifying your target product range: plain copper bottles, hammered finish, diamond-cut, matte, or gift-boxed sets. Request SKU-level details including material grade, dimensions, weight, capacity, MOQ and packaging.",
      "Always request samples before committing to bulk orders. Confirm lead times, export packaging standards, and whether customisation (size, finish, private label) is available. Get everything in writing — price, MOQ, lead time, and shipping terms.",
      "New Look Impex is a Moradabad-based manufacturer and exporter of handcrafted copper bottles and drinkware. We supply wholesale buyers internationally with written quotations per order. Contact us to discuss your requirements.",
    ],
  },
  "copper-kitchenware-sourcing-india": {
    title: "How to Source Copper Kitchenware from India",
    description:
      "A practical buyer's guide to sourcing copper cookware, pots, pans and serveware from Indian manufacturers — quality checks, certifications and shipping.",
    content: [
      "Copper kitchenware — cookware, pots, pans, serveware and tabletop pieces — combines traditional craftsmanship with modern kitchen needs. Indian manufacturers, particularly from Moradabad, specialise in hand-hammered copper kitchenware for wholesale buyers.",
      "When evaluating suppliers, check material quality, finish consistency, dimensions, and weight specifications. Ask about packaging standards for export and whether products are suitable for your target market.",
      "Confirm lead times, production capacity, and whether customisation (size, finish, engraving, private label) is available. Get written quotations covering price, MOQ, lead time, packaging and shipping terms.",
      "New Look Impex manufactures and exports copper kitchenware from Moradabad, India. We provide written per-order quotations and support export documentation for international buyers.",
    ],
  },
  "brass-handicrafts-moradabad-buyer-guide": {
    title: "Brass Handicrafts from Moradabad: A Buyer Guide",
    description:
      "Discover traditional Moradabad brass handicrafts — urlis, diyas, lanterns and décor. Learn how to evaluate quality, finish and craftsmanship before placing bulk orders.",
    content: [
      "Moradabad, Uttar Pradesh, is internationally recognised as India's brass city. The region's artisans have been crafting brass handicrafts for generations — urlis, diyas, lanterns, vases, and decorative home accents.",
      "When sourcing brass handicrafts, evaluate the finish quality, weight, engraving detail, and consistency across pieces. Request samples to assess craftsmanship before placing bulk orders.",
      "Confirm MOQ, lead time, packaging standards for export, and whether customisation (size, finish, engraving, private label) is available. Get written quotations for all terms.",
      "New Look Impex manufactures brass handicrafts from Moradabad and exports globally. We support retailers, importers, distributors and corporate gifting programmes with written quotations and export documentation.",
    ],
  },
  "brass-home-decor-retail-guide": {
    title: "How to Select Brass Home Décor for Retail Stores",
    description:
      "Curating brass home décor for your retail assortment — urlis, vases, lanterns and serveware. Style trends, price points and supplier evaluation tips.",
    content: [
      "Brass home décor — urlis, diyas, lanterns, vases, planters and serveware — suits both traditional and contemporary retail assortments. Golden tones, hand-hammered textures and festive appeal make brass a strong category for gift and homeware stores.",
      "When curating your assortment, consider your target customer, price points, and display requirements. Request product images, dimensions, and weight specifications for each SKU.",
      "Evaluate suppliers on MOQ, lead time, packaging quality, and customisation options. Gift-box presentation and custom branding can add value for retail customers.",
      "New Look Impex supplies brass home décor to retailers worldwide. We offer factory-direct wholesale pricing, written quotations, and support for custom finishes and private labelling.",
    ],
  },
  "brass-lanterns-wholesale-guide": {
    title: "Brass Lanterns: Wholesale Sourcing Guide",
    description:
      "Sourcing brass lanterns and festive lighting from India — styles, finishes, MOQ, packaging and export considerations for wholesale buyers.",
    content: [
      "Brass lanterns are popular for festive seasons, outdoor entertaining, and traditional home décor. From Diwali to Christmas, they serve gifting, hospitality, and retail markets worldwide.",
      "When sourcing brass lanterns, consider style (traditional, contemporary, minimalist), size range, finish (hammered, polished, matte, antique), and whether they are for indoor or outdoor use.",
      "Confirm MOQ, lead time, export packaging, and whether electrical components (if any) meet your target market's safety standards. Get written quotations covering all terms.",
      "New Look Impex manufactures brass lanterns and festive lighting from Moradabad, India. We supply wholesale buyers globally with written quotations and export documentation support.",
    ],
  },
  "private-label-copper-brass-products": {
    title: "Private Label Copper and Brass Products",
    description:
      "OEM and private label manufacturing for copper and brass products — custom finishes, engravings, branding and packaging for your retail brand.",
    content: [
      "Private label manufacturing allows retailers to sell copper and brass products under their own brand name. From custom finishes and engravings to branded packaging, OEM solutions help differentiate your assortment.",
      "When exploring private label, define your requirements clearly: product range, custom finishes, engraving or branding details, packaging design, MOQ, and lead time. Request samples before production.",
      "New Look Impex offers OEM and private label manufacturing for copper and brass products. We work with retailers, importers and distributors to create branded product lines with custom finishes, engravings and packaging.",
      "Contact us to discuss your private label requirements. We provide written quotations covering tooling, sampling, MOQ, lead time and shipping terms.",
    ],
  },
  "questions-ask-indian-handicrafts-exporter": {
    title: "Questions to Ask an Indian Handicrafts Exporter",
    description:
      "Before placing your first bulk order with an Indian handicrafts exporter — MOQ, samples, certifications, packaging, lead time and payment terms checklist.",
    content: [
      "Sourcing handicrafts from India requires careful supplier evaluation. Before placing your first bulk order, ask these key questions to ensure a reliable partnership.",
      "1. What is your MOQ for each product, and does it vary by finish or customisation?",
      "2. Can you provide samples before bulk production, and what are the sample costs and lead times?",
      "3. What are your lead times for production and shipping to my destination?",
      "4. What packaging standards do you use for export, and is gift-box presentation available?",
      "5. Do you provide written quotations covering price, MOQ, lead time, packaging and shipping terms?",
      "6. Can you support customisation — size, finish, engraving, or private label?",
      "7. What documentation do you provide for export (commercial invoice, packing list, certificate of origin)?",
      "New Look Impex welcomes these questions from every buyer. We provide written quotations, transparent terms, and support throughout the sourcing process.",
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
    alternates: { canonical: `https://www.newlookimpex.store/blog/${params.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      url: `https://www.newlookimpex.store/blog/${params.slug}`,
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