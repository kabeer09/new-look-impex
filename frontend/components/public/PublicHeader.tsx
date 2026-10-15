"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { PublicSettings } from "@/lib/types";
import { useRfqCart } from "@/lib/rfq";
import { RfqDrawer } from "./RfqDrawer";

export const DEFAULT_ANNOUNCEMENT = "Handcrafted Metal Décor | Wholesale & Bulk Enquiries";

const NAV = [
  { label: "Home", href: "/" },
  { label: "Shop Products", href: "/products" },
  { label: "Collections", href: "/collections" },
  { label: "Our Craft", href: "/craft" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

/** Older routes kept working and linked where sensible. */
const MORE_LINKS = [
  { label: "Shop All (classic view)", href: "/shop" },
  { label: "Categories", href: "/categories" },
  { label: "Wholesale", href: "/wholesale" },
  { label: "Catalogue (PDF)", href: "/catalogue" },
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
            <nav className="hidden lg:flex items-center gap-5" aria-label="Primary">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className={`text-[13px] tracking-wide text-espresso hover:text-clay transition-colors ${isActive(n.href) ? "font-semibold text-clay" : ""}`}>
                  {n.label.toUpperCase()}
                </Link>
              ))}
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
              <Link href="/request-quote" className="btn btn-clay btn-sm mt-2" onClick={() => setOpen(false)}>
                Request a Quote
              </Link>
              <div className="pt-2 mt-2 border-t border-clay/20">
                <p className="text-[11px] uppercase tracking-widest text-gray mb-1">More</p>
                {MORE_LINKS.map((n) => (
                  <Link key={n.href} href={n.href} className="block py-1 text-sm text-espresso" onClick={() => setOpen(false)}>
                    {n.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>
      <RfqDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
