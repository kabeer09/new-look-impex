import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/public/Shared";
import { BUSINESS_SALES_EMAIL } from "@/lib/api";

export const metadata: Metadata = {
  title: "Shipping & Export Policy",
  description:
    "Shipping and export terms for New Look Impex wholesale orders — how delivery, packaging and documentation are confirmed in writing per order, with no invented timelines.",
  alternates: { canonical: "/shipping-policy" },
};

export default function ShippingPolicyPage() {
  return (
    <>
      <PageHero title="Shipping & Export Policy" subtitle="How delivery and export terms are handled for New Look Impex wholesale orders." />
      <div className="container-x section max-w-3xl">
        <div className="space-y-6 text-sm text-gray">
          <section>
            <h2 className="font-serif font-bold text-navy text-xl">Scope</h2>
            <p className="mt-2">
              This policy explains how New Look Impex handles shipping and export for wholesale
              enquiries and confirmed orders. It applies to bulk orders only — this website is an
              enquiry channel and does not operate a consumer checkout.
            </p>
          </section>
          <section>
            <h2 className="font-serif font-bold text-navy text-xl">How shipping is arranged</h2>
            <p className="mt-2">
              We manufacture in Moradabad, Uttar Pradesh, India and export worldwide. The shipping
              method, packaging and delivery terms for each order are agreed with you and recorded in
              your written quotation before production begins. We do not advertise a fixed delivery
              time because it depends on the product, quantity, finish and destination.
            </p>
          </section>
          <section>
            <h2 className="font-serif font-bold text-navy text-xl">What your quotation confirms</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Destination and the agreed shipping terms for that order.</li>
              <li>Packaging and any custom or gift packaging you have requested.</li>
              <li>Export documentation handled for the shipment.</li>
              <li>The delivery timeframe agreed for that specific order — never a generic promise.</li>
            </ul>
          </section>
          <section>
            <h2 className="font-serif font-bold text-navy text-xl">Delivery and inspection</h2>
            <p className="mt-2">
              On arrival, please inspect the shipment and report any transit damage or shortage
              promptly so it can be reviewed against the order terms. Any claim is handled under the
              terms agreed in your written quotation, not by a blanket policy published here.
            </p>
          </section>
          <section>
            <h2 className="font-serif font-bold text-navy text-xl">Questions</h2>
            <p className="mt-2">
              For shipping terms on a specific order, contact us at{" "}
              <a className="link" href={`mailto:${BUSINESS_SALES_EMAIL}`}>{BUSINESS_SALES_EMAIL}</a>{" "}
              or request a written quotation with your destination and quantities.
            </p>
          </section>
          <p className="text-xs text-gray">Last updated: {new Date().toISOString().slice(0, 10)}</p>
          <p className="flex flex-wrap gap-x-2 gap-y-1">
            <Link className="link" href="/return-policy">Return &amp; Refund Policy</Link> ·{" "}
            <Link className="link" href="/payment-policy">Payment Policy</Link> ·{" "}
            <Link className="link" href="/terms">Terms of Enquiry</Link> ·{" "}
            <Link className="link" href="/privacy">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </>
  );
}
