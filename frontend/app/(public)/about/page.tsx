import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/public/Shared";
import { WhatsAppLink } from "@/components/public/WhatsAppLink";

export const metadata: Metadata = {
  title: "About New Look Impex",
  description:
    "New Look Impex is a Moradabad, Uttar Pradesh based wholesale supplier of brass and copper handicrafts — urlis, diyas, lanterns, metal home décor and gifting.",
};

export default function AboutPage() {
  return (
    <>
      <PageHero title="About New Look Impex" subtitle="Brass & copper handicrafts, wholesale from Moradabad." />
      <div className="container-x section">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-5">
            <h2 className="font-serif font-bold text-navy text-2xl">Who we are</h2>
            <p className="text-gray">
              New Look Impex is a wholesale supplier and exporter of brass and copper handicrafts based in
              Moradabad, Uttar Pradesh, India — a city with a long-standing tradition of metal craftsmanship.
            </p>
            <p className="text-gray">
              We operate on a wholesale / RFQ model: buyers add products to a request-for-quotation cart,
              specify quantities, and receive a written quote covering price, MOQ, lead time and packaging
              before any order is confirmed.
            </p>

            <h2 className="font-serif font-bold text-navy text-2xl mt-8">Our product ranges</h2>
            <ul className="grid sm:grid-cols-2 gap-3 text-sm">
              {[
                ["Brass collection", "/brass-collection", "Urlis, homeware and décor in brass."],
                ["Copper collection", "/copper-collection", "Vessels, kitchenware and statement pieces."],
                ["Metal home décor", "/metal-home-decor", "Centrepieces, bowls, trays and wall pieces."],
                ["Urlis", "/urlis", "The traditional Moradabad water vessel."],
                ["Diyas & lanterns", "/diyas-lanterns", "Festival lighting in brass and copper."],
                ["Gifting", "/gifting", "Corporate and festival gifting at wholesale volumes."],
              ].map(([label, href, desc]) => (
                <li key={href} className="card !p-4">
                  <Link href={href} className="font-semibold text-navy hover:underline underline-offset-2">{label}</Link>
                  <p className="text-gray text-xs mt-1">{desc}</p>
                </li>
              ))}
            </ul>

            <h2 className="font-serif font-bold text-navy text-2xl mt-8">Target markets</h2>
            <p className="text-gray">
              We accept wholesale and export enquiries from the target countries listed in our business
              settings — the current list is shown on our{" "}
              <Link className="link" href="/request-quote">request-a-quote</Link> form. Shipping and export terms
              are quoted per order; see{" "}
              <Link className="link" href="/shipping-export">shipping &amp; export information</Link>.
            </p>
          </div>

          <div className="space-y-6">
            <div className="card">
              <h3 className="font-serif font-bold text-navy text-xl">Contact</h3>
              <ul className="text-sm text-gray mt-3 space-y-2">
                <li>Moradabad, Uttar Pradesh, India</li>
                <li>
                  <a className="link" href="mailto:newlookimpex@gmail.com">newlookimpex@gmail.com</a>
                </li>
                <li>+91 8218251238</li>
                <li>+91 7500441239</li>
                <li>
                  <WhatsAppLink className="link">
                    WhatsApp us
                  </WhatsAppLink>
                </li>
              </ul>
              <Link href="/contact" className="btn btn-primary btn-sm mt-4">Enquiry form</Link>
            </div>
            <div className="card">
              <h3 className="font-serif font-bold text-navy text-xl">Catalogue</h3>
              <p className="text-sm text-gray mt-2">Download the full catalogue as a PDF.</p>
              <Link href="/catalogue" className="btn btn-outline btn-sm mt-3">Go to catalogue</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
