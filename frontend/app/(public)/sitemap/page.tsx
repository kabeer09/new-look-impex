import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/public/Shared";

export const metadata: Metadata = {
  title: "Sitemap",
  description: "HTML sitemap of the New Look Impex public website.",
};

const SECTIONS: { title: string; links: [string, string][] }[] = [
  {
    title: "Shop",
    links: [
      ["Shop Products", "/products"],
      ["Search", "/search"],
      ["Categories", "/categories"],
      ["Collections", "/collections"],
      ["Brass Collection", "/brass-collection"],
      ["Copper Collection", "/copper-collection"],
      ["Urlis", "/urlis"],
      ["Diyas & Lanterns", "/diyas-lanterns"],
      ["Gifting", "/gifting"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About", "/about"],
      ["Our Craft", "/craft"],
      ["Wholesale & Bulk Orders", "/wholesale"],
      ["Customisation & OEM", "/customisation"],
      ["Catalogue", "/catalogue"],
      ["Buyer Resources", "/buyer-resources"],
      ["Shipping & Export", "/shipping-export"],
      ["Contact", "/contact"],
    ],
  },
  {
    title: "Support",
    links: [
      ["Request a Quote (RFQ)", "/request-quote"],
      ["Privacy Policy", "/privacy"],
      ["Terms of Enquiry", "/terms"],
      ["Sitemap", "/sitemap"],
    ],
  },
];

export default function SitemapPage() {
  return (
    <>
      <PageHero title="Sitemap" subtitle="All pages on the New Look Impex website." />
      <div className="container-x section">
        <div className="grid md:grid-cols-3 gap-8">
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <h2 className="font-serif font-bold text-navy text-xl">{s.title}</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {s.links.map(([label, href]) => (
                  <li key={href}>
                    <Link className="link" href={href}>{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="card mt-10">
          <h2 className="font-serif font-bold text-navy text-xl">Machine-readable sitemap</h2>
          <p className="text-sm text-gray mt-2">
            Search engines can index the catalogue via the XML sitemap served by the backend.
          </p>
          <a className="btn btn-outline btn-sm mt-4" href="/sitemap.xml" target="_blank" rel="noopener noreferrer">
            Open /sitemap.xml
          </a>
        </div>
      </div>
    </>
  );
}
