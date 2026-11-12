import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/public/Shared";
import { BUSINESS_EMAIL } from "@/lib/api";

export const metadata: Metadata = {
  title: "Terms of Enquiry",
  description:
    "Terms of enquiry for New Look Impex wholesale website — RFQ process, quotations, no payment processing on site.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <PageHero title="Terms of Enquiry" subtitle="Terms for using the New Look Impex wholesale enquiry website." />
      <div className="container-x section max-w-3xl">
        <div className="space-y-6 text-sm text-gray">
          <section>
            <h2 className="font-serif font-bold text-navy text-xl">1. What this site is</h2>
            <p className="mt-2">
              New Look Impex operates a wholesale enquiry website for brass and copper handicrafts. The
              site is an enquiry and request-for-quotation (RFQ) channel — it is not a consumer
              storefront and does not process payments.
            </p>
          </section>
          <section>
            <h2 className="font-serif font-bold text-navy text-xl">2. RFQ process</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>You add products to an RFQ cart, set quantities, and submit a request with your business details.</li>
              <li>Each submission requires your explicit consent and receives a reference number.</li>
              <li>Quotations (price, MOQ, lead time, packaging, shipping terms) are provided per order in writing and are not binding on either side until an order is confirmed.</li>
            </ul>
          </section>
          <section>
            <h2 className="font-serif font-bold text-navy text-xl">3. Product information</h2>
            <p className="mt-2">
              Catalogue data is maintained by us and provided in good faith. Where a product is
              price-on-request, no price is shown until quoted. We do not guarantee catalogue
              availability — availability is confirmed in your quote.
            </p>
          </section>
          <section>
            <h2 className="font-serif font-bold text-navy text-xl">4. No payment processing</h2>
            <p className="mt-2">
              This website does not process payments. Any payment terms are agreed directly per
              order. Do not send card or bank details through the enquiry forms.
            </p>
          </section>
          <section>
            <h2 className="font-serif font-bold text-navy text-xl">5. Your data</h2>
            <p className="mt-2">
              Data collected through forms is stored in our database and used to respond to your
              enquiry. See our <Link className="link" href="/privacy">privacy policy</Link> for access,
              correction and deletion rights.
            </p>
          </section>
          <section>
            <h2 className="font-serif font-bold text-navy text-xl">6. Acceptable use</h2>
            <p className="mt-2">
              Do not use the site for unlawful purposes, automated scraping of catalogue data, or
              submitting duplicate RFQs in bulk. We may limit or refuse requests that abuse the
              enquiry system.
            </p>
          </section>
          <section>
            <h2 className="font-serif font-bold text-navy text-xl">7. Contact</h2>
            <p className="mt-2">
              Questions about these terms: <a className="link" href={`mailto:${BUSINESS_EMAIL}`}>{BUSINESS_EMAIL}</a>.
            </p>
          </section>
          <p className="text-xs text-gray">Last updated: {new Date().toISOString().slice(0, 10)}</p>
          <p>
            <Link className="link" href="/privacy">Privacy policy</Link> · <Link className="link" href="/contact">Contact</Link>
          </p>
        </div>
      </div>
    </>
  );
}
