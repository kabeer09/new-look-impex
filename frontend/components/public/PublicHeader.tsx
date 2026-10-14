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
    <div className="bg-navy text-ivory text-center text-xs tracking-wide py-1.5 px-4">
      <p>{text}</p>
    </div>
  );
}

export function PublicHeader() {
  const [open, setOpen] = useState(false);
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
  };

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"));

  return (
    <>
      <AnnouncementBar />
      <header className="sticky top-0 z-40 bg-ivory/95 backdrop-blur border-b border-sand">
        <div className="container-x">
          <div className="flex items-center gap-3 py-3">
            <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="New Look Impex home">
              <span className="w-9 h-9 bg-navy text-gold-light font-serif font-bold flex items-center justify-center text-lg">N</span>
              <span className="leading-tight">
                <span className="block font-serif font-bold text-navy text-lg">New Look Impex</span>
                <span className="block text-[10px] uppercase tracking-widest text-gray">Moradabad · Brass &amp; Copper</span>
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-5 ml-6" aria-label="Primary">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className={`header-link ${isActive(n.href) ? "active" : ""}`}>
                  {n.label}
                </Link>
              ))}
            </nav>

            <div className="flex-1" />

            <form onSubmit={submitSearch} className="hidden md:flex items-center" role="search">
              <label htmlFor="site-search" className="sr-only">
                Search products
              </label>
              <input
                id="site-search"
                className="input !w-44 !py-1.5"
                placeholder="Search products…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button type="submit" className="btn btn-primary !px-3 !py-1.5 ml-2" aria-label="Search">
                Search
              </button>
            </form>

            <button
              className="btn btn-ghost btn-sm relative"
              onClick={() => setDrawerOpen(true)}
              aria-label={`Enquiry list, ${cart.count} items`}
            >
              Enquiry List
              {cart.count > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-brass text-white text-[10px] font-bold flex items-center justify-center">
                  {cart.count}
                </span>
              )}
            </button>
            <Link href="/request-quote" className="btn btn-primary btn-sm hidden sm:inline-flex">
              Request a Quote
            </Link>

            <button className="lg:hidden btn btn-ghost btn-sm !px-2" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Menu">
              ☰
            </button>
          </div>
        </div>

        {open && (
          <div className="lg:hidden border-t border-sand bg-ivory">
            <div className="container-x py-3 space-y-1">
              <form onSubmit={submitSearch} className="flex mb-3" role="search">
                <input
                  className="input"
                  placeholder="Search products…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label="Search products"
                />
                <button type="submit" className="btn btn-primary ml-2 shrink-0">
                  Search
                </button>
              </form>
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`header-link block py-1.5 ${isActive(n.href) ? "active" : ""}`}
                  onClick={() => setOpen(false)}
                >
                  {n.label}
                </Link>
              ))}
              <Link href="/request-quote" className="btn btn-primary btn-sm mt-2" onClick={() => setOpen(false)}>
                Request a Quote
              </Link>
              <div className="pt-2 mt-2 border-t border-sand">
                <p className="text-[11px] uppercase tracking-widest text-gray mb-1">More</p>
                {MORE_LINKS.map((n) => (
                  <Link key={n.href} href={n.href} className="header-link block py-1" onClick={() => setOpen(false)}>
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
