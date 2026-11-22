import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/public/Shared";
import { BUSINESS_SALES_EMAIL } from "@/lib/api";

export const metadata: Metadata = {
  title: "Return & Refund Policy",
  description:
    "Return and refund terms for New Look Impex wholesale orders — made-to-order goods, how issues are reviewed per written order terms, and no invented guarantees.",
  alternates: { canonical: "/return-policy" },
};

export default function ReturnPolicyPage() {
  return (
    <>
      <PageHero title="Return & Refund Policy" subtitle="How returns and refunds are handled for New Look Impex wholesale orders." />
      <div className="container-x section max-w-3xl">
        <div className="space-y-6 text-sm text-gray">
          <section>
            <h2 className="font-serif font-bold text-navy text-xl">Scope</h2>
            <p className="mt-2">
              This policy applies to wholesale orders placed with New Look Impex through the enquiry
              and request-for-quotation (RFQ) process. This website is a B2B enquiry channel, not a
              consumer store, and does not process payments or consumer returns.
            </p>
          </section>
          <section>
            <h2 className="font-serif font-bold text-navy text-xl">Made-to-order goods</h2>
            <p className="mt-2">
              Many products are manufactured or finished to the specification, quantity and finish
              agreed in your written quotation. Because these are bulk, made-to-order goods, returns
              are not handled like consumer retail returns. Any arrangement for a particular order is
              set out in that order&apos;s written terms.
            </p>
          </section>
          <section>
            <h2 className="font-serif font-bold text-navy text-xl">Reporting a problem</h2>
            <p className="mt-2">
              If a delivered order appears damaged, short, or materially different from the agreed
              specification, notify us promptly with your order reference and supporting detail. We
              will review it against the terms agreed in your quotation and respond in writing.
            </p>
          </section>
          <section>
            <h2 className="font-serif font-bold text-navy text-xl">Refunds</h2>
            <p className="mt-2">
              Any refund, replacement or credit is decided under the terms of the specific order and
              confirmed in writing. New Look Impex does not publish a blanket refund promise or a
              fixed return window on this website — those terms depend on the order and are agreed
              before production.
            </p>
          </section>
          <section>
            <h2 className="font-serif font-bold text-navy text-xl">Contact</h2>
            <p className="mt-2">
              Raise an order issue with your reference number at{" "}
              <a className="link" href={`mailto:${BUSINESS_SALES_EMAIL}`}>{BUSINESS_SALES_EMAIL}</a>.
            </p>
          </section>
          <p className="text-xs text-gray">Last updated: {new Date().toISOString().slice(0, 10)}</p>
          <p className="flex flex-wrap gap-x-2 gap-y-1">
            <Link className="link" href="/shipping-policy">Shipping &amp; Export Policy</Link> ·{" "}
            <Link className="link" href="/payment-policy">Payment Policy</Link> ·{" "}
            <Link className="link" href="/terms">Terms of Enquiry</Link> ·{" "}
            <Link className="link" href="/privacy">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </>
  );
}
