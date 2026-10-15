"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, BUSINESS_EMAIL, BUSINESS_LOCATION, BUSINESS_PHONES, whatsappLink } from "@/lib/api";
import type { Category, Collection, PublicSettings } from "@/lib/types";

const COMPANY_LINKS: [string, string][] = [
  ["Our Craft", "/craft"],
  ["Wholesale", "/wholesale"],
  ["Catalogue (PDF)", "/catalogue"],
  ["Request a Quote", "/request-quote"],
  ["Contact", "/contact"],
];

export function PublicFooter() {
  const [s, setS] = useState<PublicSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);

  useEffect(() => {
    api<PublicSettings>("/api/public/settings")
      .then(setS)
      .catch(() => undefined);
    api<{ items: Category[] }>("/api/public/categories")
      .then((d) => setCategories(d.items || []))
      .catch(() => undefined);
    api<{ items: Collection[] }>("/api/public/collections")
      .then((d) => setCollections(d.items || []))
      .catch(() => undefined);
  }, []);

  const businessName = s?.business_name || "New Look Impex";
  const email = s?.email || BUSINESS_EMAIL;
  const phones = s?.phones && s.phones.length > 0 ? s.phones : BUSINESS_PHONES;
  const location = s?.location || BUSINESS_LOCATION;

  return (
    <footer className="bg-clay-dark text-cream mt-16">
      {/* Wholesale enquiry CTA */}
      <div className="border-b border-cream/20">
        <div className="container-x py-10 flex flex-col md:flex-row md:items-center gap-6 md:justify-between">
          <div>
            <h2 className="font-serif font-bold text-2xl text-white">Sourcing for your store, project or gifting programme?</h2>
            <p className="text-sm text-cream/80 mt-2 max-w-xl">
              Send an enquiry with the products and quantities you need — we confirm pricing, MOQ and lead time in writing.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link href="/wholesale" className="btn bg-white text-espresso hover:bg-cream">
              Wholesale Enquiries
            </Link>
            <Link href="/request-quote" className="btn bg-espresso text-cream hover:bg-black">
              Request a Quote
            </Link>
          </div>
        </div>
      </div>

      <div className="container-x py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <h2 className="font-serif font-bold text-xl text-white">{businessName}</h2>
            <p className="text-sm text-cream/80 mt-3">{location}</p>
            <ul className="text-sm text-cream/80 mt-3 space-y-1.5">
              <li>
                <a className="hover:text-gold-light underline underline-offset-2" href={`mailto:${email}`}>
                  {email}
                </a>
              </li>
              {phones.map((p) => (
                <li key={p}>{p}</li>
              ))}
              <li>
                <a
                  className="hover:text-gold-light underline underline-offset-2"
                  href={whatsappLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp: +91 8218251238
                </a>
              </li>
            </ul>
          </div>

          <nav aria-label="Categories">
            <h3 className="text-cream font-semibold text-sm uppercase tracking-wider">Categories</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-cream/80">
              {categories.length === 0 && (
                <li>
                  <Link href="/categories" className="hover:text-white">
                    All categories
                  </Link>
                </li>
              )}
              {categories.slice(0, 7).map((c) => (
                <li key={c.slug}>
                  <Link href={`/categories/${c.slug}`} className="hover:text-white">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Collections">
            <h3 className="text-cream font-semibold text-sm uppercase tracking-wider">Collections</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-cream/80">
              {collections.length === 0 && (
                <li>
                  <Link href="/collections" className="hover:text-white">
                    All collections
                  </Link>
                </li>
              )}
              {collections.slice(0, 7).map((c) => (
                <li key={c.slug}>
                  <Link href={`/collections/${c.slug}`} className="hover:text-white">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Company">
            <h3 className="text-cream font-semibold text-sm uppercase tracking-wider">Company</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-cream/80">
              {COMPANY_LINKS.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
              <li className="pt-2 flex gap-4">
                <Link href="/privacy" className="hover:text-white">
                  Privacy
                </Link>
                <Link href="/terms" className="hover:text-white">
                  Terms
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="border-t border-cream/20 mt-10 pt-6 flex flex-col md:flex-row gap-2 md:items-center md:justify-between text-xs text-cream/60">
          <p>
            © {new Date().getFullYear()} {businessName}. All rights reserved.
          </p>
          <p>Wholesale enquiries only · Moradabad, Uttar Pradesh, India</p>
        </div>
      </div>
    </footer>
  );
}
