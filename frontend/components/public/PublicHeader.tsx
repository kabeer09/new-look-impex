"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useWhatsappNumber } from "@/hooks/useWhatsapp";
import type { PublicSettings } from "@/lib/types";
import { useRfqCart } from "@/lib/rfq";
import { RfqDrawer } from "./RfqDrawer";

export const DEFAULT_ANNOUNCEMENT = "Handcrafted in Moradabad | Wholesale & Global Export Enquiries Welcome";

const NAV = [
  { label: "Home", href: "/" },
  { label: "Collections", href: "/collections" },
  { label: "Copperware", href: "/copper-collection" },
  { label: "Brassware", href: "/brass-collection" },
  { label: "Home Decor", href: "/metal-home-decor" },
  { label: "Gifting", href: "/gifting" },
];

const NAV_MORE = [
  { label: "Custom Manufacturing", href: "/customisation" },
  { label: "About Us", href: "/about" },
  { label: "Exhibitions", href: "/exhibitions" },
  { label: "Contact", href: "/contact" },
  { label: "Shop All Products", href: "/products" },
  { label: "Wholesale", href: "/wholesale" },
  { label: "Catalogue (PDF)", href: "/catalogue" },
  { label: "Buying Guides", href: "/blog" },
];

/** Older routes kept working and linked where sensible. */
const MORE_LINKS = [
  { label: "Shop All (classic view)", href: "/shop" },
  { label: "Categories", href: "/categories" },
  { label: "Wholesale", href: "/wholesale" },
  { label: "Catalogue (PDF)", href: "/catalogue" },
  { label: "Buying Guides", href: "/blog" },
];

function AnnouncementBar() {
  const [text, setText] = useState<string>(DEFAULT_ANNOUNCEMENT);
  useEffect(() => {
    api<PublicSettings>("/api/public/settings")
      .then((s) => {
        if (s.announcement && s.announcement.enabled && s.announcement.text.trim()) {
          setText(s.announcement.text);
        }
      })
      .catch(() => undefined);
  }, []);
  return (
    <div className="bg-clay text-cream text-center text-[11px] tracking-[0.18em] uppercase py-1.5 px-4">
      <p>{text}</p>
    </div>
  );
}

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const cart = useRfqCart();
  const router = useRouter();
  const pathname = usePathname();

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
    setOpen(false);
    setSearchOpen(false);
  };

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"));

  return (
    <>
      <AnnouncementBar />
      <header className="sticky top-0 z-40 bg-cream/95 backdrop-blur border-b border-clay/20">
        <div className="container-x">
          <div className="relative flex items-center gap-3 py-3">
            <nav className="hidden lg:flex items-center gap-3 pr-12" aria-label="Primary">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className={`text-[12px] tracking-wide text-espresso hover:text-clay transition-colors whitespace-nowrap ${isActive(n.href) ? "font-semibold text-clay" : ""}`}>
                  {n.label.toUpperCase()}
                </Link>
              ))}
              <div className="relative group">
                <button className="text-[12px] tracking-wide text-espresso hover:text-clay transition-colors whitespace-nowrap" aria-haspopup="true">
                  MORE ▾
                </button>
                <div className="absolute top-full right-0 mt-2 bg-white border border-clay/20 shadow-lg rounded-lg py-2 min-w-[180px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  {NAV_MORE.map((n) => (
                    <Link key={n.href} href={n.href} className="block px-4 py-2 text-sm text-espresso hover:bg-cream hover:text-clay transition-colors">
                      {n.label}
                    </Link>
                  ))}
                </div>
              </div>
            </nav>

            <Link
              href="/"
              className="lg:absolute lg:left-1/2 lg:-translate-x-1/2 flex flex-col items-center leading-none"
              aria-label="New Look Impex home"
            >
              <span className="font-serif font-bold text-espresso text-xl tracking-wide">NEW LOOK IMPEX</span>
              <span className="text-[10px] tracking-[0.28em] text-clay mt-1">BRASS &amp; COPPER · WHOLESALE</span>
            </Link>

            <div className="flex-1 lg:hidden" />

            <div className="flex items-center gap-1.5 ml-auto">
              <button
                className="btn btn-ghost btn-sm !px-2 !border-transparent"
                onClick={() => setSearchOpen((v) => !v)}
                aria-expanded={searchOpen}
                aria-label="Search"
                title="Search"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </button>
              <button
                className="btn btn-ghost btn-sm !px-2 !border-transparent relative"
                onClick={() => setDrawerOpen(true)}
                aria-label={`Enquiry list, ${cart.count} items`}
                title="Enquiry list"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M6 7h15l-1.5 9h-12z" />
                  <path d="M6 7l-1-4H2" />
                  <circle cx="9" cy="20" r="1.5" />
                  <circle cx="17" cy="20" r="1.5" />
                </svg>
                {cart.count > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-clay text-white text-[10px] font-bold flex items-center justify-center">
                    {cart.count}
                  </span>
                )}
              </button>
              <Link href="/catalogue" className="btn btn-ghost btn-sm hidden md:inline-flex">
                Request Catalogue
              </Link>
              <Link href="/request-quote" className="btn btn-clay btn-sm hidden sm:inline-flex">
                Request a Quote
              </Link>

              <button className="lg:hidden btn btn-ghost btn-sm !px-2 !border-transparent" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Menu">
                ☰
              </button>
            </div>
          </div>

          {searchOpen && (
            <form onSubmit={submitSearch} className="flex pb-3" role="search">
              <label htmlFor="site-search" className="sr-only">
                Search products
              </label>
              <input
                id="site-search"
                className="input"
                placeholder="Search products, SKU, materials…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                autoFocus
              />
              <button type="submit" className="btn btn-clay ml-2 shrink-0" aria-label="Search">
                Search
              </button>
            </form>
          )}
        </div>

        {open && (
          <div className="lg:hidden border-t border-clay/20 bg-cream">
            <div className="container-x py-3 space-y-1">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`block py-1.5 text-sm tracking-wide text-espresso ${isActive(n.href) ? "font-semibold text-clay" : ""}`}
                  onClick={() => setOpen(false)}
                >
                  {n.label.toUpperCase()}
                </Link>
              ))}
              <div className="pt-2 mt-2 border-t border-clay/20">
                <p className="text-[11px] uppercase tracking-widest text-gray mb-1">More</p>
                {NAV_MORE.map((n) => (
                  <Link key={n.href} href={n.href} className="block py-1 text-sm text-espresso" onClick={() => setOpen(false)}>
                    {n.label}
                  </Link>
                ))}
              </div>
              <Link href="/request-quote" className="btn btn-clay btn-sm mt-2" onClick={() => setOpen(false)}>
                Request a Quote
              </Link>
            </div>
          </div>
        )}
      </header>
      {/* Floating WhatsApp button */}
      <a
        href={`https://wa.me/${useWhatsappNumber()}?text=${encodeURIComponent("Hello, I would like to discuss wholesale requirements with New Look Impex.")}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>

      <RfqDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
