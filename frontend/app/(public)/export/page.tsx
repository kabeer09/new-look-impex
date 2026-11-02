import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/public/Shared";
import { WholesaleEnquiryForm } from "@/app/(public)/wholesale/WholesaleEnquiryForm";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://newlookimpex.example";

export const metadata: Metadata = {
  title: "Export — Copper & Brass Handicrafts from India | New Look Impex",
  description:
    "Export enquiries welcome from New Look Impex, Moradabad, India. Written per-order quotations covering product, packaging, Incoterms and shipping. No fixed delivery claims.",
  alternates: { canonical: `${SITE}/export` },
  openGraph: {
    title: "Export — New Look Impex",
    description: "Export enquiries for copper and brass handicrafts, quoted per order with Incoterms.",
    type: "website",
    url: `${SITE}/export`,
  },
};

const POINTS = [
  ["Written quotations per order", "Every export quote confirms product, finish, quantity, packaging and shipping Incoterms in writing before anything is committed."],
  ["Documentation", "Commercial documentation for your order (such as product descriptions and invoice values) is provided. Any specific certifications or conformity documents required for your market are confirmed per order — we do not claim unverified certifications."],
  ["Freight & Incoterms", "Freight, Incoterms and any duties or taxes for your destination are quoted per order. Your importer handles customs clearance unless otherwise agreed in writing."],
];

const FAQS = [
  ["Which countries do you export to?", "We accept export enquiries from the markets we list on our regional pages (Australia, UAE, UK, USA, Canada and Europe). Enquiries from other destinations are reviewed individually."],
  ["Do you guarantee delivery times?", "No. Lead times and transit expectations are discussed and confirmed per order in writing. We do not publish or promise fixed delivery schedules."],
  ["Can you handle customs paperwork?", "We provide commercial documentation for your order. Import customs clearance, duties and taxes are normally handled by your importer unless we agree otherwise in writing."],
];

export default function ExportPage() {
  return (
    <>
      <PageHero
        title="Export from India"
        subtitle="International buyers: request a written export quotation for copper and brass handicrafts, with packaging and Incoterms confirmed per order."
      />
      <div className="container-x section">
        <div className="grid lg:grid-cols-3 gap-10 items-start">
          <div className="lg:col-span-2">
            <h2 className="font-serif font-bold text-navy text-2xl">How export enquiries work</h2>
            <div className="mt-5 space-y-5">
              {POINTS.map(([t, d]) => (
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
              <Link href="/shipping-export" className="btn btn-ghost">Shipping & export information</Link>
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
