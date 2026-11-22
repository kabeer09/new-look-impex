import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/public/Shared";
import { BUSINESS_SALES_EMAIL } from "@/lib/api";

export const metadata: Metadata = {
  title: "Payment Policy",
  description:
    "Payment terms for New Look Impex wholesale orders — this website does not process payments; terms are agreed directly per order and confirmed in writing.",
  alternates: { canonical: "/payment-policy" },
};

export default function PaymentPolicyPage() {
  return (
    <>
      <PageHero title="Payment Policy" subtitle="How payment terms are handled for New Look Impex wholesale orders." />
      <div className="container-x section max-w-3xl">
        <div className="space-y-6 text-sm text-gray">
          <section>
            <h2 className="font-serif font-bold text-navy text-xl">No payment on this website</h2>
            <p className="mt-2">
              New Look Impex operates a wholesale enquiry website. This site does not take orders
              online, does not have a checkout, and does not process payments. Do not submit card
              numbers, bank details or other payment information through the enquiry or RFQ forms.
            </p>
          </section>
          <section>
            <h2 className="font-serif font-bold text-navy text-xl">Terms agreed per order</h2>
            <p className="mt-2">
              Payment terms are agreed directly between you and New Look Impex for each confirmed
              order and are recorded in the written documentation for that order. We do not publish
              a single payment schedule, currency conversion or set of methods here, because terms
              depend on the order and destination.
            </p>
          </section>
          <section>
            <h2 className="font-serif font-bold text-navy text-xl">Quotations and currency</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Quotations are provided in writing with the terms for that specific order.</li>
              <li>Where a preferred currency is noted on an enquiry, it is a preference only — no figure is converted until terms are confirmed.</li>
              <li>Prices are never invented on this website; price-on-request products are quoted individually.</li>
            </ul>
          </section>
          <section>
            <h2 className="font-serif font-bold text-navy text-xl">Security of your details</h2>
            <p className="mt-2">
              Because payments are handled outside this website, no payment credentials are stored
              by the enquiry system. For how enquiry data is handled, see our{" "}
              <Link className="link" href="/privacy">privacy policy</Link>.
            </p>
          </section>
          <section>
            <h2 className="font-serif font-bold text-navy text-xl">Contact</h2>
            <p className="mt-2">
              For payment terms on a specific order, contact{" "}
              <a className="link" href={`mailto:${BUSINESS_SALES_EMAIL}`}>{BUSINESS_SALES_EMAIL}</a>.
            </p>
          </section>
          <p className="text-xs text-gray">Last updated: {new Date().toISOString().slice(0, 10)}</p>
          <p className="flex flex-wrap gap-x-2 gap-y-1">
            <Link className="link" href="/shipping-policy">Shipping &amp; Export Policy</Link> ·{" "}
            <Link className="link" href="/return-policy">Return &amp; Refund Policy</Link> ·{" "}
            <Link className="link" href="/terms">Terms of Enquiry</Link> ·{" "}
            <Link className="link" href="/privacy">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </>
  );
}
