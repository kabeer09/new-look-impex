import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/public/Shared";
import { BUSINESS_EMAIL } from "@/lib/api";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy policy for New Look Impex — what data we collect via enquiry and RFQ forms, how it is stored, and how to request access or deletion.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <PageHero title="Privacy Policy" subtitle="How we handle the data you share with us." />
      <div className="container-x section max-w-3xl">
        <div className="space-y-6 text-sm text-gray">
          <section>
            <h2 className="font-serif font-bold text-navy text-xl">Scope</h2>
            <p className="mt-2">
              This policy covers the New Look Impex public website and the data collected through its
              enquiry, request-for-quotation (RFQ) and customisation forms. It applies to wholesale
              enquiries only — we do not operate a consumer checkout on this site.
            </p>
          </section>
          <section>
            <h2 className="font-serif font-bold text-navy text-xl">What we collect</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><b>Enquiry form:</b> name, business email, country, product interest, message.</li>
              <li><b>RFQ form:</b> full name, business email, company, country, optional phone/target price/delivery timeframe, requirements, and your selected products, quantities and notes.</li>
              <li><b>Consent:</b> an explicit consent checkbox is required before an RFQ is submitted.</li>
              <li><b>Analytics events:</b> non-identifying events such as product views, RFQ additions, catalogue downloads and channel clicks, used only to understand catalogue interest.</li>
            </ul>
          </section>
          <section>
            <h2 className="font-serif font-bold text-navy text-xl">How we use it</h2>
            <p className="mt-2">
              Your details are stored in our database and used solely to respond to your enquiry or
              prepare a quotation. We do not sell or share your data with third parties for their own
              marketing. When email delivery is configured, we may send a copy of your RFQ or enquiry
              to our team; the system records whether the email was actually sent.
            </p>
          </section>
          <section>
            <h2 className="font-serif font-bold text-navy text-xl">Payments</h2>
            <p className="mt-2">
              This site does not process payments. Any payment terms are agreed directly per order and
              are outside this website.
            </p>
          </section>
          <section>
            <h2 className="font-serif font-bold text-navy text-xl">Consent and opt-out</h2>
            <p className="mt-2">
              RFQ submissions require explicit consent. You may withdraw consent or opt out of
              follow-up contact at any time by emailing{" "}
              <a className="link" href={`mailto:${BUSINESS_EMAIL}`}>{BUSINESS_EMAIL}</a>.
            </p>
          </section>
          <section>
            <h2 className="font-serif font-bold text-navy text-xl">Access, correction, deletion</h2>
            <p className="mt-2">
              To request a copy of, correct, or delete data we hold about you, contact us at{" "}
              <a className="link" href={`mailto:${BUSINESS_EMAIL}`}>{BUSINESS_EMAIL}</a> and we will
              respond within a reasonable timeframe.
            </p>
          </section>
          <section>
            <h2 className="font-serif font-bold text-navy text-xl">Changes</h2>
            <p className="mt-2">
              We may update this policy; the date of the latest change is shown below. Continue
              using the site to accept the updated policy.
            </p>
          </section>
          <p className="text-xs text-gray">Last updated: {new Date().toISOString().slice(0, 10)}</p>
          <p>
            <Link className="link" href="/contact">Contact us</Link> · <Link className="link" href="/terms">Terms of enquiry</Link>
          </p>
        </div>
      </div>
    </>
  );
}
