import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/public/Shared";
import { WholesaleEnquiryForm } from "@/app/(public)/wholesale/WholesaleEnquiryForm";

const SITE = "https://www.newlookimpex.store";

export const metadata: Metadata = {
  title: "Custom Orders — Bespoke Copper & Brass",
  description:
    "Request custom copper and brass pieces from New Look Impex, Moradabad. Share your brief, dimensions and finishes — feasibility and pricing confirmed per order in writing.",
  alternates: { canonical: `${SITE}/custom-orders` },
  openGraph: {
    title: "Custom Orders — New Look Impex",
    description: "Custom copper and brass pieces, quoted per order against your brief.",
    type: "website",
    url: `${SITE}/custom-orders`,
  },
};

const BRIEF = [
  ["Reference images or sketches", "Share photos, sketches or a competitor reference so we understand the look you are targeting."],
  ["Dimensions & finish", "Give dimensions, capacity (where relevant) and the finish you want — hammered, matte, antique, engraved or polished."],
  ["Quantity & timelines", "Tell us your expected quantity and any event or seasonal deadline so feasibility can be assessed."],
];

const FAQS = [
  ["Can you make custom sizes or finishes?", "Customisation is assessed per brief. Send your dimensions, finish and reference material and we will confirm what is possible in writing — we do not promise customisation before reviewing the brief."],
  ["Is there a minimum quantity for custom work?", "Custom orders are quoted per brief. Any minimum quantity is confirmed when we reply, based on the specific product and finish."],
  ["How long does a custom order take?", "Timelines depend on the complexity and quantity and are confirmed per order in writing. We do not publish fixed lead times for custom work."],
];

export default function CustomOrdersPage() {
  return (
    <>
      <PageHero
        title="Custom Orders"
        subtitle="Have a specific piece in mind? Share your brief — we assess feasibility and reply with pricing and timelines per order."
      />
      <div className="container-x section">
        <div className="grid lg:grid-cols-3 gap-10 items-start">
          <div className="lg:col-span-2">
            <h2 className="font-serif font-bold text-navy text-2xl">What to include in your brief</h2>
            <div className="mt-5 space-y-5">
              {BRIEF.map(([t, d]) => (
                <div key={t} className="card-flat bg-white">
                  <p className="font-semibold text-navy">{t}</p>
                  <p className="text-sm text-gray mt-1.5">{d}</p>
                </div>
              ))}
            </div>

            <h2 className="font-serif font-bold text-navy text-2xl mt-12">Buyer questions</h2>
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
              <Link href="/craft" className="btn btn-ghost">About the craft</Link>
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
