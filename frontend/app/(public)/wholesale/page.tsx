import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/public/Shared";
import { WholesaleEnquiryForm } from "./WholesaleEnquiryForm";

export const metadata: Metadata = {
  title: "Wholesale & Bulk Sourcing",
  description:
    "How wholesale ordering works at New Look Impex: browse the catalogue, request pricing, receive a written quote with MOQ and lead time. Export enquiries welcome.",
  alternates: { canonical: "https://www.newlookimpex.store/wholesale" },
  openGraph: {
    title: "Wholesale & Bulk Sourcing — New Look Impex",
    description: "Bulk sourcing of handcrafted brass and copper décor, quoted per order. Export enquiries welcome.",
    type: "website",
    url: "https://www.newlookimpex.store/wholesale",
  },
};

const STEPS = [
  ["Browse & shortlist", "Search the catalogue by product, category, material or finish, and add pieces to your enquiry list with quantities and notes."],
  ["Request pricing", "Submit the request-quote form with your business details, destination country and any target timelines."],
  ["Get a reference number", "Your request is stored immediately and you receive a reference number for follow-up."],
  ["Receive a written quote", "We confirm pricing, MOQ, lead time and packaging in writing. Export and freight terms are quoted per order."],
];

const SPECS = [
  ["Specifications", "Material, finish, dimensions and weight are listed on each product page where verified. Anything unconfirmed is quoted on enquiry."],
  ["MOQ & custom orders", "Where a product has a confirmed MOQ it is shown on the page; otherwise quantities are agreed per order. Custom sizes and finishes are welcome as enquiries."],
  ["Samples & export", "Samples and export arrangements can be discussed as part of your enquiry — availability and terms are confirmed per order, never assumed."],
];

const FAQS = [
  ["How is wholesale pricing calculated?", "Pricing is quoted per order based on the products, quantities, finishes and destination you request. Most catalogue pieces are price-on-request for this reason."],
  ["Is there a minimum order quantity?", "Some products list a confirmed MOQ on their page. Where none is listed — or for mixed orders — the MOQ is agreed when we quote. Use the catalogue's “MOQ listed only” filter to see pieces with confirmed MOQs."],
  ["Can I request custom sizes or finishes?", "Yes — customisation is handled as an enquiry. Send dimensions, finishes or reference material via the request-quote form and we will confirm what is possible in writing."],
  ["Do you ship internationally?", "We accept export enquiries from our listed target countries. Freight, Incoterms and duties are quoted per order — see our shipping & export information page."],
  ["How long does a quote take?", "Every request receives a reference number immediately on submission. Quotation timelines depend on the complexity of the order and are communicated when we respond — we do not promise fixed turnaround times."],
];

export default function WholesalePage() {
  return (
    <>
      <PageHero
        title="Wholesale & Bulk Sourcing"
        subtitle="Building Your Next Collection? Tell us what you need — pricing, MOQ and lead time confirmed in writing, per order."
      />
      <div className="container-x section">
        <div className="grid lg:grid-cols-3 gap-10 items-start">
          <div className="lg:col-span-2">
            <h2 className="font-serif font-bold text-navy text-2xl">How bulk sourcing works</h2>
            <ol className="mt-5 space-y-5">
              {STEPS.map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="w-8 h-8 bg-navy text-gold-light font-bold flex items-center justify-center shrink-0 text-sm">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold">{t}</p>
                    <p className="text-sm text-gray mt-0.5">{d}</p>
                  </div>
                </li>
              ))}
            </ol>

            <h2 className="font-serif font-bold text-navy text-2xl mt-12">What to expect</h2>
            <div className="mt-5 grid sm:grid-cols-3 gap-4">
              {SPECS.map(([t, d]) => (
                <div key={t} className="card-flat bg-white">
                  <p className="font-semibold text-navy">{t}</p>
                  <p className="text-sm text-gray mt-1.5">{d}</p>
                </div>
              ))}
            </div>

            <h2 className="font-serif font-bold text-navy text-2xl mt-12">Frequently asked questions</h2>
            <div className="mt-5 space-y-3">
              {FAQS.map(([q, a]) => (
                <details key={q} className="card-flat bg-white group">
                  <summary className="font-semibold text-navy cursor-pointer">{q}</summary>
                  <p className="text-sm text-gray mt-2">{a}</p>
                </details>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <WholesaleEnquiryForm />
            <div className="card-flat bg-white">
              <h3 className="font-serif font-bold text-navy text-xl">Prefer the full RFQ flow?</h3>
              <p className="text-sm text-gray mt-2">
                Add products first, then submit everything together with quantities and per-item notes.
              </p>
              <div className="flex gap-2 mt-4 flex-wrap">
                <Link href="/products" className="btn btn-outline btn-sm">Browse catalogue</Link>
                <Link href="/request-quote" className="btn btn-primary btn-sm">Start an RFQ</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
