"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, mediaUrl } from "@/lib/api";
import type { Banner, Category, Collection, ProductCard as ProductCardType } from "@/lib/types";
import { ProductCard } from "@/components/public/ProductCard";
import { Loading, ErrorBox } from "@/components/public/States";
import { useRfqCart } from "@/lib/rfq";
import { useLeadMarket } from "@/lib/market";
import { HOME_FAQ } from "./home-faq";
import { SeasonalCalendar } from "@/components/public/SeasonalCalendar";
import { ShopByCategory } from "@/components/public/ShopByCategory";

/** Visible FAQ accordion — defaults shared with the FAQPage JSON-LD in page.tsx.
 *  An admin can override the copy in Site Control. */

const MEDIA_BASE = "https://luqgcacxkcrmhsdopjyl.supabase.co/storage/v1/object/public/media/";

/** "The Art of Indian Metalcraft" — editorial category cards (NLI lifestyle photography).
 *  Every href is an existing, indexed route; no invented URLs. */
const METALCRAFT_CARDS = [
  {
    img: "/nli-copper-bottle.jpg",
    category: "Copper Bottles · Drinkware",
    title: "Crafted for everyday living",
    cta: "Explore Copper",
    href: "/copper-bottles",
    alt: "Hand-hammered copper water bottle and tumbler — copper bottle manufacturer and wholesale supplier Moradabad India",
  },
  {
    img: "/nli-copper-utensils.jpg",
    category: "Copper Cookware · Utensils",
    title: "Made for the modern kitchen",
    cta: "Explore Kitchenware",
    href: "/copper-kitchenware",
    alt: "Hammered copper handi with brass handles — copper kitchenware manufacturer and exporter Moradabad India",
  },
  {
    img: "/nli-brass-utensils.jpg",
    category: "Brass Cookware · Utensils",
    title: "Rooted in tradition",
    cta: "Explore Brass",
    href: "/brass-collection",
    alt: "Hand-hammered brass cooking pot — brass utensils and cookware wholesale from Moradabad India",
  },
  {
    img: "/nli-brass-masala-box.jpg",
    category: "Brass Masala Boxes · Kitchenware",
    title: "Seasoned with heritage",
    cta: "Explore Brass Kitchenware",
    href: "/categories/brass-kitchenware",
    alt: "Brass masala spice box with hand-painted lid — brass kitchenware manufacturer exporter Moradabad India",
  },
];

/** "Corporate & Festive Gifting" — gift categories for wholesale and gifting buyers.
 *  Product imagery comes from NLI's own media library and supplied photography. */
const GIFT_CARDS = [
  {
    img: "/nli-gift-set.jpg",
    title: "Festive Gifting",
    text: "Diyas, lanterns and decorative brass.",
    cta: "Explore Collection",
    href: "/diyas-lanterns",
    alt: "Copper gift set presented in a festive home setting — festive gifting collections New Look Impex Moradabad",
  },
  {
    img: "/nli-copper-gift-set.jpg",
    title: "Copper Gift Sets",
    text: "Copper bottles and kitchenware.",
    cta: "Explore Collection",
    href: "/gifting",
    alt: "Copper pitcher and tumbler presented in a wooden gift box — copper gift sets wholesale from New Look Impex Moradabad India",
  },
  {
    img: "https://luqgcacxkcrmhsdopjyl.supabase.co/storage/v1/object/public/media/whatsapp-image-2026-11-01-at-3-38-26-pm-7aa37405.jpeg",
    title: "Premium Brass Gifts",
    text: "Urlis and timeless décor.",
    cta: "Explore Collection",
    href: "/brass-urli",
    alt: "Etched brass canister set — premium brass gifts and timeless home décor wholesale Moradabad India",
  },
  {
    img: "https://luqgcacxkcrmhsdopjyl.supabase.co/storage/v1/object/public/media/whatsapp-image-2026-11-01-at-3-38-28-pm-2-3c9a4f4c.jpeg",
    title: "Corporate & Bulk Gifting",
    text: "Custom orders and private label.",
    cta: "Request a Quote",
    href: "/request-quote",
    alt: "Hammered brass serving pot with lid — corporate gifting and bulk orders New Look Impex Moradabad",
  },
];

/** "The World of NLI Collections" — Section 3 auto-scrolling gallery (3 videos + 3 photographs).
 *  All media is New Look Impex's own supplied footage/photography; every href is an existing route. */
type GalleryCardData = {
  kind: "video" | "image";
  src: string;
  poster: string;
  title: string;
  text: string;
  href: string;
  alt: string;
};

const GALLERY_CARDS: GalleryCardData[] = [
  {
    kind: "video",
    src: "/gallery-v3.mp4",
    poster: "/gallery-poster-v3.jpg",
    title: "Made in Moradabad",
    text: "Indian craftsmanship, global appeal",
    href: "/about",
    alt: "Hammered copper pitcher styled with fresh flowers — New Look Impex metalcraft from Moradabad India",
  },
  {
    kind: "image",
    src: "/gallery-copper-bottles.webp",
    poster: "/gallery-copper-bottles.webp",
    title: "The Copper Edit",
    text: "Timeless copper creations",
    href: "/copper-bottles",
    alt: "Assorted hammered copper water bottles on a wooden table — copper bottle collection New Look Impex Moradabad",
  },
  {
    kind: "image",
    src: "/gallery-dispenser.webp",
    poster: "/gallery-dispenser.webp",
    title: "The Artisan's Touch",
    text: "Intricate etched detail",
    href: "/brass-handicrafts",
    alt: "Ornately etched water dispenser with tap and matching cups — traditional metalcraft from New Look Impex, Moradabad",
  },
  {
    kind: "video",
    src: "/gallery-v1.mp4",
    poster: "/gallery-poster-v1.jpg",
    title: "Light & Ambience",
    text: "Warm light, festive glow",
    href: "/brass-lanterns",
    alt: "Copper bottles glowing among warm festive lights — lanterns and decor New Look Impex Moradabad",
  },
  {
    kind: "image",
    src: "/gallery-festive-handi.webp",
    poster: "/gallery-festive-handi.webp",
    title: "The Festive Edit",
    text: "Crafted for celebrations",
    href: "/brass-collection",
    alt: "Brass handi of steaming festive food being served at the table — festive collections New Look Impex Moradabad",
  },
  {
    kind: "video",
    src: "/gallery-v2.mp4",
    poster: "/gallery-poster-v2.jpg",
    title: "The Gift Edit",
    text: "Beautifully presented",
    href: "/gifting",
    alt: "Engraved copper bottle and tumbler gift set being presented — copper gift sets New Look Impex",
  },
];

/** Blueprint 10 — "Our Manufacturing Excellence": eight capability blocks.
 *  Copy is drawn from existing site content only — no invented claims. */
const MFG_BLOCKS = [
  {
    num: "01",
    title: "Manufacturer & Exporter",
    text: "Handcrafted copper and brass products made in Moradabad — urlis, diyas, lanterns, bottles, kitchenware and home décor supplied to buyers worldwide.",
  },
  {
    num: "02",
    title: "Wholesale & Bulk Orders",
    text: "Written quotations for every order, with wholesale pricing and MOQ options for retailers, importers and distributors.",
  },
  {
    num: "03",
    title: "OEM/ODM Manufacturing",
    text: "Bespoke designs, custom sizes and specifications developed from your brief — samples confirmed in writing before production begins.",
  },
  {
    num: "04",
    title: "Custom Finishes",
    text: "Polished, hammered, brushed and engraved finish options across our copper and brass ranges.",
  },
  {
    num: "05",
    title: "Private Labelling",
    text: "Custom branding, packaging and presentation for corporate gifting programmes and retail lines.",
  },
  {
    num: "06",
    title: "Quality Inspection",
    text: "Multi-stage quality checks covering material, dimensions, finish and packaging before dispatch.",
  },
  {
    num: "07",
    title: "Export Documentation",
    text: "Complete export documentation and secure freight coordination, prepared with every shipment.",
  },
  {
    num: "08",
    title: "International Shipping Coordination",
    text: "Worldwide shipping coordination to your destination, with tracking and after-sales support for repeat orders.",
  },
];

