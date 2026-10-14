import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/public/Shared";

export const metadata: Metadata = {
  title: "Shipping & Export Information",
  description:
    "Shipping and export information for New Look Impex wholesale buyers — terms quoted per order, target countries, no blanket guarantees.",
};

export default function ShippingExportPage() {
  return (
    <>
      <PageHero
        title="Shipping & Export Information"
        subtitle="Shipping and export terms are quoted per order — here is how it works and what we do not guarantee."
      />
      <div className="container-x section">
        <div className="grid md:grid-cols-2 gap-10">
          <div className="space-y-5">
            <h2 className="font-serif font-bold text-navy text-2xl">Quoted per order</h2>
            <p className="text-gray">
              Freight cost, transit time, Incoterms and any duties depend on the items, quantities, destination
              and your preferred terms. We therefore quote shipping and export terms individually for each order
              rather than publishing blanket rates.
            </p>
            <p className="text-gray">
              Your written quote will state the agreed terms before production begins, so there are no surprises
              at dispatch.
            </p>

            <h2 className="font-serif font-bold text-navy text-2xl mt-8">What we do not guarantee</h2>
            <ul className="text-sm text-gray list-disc pl-5 space-y-2">
              <li>No fixed shipping rates or transit-time guarantees — all are quoted per order.</li>
              <li>No duty/tax coverage — import duties and taxes are the buyer's responsibility unless explicitly agreed in writing.</li>
              <li>No delivery commitments beyond the lead time confirmed in your quote.</li>
            </ul>
          </div>

          <div className="space-y-6">
            <div className="card">
              <h3 className="font-serif font-bold text-navy text-xl">Target countries</h3>
              <p className="text-sm text-gray mt-2">
                We accept wholesale and export enquiries from our listed target countries. The maintained list is
                shown on the request-quote form and in our business settings.
              </p>
              <Link href="/request-quote" className="btn btn-primary btn-sm mt-4">Check your country in the RFQ form</Link>
            </div>
            <div className="card">
              <h3 className="font-serif font-bold text-navy text-xl">Planning your order</h3>
              <ul className="text-sm text-gray mt-2 space-y-2 list-disc pl-5">
                <li>Add products to your RFQ cart with quantities and per-item notes.</li>
                <li>Include your delivery timeframe in the quote request.</li>
                <li>Festival-season orders: allow for quoted lead times in your planning.</li>
              </ul>
              <Link href="/wholesale" className="btn btn-outline btn-sm mt-4">How RFQ works</Link>
            </div>
            <div className="card">
              <h3 className="font-serif font-bold text-navy text-xl">Questions</h3>
              <p className="text-sm text-gray mt-2">
                Email <a className="link" href="mailto:newlookimpex@gmail.com">newlookimpex@gmail.com</a> or WhatsApp{" "}
                <a className="link" href="https://wa.me/918218251238" target="_blank" rel="noopener noreferrer">+91 8218251238</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
