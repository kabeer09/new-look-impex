"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useWhatsappNumber } from "@/hooks/useWhatsapp";
import type { PublicSettings } from "@/lib/types";
import { useRfqCart } from "@/lib/rfq";
import { RfqDrawer } from "./RfqDrawer";
import { MarketToggle } from "./MarketControls";

export const DEFAULT_ANNOUNCEMENT = "Shopping in India · Wholesale enquiries";

/** Consumer-facing surfaces (regional storefronts + the B2C brand page) keep the
 *  seasonal campaign announcement; the main B2B site always shows the trade line
 *  so no discount/clearance messaging appears on B2B pages. */
const CONSUMER_SURFACES = ["/usa", "/uk", "/uae", "/au", "/canada", "/europe", "/nli-collections", "/shop"];

/** Minimal editorial navigation — first-fold redesign. */
const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Copper", href: "/copper-collection" },
  { label: "Brass", href: "/brass-collection" },
  { label: "Home Décor", href: "/metal-home-decor" },
  { label: "Gifting", href: "/gifting" },
  { label: "Our Story", href: "/about" },
  { label: "Europe Markets", href: "/europe" },
  { label: "Contact", href: "/contact" },
];

const DISMISS_KEY = "nli-announcement-dismissed";

/** Top announcement bar — two editorial lines; admin-configured text always wins
 *  on line 1; the buyer line below is dismissible for the session. */
function AnnouncementBar() {
  const pathname = usePathname() || "/";
  const isConsumerSurface = CONSUMER_SURFACES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const [text, setText] = useState<string>(DEFAULT_ANNOUNCEMENT);
  const [dismissed, setDismissed] = useState(false);
  const adminText = useRef<string | null>(null);
  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      /* private mode — keep visible */
    }
    api<PublicSettings>("/api/public/settings")
      .then((s) => {
        if (s.announcement && s.announcement.enabled && s.announcement.text.trim()) {
          adminText.current = s.announcement.text;
          setText(s.announcement.text);
        }
      })
      .catch(() => undefined);
    if (isConsumerSurface) {
      api<{ emoji: string; name: string; percent: number; code: string }>("/api/public/active-campaign")
        .then((c) => { if (!adminText.current) setText(`${c.emoji} ${c.name.toUpperCase()} — ${c.percent}% OFF STOREWIDE | CODE: ${c.code}`); })
        .catch(() => undefined);
    }
  }, [isConsumerSurface]);

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private mode — dismissed for this render only */
    }
  };

  if (dismissed) return null;

  return (
    <div className="bg-editorial-dark text-editorial-bg font-inter">
      <div className="container-x flex items-center justify-between gap-4 py-1.5">
        <p className="truncate text-[10px] md:text-[11px] uppercase tracking-[0.18em]">{text}</p>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/contact"
            className="hidden text-[10px] md:text-[11px] uppercase tracking-[0.18em] text-editorial-bg/85 transition-colors hover:text-editorial-gold sm:inline"
          >
            International buyers? Contact us
          </Link>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss announcement"
            className="flex h-5 w-5 items-center justify-center text-[11px] leading-none text-editorial-bg/60 transition-colors hover:text-editorial-gold"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="container-x py-1.5 text-center text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-editorial-bg/80">
          Handcrafted in Moradabad, India · Worldwide wholesale enquiries
        </p>
      </div>
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
      <header className="sticky top-0 z-40 border-b border-editorial-ink/10 bg-editorial-bg/95 backdrop-blur">
        <div className="container-x">
          <div className="relative flex items-center gap-4 py-3">
            {/* Brand mark */}
            <Link
              href="/"
              className="flex shrink-0 items-center gap-3"
            >
              <span className="block h-11 w-11 overflow-hidden rounded-full bg-editorial-dark ring-1 ring-editorial-gold/40 md:h-12 md:w-12">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo-nli-collections.webp"
                  alt="NLI Collections"
                  className="h-full w-full scale-[1.04] object-cover"
                  width={1600}
                  height={1600}
                />
              </span>
              <span className="hidden flex-col leading-none sm:flex">
                <span className="font-cormorant text-lg font-semibold tracking-[0.2em] text-editorial-ink md:text-xl">
                  NLI COLLECTIONS
                </span>
                <span className="mt-1 font-inter text-[8px] uppercase tracking-[0.34em] text-editorial-accent md:text-[9px]">
                  The Art of Indian Metalcraft
                </span>
              </span>
            </Link>

            {/* Minimal navigation */}
            <nav className="mx-auto hidden items-center gap-5 xl:flex" aria-label="Primary">
              {NAV_LINKS.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`whitespace-nowrap font-inter text-[11px] uppercase tracking-[0.16em] transition-colors ${
                    isActive(n.href) ? "text-editorial-accent" : "text-editorial-ink/75 hover:text-editorial-accent"
                  }`}
                  aria-current={isActive(n.href) ? "page" : undefined}
                >
                  {n.label}
                </Link>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-1 xl:ml-0">
              <MarketToggle />
              <button
                className="flex h-9 w-9 items-center justify-center text-editorial-ink transition-colors hover:text-editorial-accent"
                onClick={() => setSearchOpen((v) => !v)}
                aria-expanded={searchOpen}
                aria-label="Search"
                title="Search"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </button>
              <button
                className="relative flex h-9 w-9 items-center justify-center text-editorial-ink transition-colors hover:text-editorial-accent"
                onClick={() => setDrawerOpen(true)}
                aria-label={`Enquiry list, ${cart.count} items`}
                title="Enquiry list"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <path d="M6 7h15l-1.5 9h-12z" />
                  <path d="M6 7l-1-4H2" />
                  <circle cx="9" cy="20" r="1.5" />
                  <circle cx="17" cy="20" r="1.5" />
                </svg>
                {cart.count > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-editorial-accent text-[9px] font-bold text-white">
                    {cart.count}
                  </span>
                )}
              </button>
              <Link
                href="/request-quote"
                className="ml-2 hidden items-center bg-editorial-emerald px-4 py-2 font-inter text-[11px] uppercase tracking-[0.16em] text-editorial-bg transition-colors hover:bg-emerald-dark sm:inline-flex"
              >
                Request a Quote
              </Link>

              <button
                className="flex h-9 w-9 items-center justify-center text-editorial-ink transition-colors hover:text-editorial-accent xl:hidden"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-label="Menu"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
                </svg>
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
          <div className="border-t border-editorial-ink/10 bg-editorial-bg xl:hidden">
            <div className="container-x py-3">
              {NAV_LINKS.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`block py-2 font-inter text-xs uppercase tracking-[0.18em] transition-colors ${
                    isActive(n.href) ? "text-editorial-accent" : "text-editorial-ink/80"
                  }`}
                  onClick={() => setOpen(false)}
                >
                  {n.label}
                </Link>
              ))}
              <Link
                href="/request-quote"
                className="mt-3 inline-flex items-center bg-editorial-emerald px-4 py-2 font-inter text-[11px] uppercase tracking-[0.16em] text-editorial-bg transition-colors hover:bg-emerald-dark"
                onClick={() => setOpen(false)}
              >
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
        className="fixed right-6 z-50 w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform nli-whatsapp"
        style={{ top: "calc(45% + 3rem)" }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>

      <RfqDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
