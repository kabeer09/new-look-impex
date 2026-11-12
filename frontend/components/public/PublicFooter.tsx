"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api, BUSINESS_EMAIL, BUSINESS_LOCATION, BUSINESS_PHONES, whatsappLink, BUSINESS_SALES_EMAIL } from "@/lib/api";
import type { Category, Collection, PublicSettings } from "@/lib/types";

const COMPANY_LINKS: [string, string][] = [
  ["About Us", "/about"],
  ["Our Story", "/craft"],
  ["Why Choose Us", "/wholesale"],
  ["Benefits", "/buyer-resources"],
  ["Partner With Us", "/customisation"],
  ["NLI Collections", "/nli-collections"],
  ["Contact", "/contact"],
  ["Admin Login", "/admin/signin"],
];

const SHOP_LINKS: [string, string][] = [
  ["All Collection", "/products"],
  ["Copper Utensils", "/products?material=Copper"],
  ["Brass Utensils & Cookware", "/products?material=Brass"],
  ["Brass Glass Set", "/categories/drinking-glasses-tumblers"],
  ["Brass Gift Items", "/gifting"],
  ["Brass Pooja Items", "/categories/brass-diyas"],
  ["Home Decor Brass Items", "/metal-home-decor"],
  ["Brass Dinner Set", "/categories/brass-kitchenware"],
  ["Top Picks / Best Sellers", "/products"],
];

const GUIDE_LINKS: [string, string][] = [
  ["Buying Guides & Blog", "/blog"],
  ["Buyer Resources", "/buyer-resources"],
  ["Wholesale & RFQ Guide", "/wholesale"],
  ["Shipping & Export", "/shipping-export"],
  ["Catalogue (PDF)", "/catalogue"],
  ["Request a Quote", "/request-quote"],
];

const REGION_LINKS: [string, string][] = [
  ["Australia", "/au"],
  ["United Arab Emirates", "/uae"],
  ["United Kingdom", "/uk"],
  ["United States", "/usa"],
  ["Canada", "/canada"],
  ["Europe", "/europe"],
];

export function PublicFooter() {
  const pathname = usePathname();
  // The NLI Collections page is the consumer (B2C) brand surface — swap the
  // wholesale footer CTA and tagline there so wholesale-only messaging stays
  // on the B2B site only.
  const isNli = pathname === "/nli-collections" || pathname.startsWith("/nli-collections/");
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
      {/* Enquiry CTA — consumer copy on NLI Collections, wholesale elsewhere */}
      <div className="border-b border-cream/20">
        <div className="container-x py-10 flex flex-col md:flex-row md:items-center gap-6 md:justify-between">
          <div>
            <h2 className="font-serif font-bold text-2xl text-white">
              {isNli
                ? "Bring home handcrafted brass & copper from Moradabad"
                : "Sourcing for your store, project or gifting programme?"}
            </h2>
            <p className="text-sm text-cream/80 mt-2 max-w-xl">
              {isNli
                ? "Explore the NLI Collections catalogue, or message us about a piece you like — we confirm price and delivery in writing."
                : "Send an enquiry with the products and quantities you need — we confirm pricing, MOQ and lead time in writing."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            {isNli ? (
              <>
                <Link href="/collections" className="btn bg-white text-espresso hover:bg-cream">
                  Explore Collections
                </Link>
                <Link href="/contact" className="btn bg-espresso text-cream hover:bg-black">
                  Contact Us
                </Link>
              </>
            ) : (
              <>
                <Link href="/wholesale" className="btn bg-white text-espresso hover:bg-cream">
                  Wholesale Enquiries
                </Link>
                <Link href="/request-quote" className="btn bg-espresso text-cream hover:bg-black">
                  Request a Quote
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="container-x py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-7 gap-8">
          <div>
            <h2 className="font-serif font-bold text-xl text-white">{businessName}</h2>
            <p className="text-sm text-cream/80 mt-3">{location}</p>
            <ul className="text-sm text-cream/80 mt-3 space-y-1.5">
              <li>
                <a className="hover:text-gold-light underline underline-offset-2" href={`mailto:${email}`}>
                  Website Enquiries: {email}
                </a>
              </li>
              <li>
                <a className="hover:text-gold-light underline underline-offset-2" href={`mailto:${BUSINESS_SALES_EMAIL}`}>
                  Sales: {BUSINESS_SALES_EMAIL}
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
                  WhatsApp Business: +91 96900 53913
                </a>
              </li>
              <li>
                <span className="text-xs text-gray">Sales WhatsApp: +91 9808588603</span>
              </li>
            </ul>
          </div>

          <nav aria-label="Categories">
            <h3 className="text-cream font-semibold text-sm uppercase tracking-wider">Categories</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-cream/80">
              <li className="pb-1">
                <Link href="/products" className="font-semibold text-gold-light hover:text-white">
                  Mix Collection — All Products
                </Link>
              </li>
              {categories.length === 0 && (
                <li>
                  <Link href="/categories" className="hover:text-white">
                    All categories
                  </Link>
                </li>
              )}
              {categories.slice(0, 10).map((c) => (
                <li key={c.slug}>
                  <Link href={`/categories/${c.slug}`} className="hover:text-white">
                    {c.name}
                    {typeof c.product_count === "number" && c.product_count > 0 ? ` (${c.product_count})` : ""}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Collections">
            <h3 className="text-cream font-semibold text-sm uppercase tracking-wider">Collections</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-cream/80">
              <li className="pb-1">
                <Link href="/products" className="font-semibold text-gold-light hover:text-white">
                  Mix Collection — All Products
                </Link>
              </li>
              {collections.length === 0 && (
                <li>
                  <Link href="/collections" className="hover:text-white">
                    All collections
                  </Link>
                </li>
              )}
              {collections.slice(0, 10).map((c) => (
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

          <nav aria-label="Buy by region">
            <h3 className="text-cream font-semibold text-sm uppercase tracking-wider">Buy by region</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-cream/80">
              {REGION_LINKS.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Shop now">
            <h3 className="text-cream font-semibold text-sm uppercase tracking-wider">Shop now</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-cream/80">
              {SHOP_LINKS.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Guides & resources">
            <h3 className="text-cream font-semibold text-sm uppercase tracking-wider">Guides & resources</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-cream/80">
              {GUIDE_LINKS.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="border-t border-cream/20 mt-10 pt-6 flex flex-col md:flex-row gap-2 md:items-center md:justify-between text-xs text-cream/60">
          <p>
            © {new Date().getFullYear()} {businessName}. All rights reserved.
          </p>
          <p>
            {isNli
              ? "Crafted in Moradabad, India | By New Look Impex"
              : "Wholesale enquiries only · Moradabad, Uttar Pradesh, India"}
          </p>
          <p className="mt-1">GSTIN: 09AFKPA4462R1ZW</p>
          <a
            href="https://www.google.com/maps/search/New+Look+Impex+Moradabad"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gold-light underline underline-offset-2 mt-1 inline-block"
          >
            Google Business Profile
          </a>
          <div className="mt-3 flex gap-3">
            <a href="https://www.instagram.com/nli_collections_india" target="_blank" rel="noopener noreferrer" className="text-cream/60 hover:text-gold-light transition-colors" aria-label="Instagram">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
            <a href="https://youtube.com/@nlicollections" target="_blank" rel="noopener noreferrer" className="text-cream/60 hover:text-gold-light transition-colors" aria-label="YouTube">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
