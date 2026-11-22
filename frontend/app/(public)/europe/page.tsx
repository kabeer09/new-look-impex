import type { Metadata } from "next";
import Link from "next/link";
import { EUROPE_COUNTRIES } from "./[country]/europe-data";
import { EUROPE_LANGUAGES } from "./[country]/europe-meta";
import { COUNTRIES } from "@/app/(public)/wholesale/[country]/country-data";
import { CountryPage } from "@/app/(public)/wholesale/[country]/CountryPage";
import { fetchRegionalProducts } from "@/app/(public)/wholesale/[country]/regional-products";

const SITE = "https://www.newlookimpex.store";

export const metadata: Metadata = {
  title: "Wholesale Copper & Brassware Europe — Manufacturer & Exporter",
  description: "New Look Impex supplies hand-hammered copper and brass products to wholesalers and retailers across Europe. Explore country-specific pages for Germany, France, Italy and more.",
  keywords: "copperware wholesale Europe, brassware manufacturer India Europe, Indian handicrafts exporter Europe, brass home decor wholesale Europe",
  alternates: { canonical: `${SITE}/europe`, languages: EUROPE_LANGUAGES },
};
export const revalidate = 300;

export default async function EuropeRegionalPage() {
  const products = await fetchRegionalProducts("europe");
  return (
    <div>
      {/* Europe Markets hub — entry point to the ten country pages */}
      <section className="bg-espresso text-cream">
        <div className="container-x py-16 md:py-20">
          <p className="font-inter text-[11px] uppercase tracking-[0.22em] text-gold">Europe Markets</p>
          <h1 className="mt-3 max-w-3xl font-cormorant text-4xl font-semibold text-white md:text-5xl">Indian Handcrafted Excellence for Europe</h1>
          <p className="mt-4 max-w-2xl text-sm text-cream/80 leading-relaxed">
            Explore our country-specific wholesale pages — each with its own product focus, buyer guidance and enquiry form.
          </p>
          <ul className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {EUROPE_COUNTRIES.map((c) => (
              <li key={c.slug}>
                <Link href={`/europe/${c.slug}`} className="flex items-center justify-between border border-gold/25 px-4 py-3 text-sm transition-colors hover:border-gold hover:bg-cream/5">
                  <span>{c.name}</span>
                  <span className="text-gold" aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <CountryPage slug="europe" initialProducts={products} />
    </div>
  );
}
