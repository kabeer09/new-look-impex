import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/public/Shared";
import { WhatsAppLink } from "@/components/public/WhatsAppLink";

export const metadata: Metadata = {
  title: "About New Look Impex",
  description:
    "New Look Impex is a Moradabad, Uttar Pradesh based manufacturer and exporter of brass and copper handicrafts — urlis, diyas, lanterns, metal home décor and gifting.",
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

      {/* Leading Manufacturer Section */}
      <div className="container-x section !pt-0">
        <div className="card space-y-4">
          <h2 className="font-serif font-bold text-navy text-2xl">Leading Copper &amp; Brass Products Manufacturer in India</h2>
          <p className="text-gray leading-relaxed">
            Founded with a vision of promoting wellness through the benefits of copper and brass, New Look Impex (NLI Collections)
            is a leading manufacturer and exporter of traditional copper, brass, bronze, and silver-plated utensils and handicrafts.
            Inspired by Indian heritage, we offer a rich range of handcrafted and spiritual products rooted in Indian craftsmanship.
          </p>
          <p className="text-gray leading-relaxed">
            <strong className="text-navy">Our Leadership — Mr. Suhel Ahmed, CEO</strong><br />
            Under the leadership of CEO Mr. Suhel Ahmed, New Look Impex has developed an international business perspective
            through extensive exposure to global trade markets. His international business journey includes multiple visits to
            major trade exhibitions and business fairs, including the Canton Fair in China, Hong Kong trade fairs and
            international exhibitions in Dubai. His experience of living and conducting business in China and the UAE has
            helped develop valuable international sourcing knowledge, supplier relationships and cross-border business
            understanding.
          </p>
          <div className="grid md:grid-cols-2 gap-6 mt-4">
            <div>
              <h3 className="font-serif font-bold text-navy text-lg mb-2">Our Product Collections — NLI Collections</h3>
              <ul className="text-sm text-gray space-y-1">
                <li>• Brass decorative products</li>
                <li>• Copper home décor</li>
                <li>• Handcrafted brass diyas</li>
                <li>• Decorative lanterns</li>
                <li>• Traditional brass urlis</li>
                <li>• Brass and copper candle holders</li>
                <li>• Metal decorative accessories</li>
                <li>• Indian festive decorations</li>
                <li>• Home décor collections</li>
                <li>• Corporate and promotional gifting products</li>
                <li>• Traditional Indian handicrafts</li>
              </ul>
            </div>
            <div>
              <h3 className="font-serif font-bold text-navy text-lg mb-2">Our Mission</h3>
              <p className="text-sm text-gray leading-relaxed">
                Our mission is to bring authentic Indian craftsmanship to international markets through quality products,
                innovative designs, dependable service and long-term business relationships. We aim to connect Indian
                artisans, manufacturers and international buyers through a professional and reliable export business.
              </p>
              <h3 className="font-serif font-bold text-navy text-lg mb-2 mt-4">Our Vision</h3>
              <p className="text-sm text-gray leading-relaxed">
                To establish New Look Impex and NLI Collections as recognised names in the global brass handicrafts,
                copper décor, Indian home décor and metal gifting industries.
              </p>
            </div>
          </div>
          <p className="text-center text-gray font-semibold mt-4">
            New Look Impex – Indian Craftsmanship. Global Connections. Timeless Collections.
          </p>
        </div>
      </div>
    </>
  );
}