import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/public/Shared";
import { WholesaleEnquiryForm } from "@/app/(public)/wholesale/WholesaleEnquiryForm";

const SITE = "https://www.newlookimpex.store";

export const metadata: Metadata = {
  title: "Bulk Orders — Copper & Brass Handicrafts",
  description:
    "How bulk and wholesale orders work with New Look Impex, Moradabad. Browse the catalogue, request pricing, receive a written quote with MOQ, lead time and packaging.",
  alternates: { canonical: `${SITE}/bulk-orders` },
  openGraph: {
    title: "Bulk Orders — New Look Impex",
    description: "Bulk sourcing of handcrafted copper and brass products, quoted per order.",
    type: "website",
    url: `${SITE}/bulk-orders`,
  },
};

const STEPS = [
  ["Shortlist products", "Browse the catalogue and note the pieces, finishes and rough quantities you need."],
  ["Send your requirement", "Submit the enquiry form with products, quantities, destination country and any timelines."],
  ["Receive a written quote", "We reply with pricing, confirmed MOQ, lead time and packaging per order."],
  ["Confirm & produce", "Once you approve the quote in writing, production and dispatch are scheduled for your order."],
];

const FAQS = [
  ["Is there a minimum order quantity?", "Some products list a confirmed MOQ on their page. For mixed or large orders the MOQ is agreed when we quote — we do not publish blanket minimums."],
  ["Can I mix products in one order?", "Yes — most buyers mix categories. Tell us the products and quantities and we will quote the order together."],
  ["How is bulk pricing set?", "Pricing depends on the products, quantities, finishes and destination. Every quote is prepared per order in writing."],
];

export default function BulkOrdersPage() {
  return (
    <>
      <PageHero
        title="Bulk Orders"
        subtitle="Sourcing at volume? Share your product list and quantities — we reply with a written quote covering price, MOQ, lead time and packaging."
      />
      <div className="container-x section">
        <div className="grid lg:grid-cols-3 gap-10 items-start">
          <div className="lg:col-span-2">
            <h2 className="font-serif font-bold text-navy text-2xl">How bulk ordering works</h2>
            <ol className="mt-5 space-y-5">
              {STEPS.map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="w-8 h-8 bg-navy text-gold-light font-bold flex items-center justify-center shrink-0 text-sm">{i + 1}</span>
                  <div>
                    <p className="font-semibold">{t}</p>
                    <p className="text-sm text-gray mt-0.5">{d}</p>
                  </div>
                </li>
              ))}
            </ol>

            <h2 className="font-serif font-bold text-navy text-2xl mt-12">Frequently asked questions</h2>
            <div className="mt-5 space-y-3">
              {FAQS.map(([q, a]) => (
                <details key={q} className="card-flat bg-white group">
                  <summary className="font-semibold text-navy cursor-pointer">{q}</summary>
                  <p className="text-sm text-gray mt-2">{a}</p>
                </details>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products" className="btn btn-outline">Browse the catalogue</Link>
              <Link href="/wholesale" className="btn btn-ghost">How wholesale sourcing works</Link>
            </div>
          </div>

          <div className="space-y-6">
            <WholesaleEnquiryForm />
          </div>
        </div>
      </div>
    </>
  );
}