/** Blueprint 11 — "Shop by Material" tiles. Bronze & Kansa has no product
 *  photograph of its own yet, so it renders as a typographic tile rather than
 *  mislabelling another metal's photo. */
const MATERIAL_TILES: { title: string; text: string; href: string; img: string | null; alt: string }[] = [
  {
    title: "Copper",
    text: "Cookware, drinkware, serveware and décor — hand-hammered and polished finishes.",
    href: "/products?material=Copper",
    img: "/home/material-copper.jpg",
    alt: "Copper jug styled with flowers on a wooden table — copper products from New Look Impex",
  },
  {
    title: "Brass",
    text: "Urlis, diyas, lanterns, kitchenware and décor in classic and contemporary finishes.",
    href: "/products?material=Brass",
    img: "/home/material-brass.jpg",
    alt: "Engraved brass water jug and glasses on a tray — brass products from New Look Impex",
  },
  {
    title: "Bronze & Kansa",
    text: "Traditional kansa tableware, thali sets and serveware — the heritage alloy of Indian kitchens.",
    href: "/products",
    img: null,
    alt: "",
  },
];

/** Blueprint 13 — Craft Journal cards (routes to the existing blog). */
const JOURNAL_CARDS = [
  {
    img: "/home/journal-styling.jpg",
    title: "How to Style Brass Home Decor",
    text: "Modern and traditional Indian homes — styling tips that sell.",
    href: "/blog",
    alt: "Dining table styled with a copper pitcher and brass candlesticks — New Look Impex craft journal",
  },
  {
    img: "/home/journal-gifting.jpg",
    title: "Brass Gift Ideas for Weddings",
    text: "Housewarmings, festivals and corporate gifting inspiration.",
    href: "/blog",
    alt: "Brass dinner set arranged with lit diyas and marigold — gifting inspiration from New Look Impex",
  },
  {
    img: "/home/journal-kansa.jpg",
    title: "Kansa Dinner Set Buying Guide",
    text: "What to look for before you buy bronze dinnerware.",
    href: "/blog",
    alt: "Hand-hammered brass kettle with cups on a tray — buying guides from New Look Impex, Moradabad",
  },
];

/** Blueprint 12 — international markets; each maps to an existing country SEO page. */
const EXPORT_MARKETS: { code: string; label: string; href: string }[] = [
  { code: "US", label: "United States", href: "/usa" },
  { code: "GB", label: "United Kingdom", href: "/uk" },
  { code: "AE", label: "United Arab Emirates", href: "/uae" },
  { code: "AU", label: "Australia", href: "/au" },
  { code: "CA", label: "Canada", href: "/canada" },
  { code: "SA", label: "Saudi Arabia", href: "/saudi-arabia" },
  { code: "JP", label: "Japan", href: "/japan" },
  { code: "SG", label: "Singapore", href: "/singapore" },
  { code: "CH", label: "Switzerland", href: "/europe/switzerland" },
  { code: "EU", label: "Europe", href: "/europe" },
];

/** Blueprint 15 — seasonal campaign cards. Static copy and photography;
 *  whether a card appears is decided at runtime from the current date, so a
 *  festival that has passed is never shown as active. */
const SEASON_CARDS = [
  {
    id: "thanksgiving",
    market: "United States",
    title: "Copper & Brass Hosting Collection",
    note: "Tableware and serveware edits for the Thanksgiving and holiday hosting season.",
    img: "/home/festive-thanksgiving.jpg",
    alt: "Thanksgiving table setting with copper mugs and autumn décor — New Look Impex",
    href: "/usa",
  },
  {
    id: "christmas",
    market: "USA · UK · Europe · Canada",
    title: "Luxury Gifting & Home Décor",
    note: "Christmas gifting edits in handcrafted copper and brass.",
    img: "/home/festive-christmas.jpg",
    alt: "Copper drinkware gift set beside a decorated Christmas tree — New Look Impex",
    href: "/gifting",
  },
  {
    id: "ramadan",
    market: "United Arab Emirates",
    title: "Premium Brass Gifting",
    note: "Ramadan and Eid gifting in handcrafted brass for UAE buyers.",
    img: "/home/festive-ramadan.jpg",
    alt: "Traditional Arabic-style brass coffee pot served on a tray — gifting from New Look Impex",
    href: "/uae",
  },
  {
    id: "au-summer",
    market: "Australia",
    title: "Summer Entertaining Collection",
    note: "Bright drinkware and serveware for the Australian summer season.",
    img: "/home/festive-summer.jpg",
    alt: "Copper bottle and tumbler poured with fresh citrus — drinkware from New Look Impex",
    href: "/au",
  },
  {
    id: "mothers-day",
    market: "USA · UK",
    title: "Copper Gift Sets",
    note: "Ready-to-gift copper sets for Mother's Day and spring occasions.",
    img: "/home/festive-mothers-day.jpg",
    alt: "Copper pitcher and mug gift set on a bright table — gift sets from New Look Impex",
    href: "/gifting",
  },
  {
    id: "wedding",
    market: "Global",
    title: "Corporate & Wedding Gifting",
    note: "Bulk gifting programmes for weddings, housewarmings and corporate occasions.",
    img: "/home/festive-wedding.jpg",
    alt: "Copper jug and mugs styled with flowers for celebrations — New Look Impex",
    href: "/categories/corporate-gifting",
  },
];

type UpcomingOccasion = { card: (typeof SEASON_CARDS)[number]; label: string; ts: number };

/** Next occurrence of a recurring calendar date; rolls to the next year once passed. */
function nextAnnual(from: Date, make: (year: number) => Date): Date {
  let d = make(from.getFullYear());
  if (d < from) d = make(from.getFullYear() + 1);
  return d;
}

/** Upcoming international occasions, sorted by date. Lunar dates (Ramadan) use
 *  month-level labels only, since their exact day follows the lunar calendar. */
function getUpcomingOccasions(now: Date, cards = SEASON_CARDS): UpcomingOccasion[] {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const long = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const candidates: { id: string; ts: number; label: string }[] = [];

  // Thanksgiving (USA): fourth Thursday of November
  const thanksgiving = nextAnnual(day, (yr) => {
    const nov1 = new Date(yr, 10, 1);
    return new Date(yr, 10, 1 + ((4 - nov1.getDay() + 7) % 7) + 21);
  });
  candidates.push({ id: "thanksgiving", ts: thanksgiving.getTime(), label: long(thanksgiving) });

  // Christmas & year-end gifting: 25 December
  const christmas = nextAnnual(day, (yr) => new Date(yr, 11, 25));
  candidates.push({ id: "christmas", ts: christmas.getTime(), label: long(christmas) });

  // Ramadan & Eid (UAE): lunar — approximate early-February window, month label only
  const ramadan = nextAnnual(day, (yr) => new Date(yr, 1, 8));
  candidates.push({
    id: "ramadan",
    ts: ramadan.getTime(),
    label: ramadan.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
  });

  // Australian summer entertaining: December – February
  const auSummer = nextAnnual(day, (yr) => new Date(yr, 11, 1));
  candidates.push({
    id: "au-summer",
    ts: auSummer.getTime(),
    label: `December ${auSummer.getFullYear()} – February ${auSummer.getFullYear() + 1}`,
  });

  // Mother's Day (USA & UK): second Sunday of May
  const mothers = nextAnnual(day, (yr) => {
    const may1 = new Date(yr, 4, 1);
    return new Date(yr, 4, 1 + ((7 - may1.getDay()) % 7) + 7);
  });
  candidates.push({ id: "mothers-day", ts: mothers.getTime(), label: long(mothers) });

  // Wedding & corporate gifting — year-round, always in season (sorts last)
  candidates.push({ id: "wedding", ts: new Date(day.getFullYear(), 11, 31).getTime(), label: "Year-round" });

  const byId = new Map(cards.map((c) => [c.id, c]));
  return candidates
    .filter((c) => c.ts >= day.getTime() && byId.has(c.id))
    .sort((a, b) => a.ts - b.ts)
    .map((c) => ({ card: byId.get(c.id) as (typeof SEASON_CARDS)[number], label: c.label, ts: c.ts }));
}

