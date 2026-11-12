import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/public/Shared";

export const metadata: Metadata = {
  title: "Buyer Resources",
  description:
    "Buyer resources from New Look Impex — catalogue PDF, wholesale RFQ guide, shipping & export information, customisation and contact.",
  alternates: { canonical: "/buyer-resources" },
};

export default function BuyerResourcesPage() {
  return (
    <>
      <PageHero title="Buyer Resources" subtitle="Everything a wholesale buyer needs to place an informed order." />
      <div className="container-x section">
        <div className="grid md:grid-cols-2 gap-6">
          {[
            {
              title: "Product catalogue (PDF)",
              desc: "The full published catalogue, generated from live product data. Prices appear only where they are not on request.",
              href: "/catalogue",
              cta: "Open catalogue",
            },
            {
              title: "Wholesale & RFQ guide",
              desc: "How the request-for-quotation process works: cart → quantities → reference number → written quote.",
              href: "/wholesale",
              cta: "Read the guide",
            },
            {
              title: "Shipping & export information",
              desc: "How shipping and export terms are quoted per order, and the countries we accept enquiries from.",
              href: "/shipping-export",
              cta: "Shipping & export",
            },
            {
              title: "Customisation & OEM",
              desc: "Send dimensions, finishes or a design brief — custom work is quoted like any wholesale order.",
              href: "/customisation",
              cta: "Custom enquiry",
            },
            {
              title: "Request a quote (RFQ)",
              desc: "Submit a wholesale quote request with your product selections and quantities.",
              href: "/request-quote",
              cta: "Start RFQ",
            },
            {
              title: "Contact & enquiries",
              desc: "Email, phone and WhatsApp channels for buyer enquiries.",
              href: "/contact",
              cta: "Contact us",
            },
          ].map((r) => (
            <div key={r.href} className="card">
              <h2 className="font-serif font-bold text-navy text-xl">{r.title}</h2>
              <p className="text-sm text-gray mt-2">{r.desc}</p>
              <Link href={r.href} className="btn btn-outline btn-sm mt-4">{r.cta}</Link>
            </div>
          ))}
        </div>
        <div className="card mt-6 !bg-sand/50">
          <h2 className="font-serif font-bold text-navy text-xl">Frequently asked</h2>
          <dl className="mt-3 space-y-4 text-sm">
            <div>
              <dt className="font-semibold">Do you show prices?</dt>
              <dd className="text-gray mt-1">
                Where products are not price-on-request, prices are shown on product pages and in the catalogue.
                Otherwise, pricing is quoted per wholesale order — enquire for a quote.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">What is the MOQ?</dt>
              <dd className="text-gray mt-1">
                MOQ is listed per product where the catalogue provides it. For mixed or unlisted items, the MOQ is
                confirmed in your written quote.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Can I order samples?</dt>
              <dd className="text-gray mt-1">
                Sample and evaluation requests are handled as enquiries — send your requirements through the
                enquiry form or WhatsApp and we will respond with options and any applicable charges.
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </>
  );
}
