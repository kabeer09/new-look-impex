import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/public/Shared";
import { WhatsAppLink } from "@/components/public/WhatsAppLink";

export const metadata: Metadata = {
  title: "About Us — Brass & Copper Manufacturer, Moradabad",
  description:
    "New Look Impex is a Moradabad, Uttar Pradesh based manufacturer and exporter of brass and copper handicrafts — urlis, diyas, lanterns, metal home décor and gifting.",
  alternates: { canonical: "/about" },
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

            <h2 className="font-serif font-bold text-navy text-2xl mt-8">How the pieces are made</h2>
            <p className="text-gray">
              Moradabad metalcraft begins with sheet metal cut and shaped to each design, then
              hand-hammered, joined, filed and finished by artisans — the hand-hammering described
              across our catalogue. Finishes such as polished, hammered, antiqued, etched and matte
              are applied and checked piece by piece before packing. Our{" "}
              <Link className="link" href="/craft">craft page</Link> covers the Moradabad heritage
              behind the work, and{" "}
              <Link className="link" href="/customisation">custom manufacturing</Link> covers bespoke
              sizes, finishes, engraving and private label enquiries.
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
          <h2 className="font-serif font-bold text-navy text-2xl">Copper &amp; Brass Products Manufacturer in India</h2>
          <p className="text-gray leading-relaxed">
            Founded with a vision of promoting wellness through the benefits of copper and brass, New Look Impex (NLI Collections)
            is a manufacturer and exporter of traditional copper, brass, bronze, and silver-plated utensils and handicrafts.
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

      {/* Registrations & industry bodies — genuine logo assets supplied by the
          business. Captions name each body factually; no certification or
          accreditation claims are made in copy. */}
      <div className="container-x section !pt-0">
        <div className="card">
          <h2 className="font-serif font-bold text-navy text-2xl">Registrations &amp; industry bodies</h2>
          <p className="text-gray text-sm mt-2 max-w-3xl">
            Associated with the government and industry bodies that support handicraft exporters
            from Uttar Pradesh:
          </p>
          <ul className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6 items-center">
            {[
              { src: "/logo-gst.png", alt: "ODOP — One District One Product, Government of Uttar Pradesh" },
              { src: "/logo-epch.png", alt: "EPCH — Export Promotion Council for Handicrafts" },
              { src: "/logo-up-epb.jpg", alt: "Export Promotion Bureau, Government of Uttar Pradesh" },
              { src: "/logo-odop.jpg", alt: "Ministry of MSME, Government of India" },
            ].map((l) => (
              <li key={l.src} className="flex flex-col items-center text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={l.src}
                  alt={l.alt}
                  loading="lazy"
                  className="max-h-20 w-auto object-contain"
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}