/** One3:4 media card in the NLI collections gallery. Videos lazy-start via IntersectionObserver. */
function GalleryCard({ card, duplicate }: { card: GalleryCardData; duplicate?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Play only while on screen; pause (never start) outside the viewport.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          v.muted = true;
          const p = v.play();
          if (p) p.catch(() => undefined);
        } else {
          v.pause();
        }
      },
      { threshold: 0.25 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <Link
      href={card.href}
      className="group relative block w-[72vw] shrink-0 overflow-hidden rounded-sm bg-editorial-dark sm:w-[46vw] lg:w-[31vw] xl:w-[24vw]"
      tabIndex={duplicate ? -1 : undefined}
    >
      <span className="block aspect-[3/4] w-full overflow-hidden">
        {card.kind === "video" && !duplicate ? (
          <video
            ref={videoRef}
            src={card.src}
            poster={card.poster}
            preload="none"
            muted
            loop
            playsInline
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={duplicate ? card.poster : card.src}
            alt={duplicate ? "" : card.alt}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        )}
      </span>
      <span
        className="absolute inset-0 bg-gradient-to-t from-editorial-dark/85 via-editorial-dark/20 to-transparent"
        aria-hidden="true"
      />
      <span className="absolute inset-x-0 bottom-0 block p-5 md:p-6">
        <span className="block font-cormorant text-2xl text-editorial-bg md:text-[26px]">{card.title}</span>
        <span className="mt-1.5 block font-inter text-[10px] uppercase tracking-[0.26em] text-editorial-gold md:text-[11px]">
          {card.text}
        </span>
      </span>
    </Link>
  );
}

/** Section 3 — "The World of NLI Collections": seamless right-to-left auto-scrolling gallery.
 *  - rAF auto-advance over a duplicated card set (wraps at half width → no jumps/gaps)
 *  - pauses on hover, while dragging, when off screen, and when the tab is hidden
 *  - mouse drag to scrub; touch swipe via native overflow scrolling (no vertical hijack)
 *  - nav arrows + live 01—06 counter; prefers-reduced-motion disables auto-advance */
