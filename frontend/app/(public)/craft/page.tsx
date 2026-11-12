import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/public/Shared";
import { whatsappLink } from "@/lib/api";

export const metadata: Metadata = {
  title: "Our Craft — Moradabad Metalcraft",
  description:
    "How New Look Impex designs and sources handcrafted brass and copper décor in Moradabad — materials, finishes and customisation enquiries for wholesale buyers.",
  alternates: { canonical: "https://www.newlookimpex.store/craft" },
  openGraph: {
    title: "Our Craft — New Look Impex",
    description: "Moradabad metalcraft heritage, materials and finishes behind our wholesale décor catalogue.",
    type: "website",
    url: "https://www.newlookimpex.store/craft",
  },
};

export default function CraftPage() {
  return (
    <>
      <PageHero
        title="Our Craft"
        subtitle="Handcrafted metal décor from Moradabad, Uttar Pradesh — designed for modern retail, hospitality and gifting."
      />
      <div className="container-x section">
        <div className="grid md:grid-cols-2 gap-10 items-start">
          <div>
            <p className="text-petrol uppercase tracking-widest text-xs font-semibold">Who we are</p>
            <h2 className="font-serif font-bold text-navy text-3xl mt-2">New Look Impex</h2>
            <div className="text-gray space-y-4 mt-4">
              <p>
                New Look Impex is a wholesale supplier of handcrafted brass and copper décor based in
                Moradabad, Uttar Pradesh, India. We work with the region&apos;s metalworking tradition to
                bring urlis, diyas, lanterns, bowls, trays and statement homeware to retail buyers,
                importers, interior designers and gifting programmes.
              </p>
              <p>
                We operate on a wholesale enquiry model: every order is quoted individually, with pricing,
                minimum quantities, lead time and packaging confirmed in writing before production.
              </p>
            </div>
          </div>
          <div className="border border-brass/50 p-10 text-center bg-navy" aria-hidden="true">
            <p className="font-serif text-8xl font-bold text-gold-light">N</p>
            <p className="mt-4 text-xs uppercase tracking-widest text-ivory/60">Brass · Copper · Handcrafted</p>
          </div>
        </div>

        <div className="mt-16">
          <h2 className="font-serif font-bold text-navy text-3xl">Moradabad metalcraft heritage</h2>
          <div className="text-gray space-y-4 mt-4 max-w-3xl">
            <p>
              Moradabad has a long-standing reputation for brass and copper metalwork. Generations of
              artisans have shaped, engraved and finished metal into vessels and objects for everyday and
              ceremonial use — including the urli, the traditional wide-mouthed vessel now widely used as
              a decorative centrepiece.
            </p>
            <p>
              Our catalogue builds on this heritage: familiar forms reinterpreted for contemporary
              interiors, alongside classic pieces suited to festive and ceremonial settings.
            </p>
          </div>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-5">
          <div className="card-flat bg-white">
            <h3 className="font-serif font-semibold text-navy text-xl">Materials</h3>
            <p className="text-sm text-gray mt-2">
              Our core materials are brass and copper — chosen for their warmth, workability and the way
              they age. Individual product pages list the material of each piece where confirmed.
            </p>
          </div>
          <div className="card-flat bg-white">
            <h3 className="font-serif font-semibold text-navy text-xl">Finishes</h3>
            <p className="text-sm text-gray mt-2">
              From polished and lacquered surfaces to antique and hand-distressed effects, finishes are
              listed per product where confirmed. Filter the catalogue by finish to compare options.
            </p>
            <Link href="/products" className="btn btn-outline btn-sm mt-4">Browse the catalogue</Link>
          </div>
          <div className="card-flat bg-white">
            <h3 className="font-serif font-semibold text-navy text-xl">Design & craftsmanship</h3>
            <p className="text-sm text-gray mt-2">
              Designs are developed for wholesale realities: consistent sizing, stable finishes and
              packaging that survives export. Specifications on each product page reflect what we have
              verified for that piece.
            </p>
          </div>
        </div>

        <div className="mt-16 bg-sand/60 border border-sand p-8 md:p-10 grid md:grid-cols-2 gap-6 items-center">
          <div>
            <h2 className="font-serif font-bold text-navy text-2xl">Customisation, on enquiry</h2>
            <p className="text-sm text-gray mt-2">
              Need a different size, finish or a design developed to your brief? Custom and OEM-style
              requirements are welcome as enquiries — send dimensions, finishes or reference material and
              we will confirm what is possible, with pricing and lead time quoted per order.
            </p>
          </div>
          <div className="flex flex-wrap md:justify-end gap-3">
            <Link href="/request-quote" className="btn btn-primary">Send a Customisation Enquiry</Link>
            <a
              className="btn btn-outline"
              href={whatsappLink("Hi, I would like to discuss a custom décor requirement.")}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </a>
          </div>
        </div>

        <div className="mt-12 bg-navy text-ivory p-8 md:p-12 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="font-serif font-bold text-3xl text-white">Source directly, with clarity</h2>
            <p className="text-ivory/75 mt-3">
              Wholesale pricing, MOQ and lead time — confirmed in writing before you commit.
            </p>
          </div>
          <div className="flex flex-wrap md:justify-end gap-3">
            <Link href="/wholesale" className="btn btn-brass">How Wholesale Works</Link>
            <Link href="/products" className="btn bg-white text-navy hover:bg-ivory">Explore the Collection</Link>
          </div>
        </div>
      </div>
    </>
  );
}