function NliCollectionsSection({ cards = GALLERY_CARDS }: { cards?: GalleryCardData[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const setRef = useRef<HTMLDivElement>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const hoverRef = useRef(false);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const inViewRef = useRef(false);
  const [index, setIndex] = useState(1);

  // Continuous slow auto-scroll with seamless wrap over the duplicated set.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const io = new IntersectionObserver(
      (entries) => {
        inViewRef.current = entries[0]?.isIntersecting ?? false;
      },
      { threshold: 0.05 }
    );
    io.observe(track);
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(t - last, 64); // clamp so a sleeping tab doesn't jump on wake
      last = t;
      if (reduce.matches || hoverRef.current || draggingRef.current || !inViewRef.current || document.hidden) return;
      const width = setRef.current?.offsetWidth ?? 0;
      if (width <= 0) return;
      track.scrollLeft += (30 * dt) / 1000; // ~30 px/s — slow, editorial pace, refresh-rate independent
      if (track.scrollLeft >= width) track.scrollLeft -= width;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);

  // Tear down any in-flight drag listeners on unmount.
  useEffect(() => () => dragCleanupRef.current?.(), []);

  const handleScroll = () => {
    const track = trackRef.current;
    const set = setRef.current;
    if (!track || !set) return;
    const setWidth = set.offsetWidth;
    if (setWidth <= 0) return;
    const step = setWidth / cards.length;
    const pos = track.scrollLeft % setWidth;
    setIndex(Math.min(cards.length, Math.floor(pos / step) + 1));
  };

  const scrollByCards = (dir: 1 | -1) => {
    const track = trackRef.current;
    const set = setRef.current;
    if (!track || !set) return;
    track.scrollBy({ left: dir * (set.offsetWidth / cards.length), behavior: "smooth" });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return; // touch keeps native swipe scrolling
    const track = trackRef.current;
    if (!track) return;
    draggingRef.current = true;
    movedRef.current = false;
    const startX = e.clientX;
    const startScroll = track.scrollLeft;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      if (Math.abs(dx) > 5) movedRef.current = true;
      track.scrollLeft = startScroll - dx;
    };
    const up = () => {
      draggingRef.current = false;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      dragCleanupRef.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    dragCleanupRef.current = up;
  };

  // Swallow the click that ends a drag so cards don't navigate accidentally.
  const handleClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (movedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      movedRef.current = false;
    }
  };

  return (
    <section className="section border-t border-editorial-ink/10 bg-editorial-bg" aria-labelledby="nli-collections-heading">
      <div className="container-x">
        <div className="flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="font-inter text-[10px] uppercase tracking-[0.3em] text-editorial-accent md:text-[11px]">
              Discover our craft · NLI Collections
            </p>
            <h2 id="nli-collections-heading" className="mt-4 font-cormorant text-4xl text-editorial-ink md:text-5xl">
              A closer look at the art of metalcraft.
            </h2>
            <p className="mt-4 font-inter text-sm leading-relaxed text-editorial-ink/70 md:text-base">
              From the hands of Moradabad artisans to beautifully crafted spaces around the world.
            </p>
          </div>

          <div className="flex items-center gap-5">
            <span className="hidden whitespace-nowrap font-inter text-[10px] uppercase tracking-[0.28em] text-editorial-ink/55 sm:inline md:text-[11px]">
              Scroll to explore
              <span className="ml-1.5 text-editorial-accent" aria-hidden="true">→</span>
            </span>
            <div className="flex items-center gap-2" role="group" aria-label="Gallery navigation">
              <button
                type="button"
                onClick={() => scrollByCards(-1)}
                aria-label="Previous gallery cards"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-editorial-ink/25 text-editorial-ink/70 transition-colors hover:border-editorial-accent hover:text-editorial-accent"
              >
                <span aria-hidden="true">←</span>
              </button>
              <button
                type="button"
                onClick={() => scrollByCards(1)}
                aria-label="Next gallery cards"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-editorial-ink/25 text-editorial-ink/70 transition-colors hover:border-editorial-accent hover:text-editorial-accent"
              >
                <span aria-hidden="true">→</span>
              </button>
            </div>
            <span className="whitespace-nowrap font-inter text-[11px] uppercase tracking-[0.2em] tabular-nums text-editorial-ink/70">
              <span className="text-editorial-ink">{String(index).padStart(2, "0")}</span>
              <span className="mx-1 text-editorial-ink/40">—</span>
              <span>{String(cards.length).padStart(2, "0")}</span>
            </span>
          </div>
        </div>

        <div
          ref={trackRef}
          onScroll={handleScroll}
          onMouseEnter={() => {
            hoverRef.current = true;
          }}
          onMouseLeave={() => {
            hoverRef.current = false;
          }}
          onPointerDown={handlePointerDown}
          onClickCapture={handleClickCapture}
          className="mt-10 flex select-none overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="NLI collections gallery"
        >
          {/* First set (real media) + mirrored set for a seamless loop; duplicate videos render as posters. */}
          <div ref={setRef} className="flex shrink-0 gap-5 pr-5">
            {cards.map((card) => (
              <GalleryCard key={`${card.href}-${card.src}`} card={card} />
            ))}
          </div>
          <div className="flex shrink-0 gap-5 pr-5" aria-hidden="true">
            {cards.map((card) => (
              <GalleryCard key={`dup-${card.href}-${card.src}`} card={card} duplicate />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomeClient({
  initialCategories = null,
  initialFeatured = null,
  initialHero = null,
}: {
  initialCategories?: Category[] | null;
  initialFeatured?: ProductCardType[] | null;
  initialHero?: Record<string, any> | null;
}) {
  const [categories, setCategories] = useState<Category[] | null>(initialCategories);
  const [featured, setFeatured] = useState<ProductCardType[] | null>(initialFeatured);
  const [dataError, setDataError] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingOccasion[] | null>(null);
  const [subEmail, setSubEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const [subStatus, setSubStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const lead = useLeadMarket();

  // Admin-editable content. Each section falls back to the site default when
  // nothing has been customised in Site Control.
  const [content, setContent] = useState<Record<string, any>>(
    initialHero ? { hero: initialHero } : {}
  );
  const [faqs, setFaqs] = useState<{ q: string; a: string }[]>(HOME_FAQ);
  const [banners, setBanners] = useState<Banner[]>([]);
  useEffect(() => {
    api<Record<string, any>>("/api/public/site-content")
      .then((c) => {
        setContent(c || {});
        if (Array.isArray(c?.home_faq) && c.home_faq.length) {
          setFaqs(c.home_faq.map((f: any) => ({ q: String(f.q || ""), a: String(f.a || "") })));
        }
      })
      .catch(() => undefined);
    api<{ items: Banner[] }>("/api/public/banners?placement=home_hero")
      .then((d) => setBanners(d.items || []))
      .catch(() => undefined);
  }, []);
  const arr = <T,>(k: string, fallback: T[]): T[] => (Array.isArray(content[k]) && content[k].length ? (content[k] as T[]) : fallback);
  const metalcraftCards = arr("metalcraft_cards", METALCRAFT_CARDS);
  const giftCards = arr("gift_cards", GIFT_CARDS);
  const galleryCards = arr("gallery_cards", GALLERY_CARDS) as GalleryCardData[];
  const mfgBlocks = arr("mfg_blocks", MFG_BLOCKS);
  const materialTiles = arr("material_tiles", MATERIAL_TILES);
  const journalCards = arr("journal_cards", JOURNAL_CARDS);
  const exportMarkets = arr("export_markets", EXPORT_MARKETS);
  const seasonCards = arr("season_cards", SEASON_CARDS);
  const hero = content.hero && typeof content.hero === "object" ? content.hero : null;
  // Load the hero video only after the page is interactive. The lightweight
  // poster image is the LCP element, so a 1.5 MB MP4 never blocks first paint.
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  useEffect(() => {
    const url = hero?.video || "/hero-a.mp4";
    const id = window.setTimeout(() => setVideoSrc(url), 500);
    return () => window.clearTimeout(id);
  }, [hero?.video]);
  const marqueeText = typeof content.marquee?.text === "string" ? content.marquee.text : null;
  const marqueeItems: string[] = marqueeText
    ? marqueeText.split("|").map((s: string) => s.trim()).filter(Boolean)
    : ["Handcrafted", "Moradabad Brass", "Copper Creations", "Indian Craftsmanship", "Worldwide Exports", "Made in India"];
  const cContact = content.contact && typeof content.contact === "object" ? content.contact : null;
  const splitList = (v: any, fallback: string[]): string[] => Array.isArray(v) ? v.map(String) : (v ? String(v).split("|").map((s) => s.trim()).filter(Boolean) : fallback);
  const cAddress = cContact?.address || "New Look Impex, Ganga Mandir, Thana Nagphani Road, Kisrol, Moradabad – 244001, Uttar Pradesh, India";
  const cPhones = splitList(cContact?.phones, ["+91 9808588603"]);
  const cEmails = splitList(cContact?.emails, ["newlookimpex130@gmail.com", "newlookimpex@gmail.com"]);
  const cWhatsapp = cContact?.whatsapp || "+91 96900 53913";
  const cGstin = cContact?.gstin || "09AFKPA4462R1ZW";

  const subscribe = (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribing(true);
    setSubStatus(null);
    api<unknown>("/api/public/enquiries", {
      method: "POST",
      body: JSON.stringify({
        name: "Newsletter Subscriber",
        email: subEmail,
        product_interest: "Newsletter subscription",
        message: "Please subscribe me to the New Look Impex wholesale trade bulletin (new products, offers, catalog releases).",
        preferred_currency: lead.preferred_currency,
        ...(lead.country ? { country: lead.country } : {}),
        consent: true,
        landing_page: "homepage-newsletter",
      }),
    })
      .then(() => {
        setSubStatus({ ok: true, text: "✓ Subscribed! Your details were sent to our team — we'll email the trade bulletin." });
        setSubEmail("");
      })
      .catch((err) => {
        const msg = String(err);
        setSubStatus({ ok: msg.includes("409"), text: msg.includes("409") ? "You're already subscribed — thank you!" : "Could not subscribe. Please email newlookimpex130@gmail.com." });
      })
      .finally(() => setSubscribing(false));
  };

  useEffect(() => {
    let cancelled = false;
    setDataError("");
    const catsTask = initialCategories
      ? Promise.resolve({ items: initialCategories })
      : api<{ items: Category[] }>("/api/public/categories");
    const featsTask = initialFeatured
      ? Promise.resolve({ items: initialFeatured })
      : api<{ items: ProductCardType[] }>("/api/public/products?sort=featured&page_size=24");
    Promise.allSettled([catsTask, featsTask]).then((results) => {
      if (cancelled) return;
      const [cats, feats] = results;
      if (cats.status === "fulfilled") setCategories(cats.value.items || []);
      if (feats.status === "fulfilled") setFeatured(feats.value.items || []);
      if ((!initialCategories && cats.status === "rejected") || (!initialFeatured && feats.status === "rejected")) {
        setDataError("Some sections could not be loaded.");
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Seasonal edit — compute upcoming occasions after mount so the server HTML
  // and the client render can never disagree about today's date.
  useEffect(() => {
    setUpcoming(getUpcomingOccasions(new Date(), seasonCards));
  }, [content.season_cards]);

  const retry = () => {
    setCategories(null); setFeatured(null); setDataError("");
    api<{ items: Category[] }>("/api/public/categories").then((d) => setCategories(d.items || [])).catch((e) => setDataError(String(e)));
    api<{ items: ProductCardType[] }>("/api/public/products?sort=featured&page_size=8").then((d) => setFeatured(d.items || [])).catch((e) => setDataError(String(e)));
  };

  // Derived product groups so each homepage section shows clean, non-repeating items
  const ft = featured || [];
  const copperAll = ft.filter((p) => p.material === "Copper");
  const brassAll = ft.filter((p) => p.material === "Brass");
  const toFullUrl = (u?: string | null) =>
    u ? (u.startsWith("http") ? u : `https://new-look-impex-api.onrender.com${u}`) : null;
  // Best Sellers & Trending interleave copper and brass records so neither
  // grid ever splits by metal (blueprint rule).
  const mixMetals = (c: ProductCardType[], b: ProductCardType[], total: number) => {
    const out: ProductCardType[] = [];
    let ci = 0;
    let bi = 0;
    while (out.length < total && (ci < c.length || bi < b.length)) {
      if (ci < c.length) out.push(c[ci++]);
      if (out.length < total && bi < b.length) out.push(b[bi++]);
    }
    return out;
  };
  const mixedBest = mixMetals(copperAll, brassAll, 8);
  const mixedTrend = mixMetals(copperAll.slice(4), brassAll.slice(4), 8);

  return (
    <>
      {/* Hero — full-bleed video, editorial first fold */}
      <section className="relative isolate overflow-hidden bg-editorial-dark text-editorial-bg">
        {/* Lightweight hero image is the LCP element; the video loads after
            hydration and fades in over it, so slow connections paint fast. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={hero?.poster || "/hero-brass-kitchen.jpg"}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-[1.09] object-cover"
          fetchPriority="high"
        />
        <video
          className={`absolute inset-0 h-full w-full scale-[1.09] object-cover transition-opacity duration-700 ${videoSrc ? "opacity-100" : "opacity-0"}`}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          aria-hidden="true"
          tabIndex={-1}
        >
          {videoSrc && <source src={videoSrc} type="video/mp4" />}
          <track kind="captions" srcLang="en" label="No captions — decorative background video" />
        </video>
        <div className="absolute inset-0 bg-editorial-dark/55" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-editorial-dark/70 to-transparent" aria-hidden="true" />

        <div className="relative container-x flex flex-col items-center py-20 text-center md:py-28 lg:py-36">
          <p className="font-inter text-[10px] uppercase tracking-[0.34em] text-editorial-gold md:text-[11px]">
            The Art of Metalcraft · Moradabad, India
          </p>
          <h1 className="mt-5 max-w-4xl font-cormorant text-4xl font-medium leading-[1.08] text-editorial-bg sm:text-5xl md:text-6xl lg:text-7xl">
            {hero?.headline || "Crafted in India. Connecting Globally."}
          </h1>
          <p className="mt-5 max-w-xl font-inter text-sm leading-relaxed text-editorial-bg/85 md:text-base">
            {hero?.subline || "Discover timeless copper and brass creations, shaped by India's rich artisan heritage."}
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/collections"
              className="group inline-flex items-center gap-2 bg-editorial-emerald px-7 py-3.5 font-inter text-[11px] uppercase tracking-[0.2em] text-editorial-bg transition-colors hover:bg-emerald-dark"
            >
              Explore Collections
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
            <Link
              href="/request-quote"
              className="inline-flex items-center gap-2 border border-editorial-bg/60 px-7 py-3.5 font-inter text-[11px] uppercase tracking-[0.2em] text-editorial-bg transition-colors hover:border-editorial-bg hover:bg-editorial-bg/10"
            >
              Wholesale Enquiry
            </Link>
          </div>
        </div>
      </section>

      {/* Scrolling craftsmanship strip */}
      <div className="overflow-hidden border-y border-editorial-ink/10 bg-editorial-bg py-3" role="marquee" aria-label="Craftsmanship highlights">
        <div className="flex w-max animate-nli-marquee hover:[animation-play-state:paused]">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1 ? "true" : undefined}>
              {marqueeItems.map((item) => (
                <span key={item} className="flex items-center">
                  <span className="whitespace-nowrap px-5 font-inter text-[10px] uppercase tracking-[0.28em] text-editorial-ink/70 md:text-[11px]">
                    {item}
                  </span>
                  <span className="text-editorial-gold" aria-hidden="true">·</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Admin-managed banners (with optional start/end scheduling) */}
      {banners.length > 0 && (
        <section className="border-b border-editorial-ink/10 bg-editorial-bg" aria-label="Featured banners">
          <div className="container-x grid gap-4 py-6 md:grid-cols-2">
            {banners.map((b) => (
              <div key={b.id} className="relative overflow-hidden rounded-lg bg-editorial-secondary">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.image_url} alt={b.title || "Featured banner"} className="h-44 w-full object-cover" />
                {(b.title || b.subtitle || b.cta_text) && (
                  <div className="p-4">
                    {b.title && <h3 className="font-cormorant text-xl text-editorial-ink">{b.title}</h3>}
                    {b.subtitle && <p className="text-sm text-editorial-ink/70">{b.subtitle}</p>}
                    {b.cta_link && b.cta_text && (
                      <Link href={b.cta_link} className="link mt-2 inline-block text-sm">{b.cta_text} →</Link>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── The Art of Indian Metalcraft — editorial category cards ── */}
      <section className="section bg-editorial-bg" aria-labelledby="art-of-metalcraft">
        <div className="container-x">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-inter text-[10px] uppercase tracking-[0.3em] text-editorial-accent md:text-[11px]">
              Browse the Collections
            </p>
            <h2 id="art-of-metalcraft" className="mt-4 font-cormorant text-4xl text-editorial-ink md:text-5xl">
              The Art of Indian Metalcraft
            </h2>
            <p className="mt-3 font-cormorant text-xl italic text-editorial-ink/70 md:text-2xl">
              Every detail tells a story.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 md:gap-6">
            {metalcraftCards.map((c) => (
              <Link
                key={c.href + c.img}
                href={c.href}
                className="group relative block overflow-hidden rounded-sm bg-editorial-dark"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.img}
                  alt={c.alt}
                  loading="lazy"
                  className="aspect-[4/5] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-editorial-dark/85 via-editorial-dark/25 to-transparent" aria-hidden="true" />
                <span className="absolute inset-x-0 bottom-0 block p-6 md:p-8">
                  <span className="block font-inter text-[10px] uppercase tracking-[0.28em] text-editorial-gold">
                    {c.category}
                  </span>
                  <span className="mt-2 block font-cormorant text-2xl text-editorial-bg md:text-3xl">
                    {c.title}
                  </span>
                  <span className="mt-4 inline-flex items-center gap-2 border-b border-editorial-bg/40 pb-1 font-inter text-[11px] uppercase tracking-[0.2em] text-editorial-bg transition-colors group-hover:border-editorial-gold group-hover:text-editorial-gold">
                    {c.cta}
                    <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                  </span>
                </span>
              </Link>
            ))}
          </div>

          <p className="mt-10 text-center font-inter text-[10px] uppercase tracking-[0.28em] text-editorial-ink/60 md:text-[11px]">
            Handcrafted in Moradabad, India <span className="text-editorial-gold" aria-hidden="true">·</span> Designed for homes worldwide
          </p>
        </div>
      </section>

      {/* ── Corporate & Festive Gifting ── */}
      <section className="section border-t border-editorial-ink/10 bg-editorial-bg" aria-labelledby="gifts-heading">
        <div className="container-x">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-inter text-[10px] uppercase tracking-[0.3em] text-editorial-accent md:text-[11px]">
              NLI Collections · Gifting
            </p>
            <h2 id="gifts-heading" className="mt-4 font-cormorant text-4xl text-editorial-ink md:text-5xl">
              Gifts That Leave a Lasting Impression
            </h2>
            <p className="mt-4 font-inter text-sm leading-relaxed text-editorial-ink/70 md:text-base">
              Thoughtfully crafted copper and brass creations for corporate gifting, festive celebrations and meaningful occasions.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {giftCards.map((c) => (
              <Link key={c.href + c.img} href={c.href} className="group block">
                <span className="block overflow-hidden rounded-sm bg-sand">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.img}
                    alt={c.alt}
                    loading="lazy"
                    className="aspect-[4/5] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </span>
                <h3 className="mt-4 font-cormorant text-2xl text-editorial-ink">{c.title}</h3>
                <p className="mt-1.5 font-inter text-sm leading-relaxed text-editorial-ink/70">{c.text}</p>
                <span className="mt-3 inline-block border-b border-editorial-accent/40 pb-0.5 font-inter text-[11px] uppercase tracking-[0.18em] text-editorial-accent transition-colors group-hover:border-editorial-accent">
                  {c.cta}
                  <span aria-hidden="true" className="ml-1 inline-block transition-transform group-hover:translate-x-1">→</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── The World of NLI Collections — auto-scrolling image + video gallery ── */}
      <NliCollectionsSection cards={galleryCards} />

      {/* ── 6. Best Sellers — mixed copper & brass buyer favourites ── */}
      <section className="section border-t border-editorial-ink/10 bg-editorial-bg" aria-labelledby="best-sellers">
        <div className="container-x">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-inter text-[10px] uppercase tracking-[0.3em] text-editorial-accent md:text-[11px]">
              NLI Collections · Buyer Favourites
            </p>
            <h2 id="best-sellers" className="mt-4 font-cormorant text-4xl text-editorial-ink md:text-5xl">
              Best Sellers
            </h2>
            <p className="mt-3 font-inter text-sm leading-relaxed text-editorial-ink/70 md:text-base">
              Discover our handcrafted copper and brass kitchenware, serving essentials and timeless creations.
            </p>
          </div>

          {featured === null ? (
            <div className="mt-10">
              <Loading label="Loading best sellers…" />
            </div>
          ) : mixedBest.length === 0 ? (
            <p className="mt-10 text-center font-inter text-sm text-editorial-ink/60">
              Products will appear here once published.
            </p>
          ) : (
            <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
              {mixedBest.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          <div className="mt-10 text-center">
            <Link
              href="/products"
              className="group inline-flex items-center gap-2 border-b border-editorial-ink/30 pb-1 font-inter text-[11px] uppercase tracking-[0.2em] text-editorial-ink transition-colors hover:border-editorial-accent hover:text-editorial-accent"
            >
              Explore All Products
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 7. Trending Products — honest team selection while analytics build up ── */}
      <section className="section border-t border-editorial-ink/10 bg-editorial-secondary" aria-labelledby="trending-products">
        <div className="container-x">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-inter text-[10px] uppercase tracking-[0.3em] text-editorial-accent md:text-[11px]">
              Trending · Selected by Our Team
            </p>
            <h2 id="trending-products" className="mt-4 font-cormorant text-4xl text-editorial-ink md:text-5xl">
              Trending Products
            </h2>
            <p className="mt-3 font-inter text-sm leading-relaxed text-editorial-ink/70 md:text-base">
              A rotating team selection from our current featured catalogue — shown while product-view analytics
              build up. No fabricated rankings, just pieces from our most-wanted ranges.
            </p>
            <span className="mt-4 inline-block border border-editorial-accent/40 px-3 py-1 font-inter text-[10px] uppercase tracking-[0.22em] text-editorial-accent">
              Team Picks · Not analytics-ranked yet
            </span>
          </div>

          {featured === null ? (
            <div className="mt-10">
              <Loading label="Loading trending products…" />
            </div>
          ) : mixedTrend.length === 0 ? (
            <p className="mt-10 text-center font-inter text-sm text-editorial-ink/60">
              Products will appear here once published.
            </p>
          ) : (
            <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
              {mixedTrend.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          <div className="mt-10 text-center">
            <Link
              href="/products"
              className="group inline-flex items-center gap-2 border-b border-editorial-ink/30 pb-1 font-inter text-[11px] uppercase tracking-[0.2em] text-editorial-ink transition-colors hover:border-editorial-accent hover:text-editorial-accent"
            >
              View the Full Catalogue
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 8. Shop by Category — visual category browsing ── */}
      <section className="section border-t border-editorial-ink/10 bg-editorial-bg" aria-labelledby="shop-by-category">
        <div className="container-x">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-inter text-[10px] uppercase tracking-[0.3em] text-editorial-accent md:text-[11px]">
              Browse the Catalogue
            </p>
            <h2 id="shop-by-category" className="mt-4 font-cormorant text-4xl text-editorial-ink md:text-5xl">
              Shop by Category
            </h2>
            <p className="mt-3 font-inter text-sm leading-relaxed text-editorial-ink/70 md:text-base">
              Ten ways into the collection — copper with copper, brass with brass, from everyday cookware to
              festive gifting. Each tile opens straight onto the products.
            </p>
          </div>

          <ShopByCategory />

          <p className="mt-4 text-center font-inter text-[10px] uppercase tracking-[0.28em] text-editorial-ink/55 md:text-[11px]">
            Manufactured in Moradabad <span className="text-editorial-gold" aria-hidden="true">·</span> Supplied worldwide
          </p>
        </div>
      </section>

      {/* ── 9. NLI Collections — Our Story ── */}
      <section className="section border-t border-editorial-ink/10 bg-editorial-secondary" aria-labelledby="our-story">
        <div className="container-x">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/home/story-artisan.jpg"
                alt="Moradabad artisan handcrafting brass pieces in his workshop — New Look Impex manufacturing"
                loading="lazy"
                className="aspect-[4/5] w-full rounded-sm object-cover"
              />
              <span className="absolute -bottom-4 left-4 hidden bg-editorial-dark px-5 py-3 font-inter text-[10px] uppercase tracking-[0.24em] text-editorial-gold sm:block md:left-6">
                Moradabad · Uttar Pradesh · India
              </span>
            </div>

            <div>
              <p className="font-inter text-[10px] uppercase tracking-[0.3em] text-editorial-accent md:text-[11px]">
                New Look Impex · Our Heritage
              </p>
              <h2 id="our-story" className="mt-4 font-cormorant text-4xl leading-[1.1] text-editorial-ink md:text-5xl">
                From Moradabad to the World: The Legacy of Brass Handicrafts
              </h2>
              <p className="mt-5 font-inter text-sm leading-relaxed text-editorial-ink/75 md:text-base">
                New Look Impex is your gateway to the timeless world of Indian brass and copper craftsmanship.
                From traditional metalworking to contemporary kitchenware and home décor, we bring together
                carefully curated creations shaped by the skills of Moradabad artisans.
              </p>
              <p className="mt-4 font-inter text-sm leading-relaxed text-editorial-ink/75 md:text-base">
                Our collections celebrate the beauty, versatility and enduring appeal of copper and brass.
                We connect Indian craftsmanship with international retailers, wholesalers, importers and design
                businesses through manufacturing, customization and export services.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {["Manufacturer", "Wholesaler", "Exporter"].map((t) => (
                  <span key={t} className="border border-editorial-ink/25 px-3 py-1.5 font-inter text-[10px] uppercase tracking-[0.2em] text-editorial-ink/70">
                    {t}
                  </span>
                ))}
              </div>

              <div className="mt-8">
                <Link
                  href="/about"
                  className="group inline-flex items-center gap-2 border-b border-editorial-accent/50 pb-1 font-inter text-[11px] uppercase tracking-[0.2em] text-editorial-accent transition-colors hover:border-editorial-accent"
                >
                  Discover Our Story
                  <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 10. Our Manufacturing Excellence — eight capability blocks ── */}
      <section className="section border-t border-editorial-ink/10 bg-editorial-bg" aria-labelledby="manufacturing-excellence">
        <div className="container-x">
          <div className="grid items-end gap-8 md:grid-cols-2">
            <div>
              <p className="font-inter text-[10px] uppercase tracking-[0.3em] text-editorial-accent md:text-[11px]">
                Capabilities · From Sample to Shipment
              </p>
              <h2 id="manufacturing-excellence" className="mt-4 font-cormorant text-4xl text-editorial-ink md:text-5xl">
                Our Manufacturing Excellence
              </h2>
            </div>
            <p className="font-inter text-sm leading-relaxed text-editorial-ink/70 md:text-base">
              Every order moves through a clear, documented process — from your first brief to freight
              coordination at the destination. Eight capabilities, one accountable team in Moradabad.
            </p>
          </div>

          <div className="mt-10 overflow-hidden rounded-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/home/manufacturing-artisan.jpg"
              alt="Artisan engraving a brass piece at the workbench — manufacturing at New Look Impex, Moradabad"
              loading="lazy"
              className="h-56 w-full object-cover md:h-72 lg:h-80"
            />
          </div>

          <div className="mt-10 grid gap-px overflow-hidden border border-editorial-ink/10 bg-editorial-ink/10 sm:grid-cols-2 lg:grid-cols-4">
            {mfgBlocks.map((b) => (
              <div key={b.num} className="bg-editorial-bg p-6 transition-colors hover:bg-editorial-secondary">
                <span className="font-cormorant text-3xl text-editorial-gold" aria-hidden="true">{b.num}</span>
                <h3 className="mt-2 font-cormorant text-xl text-editorial-ink">{b.title}</h3>
                <p className="mt-2 font-inter text-[13px] leading-relaxed text-editorial-ink/70">{b.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/customisation"
              className="inline-flex items-center gap-2 bg-editorial-ink px-7 py-3.5 font-inter text-[11px] uppercase tracking-[0.2em] text-editorial-bg transition-colors hover:bg-editorial-accent"
            >
              Custom Manufacturing
            </Link>
            <Link
              href="/wholesale"
              className="inline-flex items-center gap-2 border border-editorial-ink/30 px-7 py-3.5 font-inter text-[11px] uppercase tracking-[0.2em] text-editorial-ink transition-colors hover:border-editorial-ink hover:bg-editorial-ink hover:text-editorial-bg"
            >
              Wholesale &amp; Bulk Orders
            </Link>
          </div>
        </div>
      </section>

      {/* ── 11. Shop by Material ── */}
      <section className="section border-t border-editorial-ink/10 bg-editorial-secondary" aria-labelledby="shop-by-material">
        <div className="container-x">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-inter text-[10px] uppercase tracking-[0.3em] text-editorial-accent md:text-[11px]">
              Browse by Metal
            </p>
            <h2 id="shop-by-material" className="mt-4 font-cormorant text-4xl text-editorial-ink md:text-5xl">
              Shop by Material
            </h2>
            <p className="mt-3 font-inter text-sm leading-relaxed text-editorial-ink/70 md:text-base">
              Copper, brass and traditional kansa — three metals, each with its own character and craft.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {materialTiles.map((m) =>
              m.img ? (
                <Link key={m.title} href={m.href} className="group block">
                  <span className="block overflow-hidden rounded-sm bg-sand">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.img}
                      alt={m.alt}
                      loading="lazy"
                      className="aspect-[4/3] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  </span>
                  <h3 className="mt-4 font-cormorant text-2xl text-editorial-ink">{m.title}</h3>
                  <p className="mt-1.5 font-inter text-sm leading-relaxed text-editorial-ink/70">{m.text}</p>
                  <span className="mt-3 inline-block border-b border-editorial-accent/40 pb-0.5 font-inter text-[11px] uppercase tracking-[0.18em] text-editorial-accent transition-colors group-hover:border-editorial-accent">
                    Explore <span aria-hidden="true" className="ml-1 inline-block transition-transform group-hover:translate-x-1">→</span>
                  </span>
                </Link>
              ) : (
                <Link
                  key={m.title}
                  href={m.href}
                  className="group flex aspect-[4/3] flex-col justify-end rounded-sm bg-editorial-dark p-6 transition-colors hover:bg-editorial-ink md:aspect-auto md:min-h-[19rem]"
                >
                  <span className="font-inter text-[10px] uppercase tracking-[0.26em] text-editorial-gold">Traditional alloy</span>
                  <h3 className="mt-2 font-cormorant text-3xl text-editorial-bg">{m.title}</h3>
                  <p className="mt-2 font-inter text-sm leading-relaxed text-editorial-bg/75">{m.text}</p>
                  <span className="mt-4 inline-flex items-center gap-2 font-inter text-[11px] uppercase tracking-[0.2em] text-editorial-gold">
                    Explore <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                  </span>
                </Link>
              )
            )}
          </div>
        </div>
      </section>

      {/* ── 12. International Wholesale & Export ── */}
      <section className="section border-t border-editorial-ink/10 bg-editorial-dark text-editorial-bg" aria-labelledby="export-markets">
        <div className="container-x">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-inter text-[10px] uppercase tracking-[0.3em] text-editorial-gold md:text-[11px]">
              Global Trade · Manufacturer &amp; Exporter
            </p>
            <h2 id="export-markets" className="mt-4 font-cormorant text-4xl text-editorial-bg md:text-5xl">
              International Wholesale &amp; Export
            </h2>
            <p className="mt-4 font-inter text-sm leading-relaxed text-editorial-bg/75 md:text-base">
              New Look Impex (NLI Collections) is a brass and copper products manufacturer and exporter based in
              Moradabad, Uttar Pradesh, India. We accept B2B bulk orders, OEM / private label manufacturing, and
              export enquiries from retailers, importers, distributors and corporate buyers worldwide.
            </p>
          </div>

          <div className="mt-10 overflow-hidden rounded-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/home/export-banner.jpg"
              alt="Brass serveware collection arranged for export — New Look Impex, Moradabad"
              loading="lazy"
              className="h-40 w-full object-cover md:h-56"
            />
          </div>

          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {exportMarkets.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className="group border border-editorial-bg/15 p-5 text-center transition-colors hover:border-editorial-gold hover:bg-editorial-bg/5"
              >
                <span className="block font-cormorant text-3xl text-editorial-gold" aria-hidden="true">{m.code}</span>
                <span className="mt-2 block font-inter text-[11px] uppercase tracking-[0.16em] text-editorial-bg/85">{m.label}</span>
                <span className="mt-3 block font-inter text-[10px] uppercase tracking-[0.2em] text-editorial-bg/55 transition-colors group-hover:text-editorial-gold">
                  Buyer guide →
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-10 grid gap-6 border-t border-editorial-bg/15 pt-8 md:grid-cols-2">
            <div>
              <h3 className="font-cormorant text-2xl text-editorial-bg">Wholesale Enquiries</h3>
              <ul className="mt-3 space-y-1.5 font-inter text-sm text-editorial-bg/75">
                <li>{cAddress}</li>
                {cPhones.map((p: string) => (
                  <li key={p}>
                    <a className="underline underline-offset-4 transition-colors hover:text-editorial-gold" href={`tel:${p.replace(/\D/g, "")}`}>{p}</a>
                  </li>
                ))}
                <li>
                  {cEmails.map((e: string, i: number) => (
                    <span key={e}>{i > 0 && " · "}<a className="underline underline-offset-4 transition-colors hover:text-editorial-gold" href={`mailto:${e}`}>{e}</a></span>
                  ))}
                </li>
                <li>
                  <a
                    className="underline underline-offset-4 transition-colors hover:text-editorial-gold"
                    href={`https://wa.me/${cWhatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WhatsApp Business: {cWhatsapp}
                  </a>
                </li>
                <li className="font-inter text-[11px] uppercase tracking-wider text-editorial-bg/50">
                  GSTIN: {cGstin}
                </li>
              </ul>
            </div>
            <div className="flex flex-wrap items-start gap-3 md:justify-end">
              <Link
                href="/wholesale"
                className="inline-flex items-center gap-2 bg-editorial-bg px-6 py-3.5 font-inter text-[11px] uppercase tracking-[0.2em] text-editorial-ink transition-colors hover:bg-white"
              >
                Wholesale Enquiries
              </Link>
              <Link
                href="/request-quote"
                className="inline-flex items-center gap-2 border border-editorial-bg/60 px-6 py-3.5 font-inter text-[11px] uppercase tracking-[0.2em] text-editorial-bg transition-colors hover:border-editorial-bg hover:bg-editorial-bg/10"
              >
                Request a Quote
              </Link>
              <a
                href="https://wa.me/919690053913"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-editorial-gold/70 px-6 py-3.5 font-inter text-[11px] uppercase tracking-[0.2em] text-editorial-gold transition-colors hover:bg-editorial-gold hover:text-editorial-dark"
              >
                WhatsApp Business
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── 13. Buying Guides & Craft Journal ── */}
      <section className="section border-t border-editorial-ink/10 bg-editorial-bg" aria-labelledby="craft-journal">
        <div className="container-x">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-inter text-[10px] uppercase tracking-[0.3em] text-editorial-accent md:text-[11px]">
              Craft Journal
            </p>
            <h2 id="craft-journal" className="mt-4 font-cormorant text-4xl text-editorial-ink md:text-5xl">
              Buying Guides &amp; Product Inspiration
            </h2>
            <p className="mt-3 font-inter text-sm leading-relaxed text-editorial-ink/70 md:text-base">
              How to style brass home décor, gift ideas for weddings and festivals, kansa dinner set buying
              guides — everything you need to buy with confidence.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {journalCards.map((j) => (
              <Link key={j.title} href={j.href} className="group block">
                <span className="block overflow-hidden rounded-sm bg-sand">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={j.img}
                    alt={j.alt}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </span>
                <h3 className="mt-4 font-cormorant text-2xl text-editorial-ink transition-colors group-hover:text-editorial-accent">
                  {j.title}
                </h3>
                <p className="mt-2 font-inter text-sm leading-relaxed text-editorial-ink/70">{j.text}</p>
                <span className="mt-3 inline-block border-b border-editorial-accent/40 pb-0.5 font-inter text-[11px] uppercase tracking-[0.18em] text-editorial-accent transition-colors group-hover:border-editorial-accent">
                  Read <span aria-hidden="true" className="ml-1 inline-block transition-transform group-hover:translate-x-1">→</span>
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/blog"
              className="group inline-flex items-center gap-2 border-b border-editorial-ink/30 pb-1 font-inter text-[11px] uppercase tracking-[0.2em] text-editorial-ink transition-colors hover:border-editorial-accent hover:text-editorial-accent"
            >
              Read the Journal
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
            <Link
              href="/buyer-resources"
              className="group inline-flex items-center gap-2 border-b border-editorial-ink/30 pb-1 font-inter text-[11px] uppercase tracking-[0.2em] text-editorial-ink transition-colors hover:border-editorial-accent hover:text-editorial-accent"
            >
              Buyer Resources
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 14. Buyer FAQs — same copy as the FAQPage JSON-LD in page.tsx ── */}
      <section className="section border-t border-editorial-ink/10 bg-editorial-secondary" aria-labelledby="faq">
        <div className="container-x max-w-3xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-inter text-[10px] uppercase tracking-[0.3em] text-editorial-accent md:text-[11px]">
              Support · Buyer FAQs
            </p>
            <h2 id="faq" className="mt-4 font-cormorant text-4xl text-editorial-ink md:text-5xl">
              Questions from Wholesale Buyers
            </h2>
          </div>

          <div className="mt-10 border-t border-editorial-ink/15">
            {faqs.map((f, i) => (
              <div key={i} className="border-b border-editorial-ink/15">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 py-5 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  <span className="font-cormorant text-lg text-editorial-ink md:text-xl">{f.q}</span>
                  <span className="shrink-0 font-inter text-lg text-editorial-accent" aria-hidden="true">
                    {openFaq === i ? "−" : "+"}
                  </span>
                </button>
                {openFaq === i && (
                  <div className="pb-5 font-inter text-sm leading-relaxed text-editorial-ink/75">{f.a}</div>
                )}
              </div>
            ))}
          </div>

          <p className="mt-6 text-center font-inter text-[11px] uppercase tracking-[0.2em] text-editorial-ink/55">
            More questions?{" "}
            <Link href="/contact" className="text-editorial-accent underline underline-offset-4 hover:text-editorial-ink">
              Contact our team
            </Link>
          </p>
        </div>
      </section>

      {/* ── 15. International Festive Season Edit — date-aware, passed occasions never shown ── */}
      <section className="section border-t border-editorial-ink/10 bg-editorial-bg" aria-labelledby="festive-edit">
        <div className="container-x">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-inter text-[10px] uppercase tracking-[0.3em] text-editorial-accent md:text-[11px]">
              Seasonal Edit · International Buying Calendar
            </p>
            <h2 id="festive-edit" className="mt-4 font-cormorant text-4xl text-editorial-ink md:text-5xl">
              The International Festive Season Edit
            </h2>
            <p className="mt-3 font-inter text-sm leading-relaxed text-editorial-ink/70 md:text-base">
              Upcoming buying seasons for our buyers around the world — this edit shows only occasions that
              have not yet passed.
            </p>
          </div>

          {upcoming && <SeasonalCalendar items={upcoming} />}
        </div>
      </section>

      {/* ── Trade Bulletin — newsletter signup (working form, editorial restyle) ── */}
      <section className="section border-t border-editorial-ink/10 bg-editorial-secondary" aria-labelledby="newsletter">
        <div className="container-x">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-inter text-[10px] uppercase tracking-[0.3em] text-editorial-accent md:text-[11px]">
              Stay Updated
            </p>
            <h2 id="newsletter" className="mt-4 font-cormorant text-4xl text-editorial-ink md:text-5xl">
              The Trade Bulletin
            </h2>
            <p className="mt-3 font-inter text-sm leading-relaxed text-editorial-ink/70 md:text-base">
              Receive seasonal metal décor trends, trade fair schedules, and new wholesale catalog releases
              directly in your business inbox.
            </p>
            <form className="mx-auto mt-7 flex max-w-md flex-col gap-2 sm:flex-row" onSubmit={subscribe}>
              <label htmlFor="newsletter-email" className="sr-only">Email address</label>
              <input
                id="newsletter-email"
                type="email"
                className="input flex-1 !rounded-none"
                placeholder="Your business email"
                required
                value={subEmail}
                onChange={(e) => setSubEmail(e.target.value)}
              />
              <button
                type="submit"
                className="btn shrink-0 !rounded-none bg-editorial-ink px-6 text-editorial-bg hover:bg-editorial-accent"
                disabled={subscribing}
              >
                {subscribing ? "Subscribing…" : "Subscribe"}
              </button>
            </form>
            {subStatus && (
              <p className={`mt-3 text-xs font-semibold ${subStatus.ok ? "text-green-700" : "text-red-700"}`} role="status">
                {subStatus.text}
              </p>
            )}
            <p className="mt-3 font-inter text-[11px] text-editorial-ink/55">
              No spam. Unsubscribe anytime. We respect your privacy.
            </p>
          </div>
        </div>
      </section>

      {dataError && (
        <div className="container-x pb-10">
          <ErrorBox error={dataError} retry={retry} />
        </div>
      )}

    </>
  );
}