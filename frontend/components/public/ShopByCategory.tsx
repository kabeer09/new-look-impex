"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Family = "Copper" | "Brass" | "Mixed";

interface Tile {
  img: string;
  title: string;
  text: string;
  href: string;
  alt: string;
  family: Family;
  /** Category slugs whose product_count sums into this tile's live count. */
  cats: string[];
}

/**
 * Ten curated routes into the catalogue, each mapped to real category slugs so
 * the count shown is the number of products actually in that category. Copper
 * pieces roll up into copper categories, brass into brass — never invented.
 */
const TILES: Tile[] = [
  { img: "/home/cat-cookware.jpg", title: "Copper & Brass Cookware", text: "Pans, handis, pots & serving", href: "/categories/copper-kitchenware", alt: "Copper and brass cookware — wholesale from New Look Impex", family: "Mixed", cats: ["copper-kitchenware"] },
  { img: "/home/cat-drinkware.jpg", title: "Copper Bottles & Drinkware", text: "Bottles, jugs, mugs, tumblers", href: "/categories/copper-bottles", alt: "Hammered copper bottles and drinkware — New Look Impex", family: "Copper", cats: ["copper-bottles"] },
  { img: "/home/cat-tableware.jpg", title: "Brass Tableware", text: "Thali sets, plates, dinnerware", href: "/categories/brass-kitchenware", alt: "Brass thali dinner set — New Look Impex", family: "Brass", cats: ["brass-kitchenware"] },
  { img: "/home/cat-kitchenware.jpg", title: "Brass Kitchenware", text: "Utensils, ladles, serveware", href: "/categories/brass-kitchenware", alt: "Brass kitchen utensils — New Look Impex", family: "Brass", cats: ["brass-kitchenware"] },
  { img: "/home/cat-masala.jpg", title: "Brass Masala Boxes", text: "Spice boxes & storage", href: "/products?q=spice", alt: "Brass masala spice box — New Look Impex", family: "Brass", cats: [] },
  { img: "/home/cat-pooja.jpg", title: "Pooja Essentials", text: "Diyas, lamps, prayer accessories", href: "/products?q=decor", alt: "Brass pooja diyas and lamps — New Look Impex", family: "Brass", cats: [] },
  { img: "/home/cat-urlis.jpg", title: "Urlis & Decorative Bowls", text: "Traditional vessels & bowls", href: "/collections/urlis", alt: "Brass and copper urlis — New Look Impex", family: "Mixed", cats: [] },
  { img: "/home/cat-diyas-lanterns.jpg", title: "Diyas & Lanterns", text: "Festive lighting & accents", href: "/products?q=decor", alt: "Brass diyas and lanterns — New Look Impex", family: "Brass", cats: [] },
  { img: "/home/cat-corporate-gifting.jpg", title: "Corporate Gifting", text: "Bulk & branded programmes", href: "/collections/gifting", alt: "Corporate brass and copper gifting — New Look Impex", family: "Mixed", cats: [] },
  { img: "/home/cat-gift-sets.jpg", title: "Copper & Brass Gift Sets", text: "Ready-to-gift boxed sets", href: "/collections/gifting", alt: "Copper and brass gift sets — New Look Impex", family: "Mixed", cats: [] },
];

const FAMILY_STYLE: Record<Family, { chip: string; dot: string }> = {
  Copper: { chip: "bg-brass-light text-brass-dark", dot: "bg-brass" },
  Brass: { chip: "bg-gold-light text-gold-dark", dot: "bg-gold" },
  Mixed: { chip: "bg-editorial-secondary text-editorial-ink", dot: "bg-editorial-emerald" },
};

/**
 * Shop by Category — live counts from /api/public/categories (product_count)
 * for tiles that open a single category listing; other destinations show no
 * count. Groups visually by material family so copper sits with copper and
 * brass with brass.
 */
export function ShopByCategory() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [tiles, setTiles] = useState<Tile[]>(TILES);

  useEffect(() => {
    api<Record<string, any>>("/api/public/site-content")
      .then((c) => {
        const custom = c?.shop_category_tiles;
        if (Array.isArray(custom) && custom.length) {
          setTiles(custom.map((t: any) => ({
            img: String(t.img || ""), title: String(t.title || ""), text: String(t.text || ""),
            href: String(t.href || "/"), alt: String(t.alt || ""),
            family: (["Copper", "Brass", "Mixed"].includes(t.family) ? t.family : "Mixed") as Family,
            cats: Array.isArray(t.cats) ? t.cats.map(String)
              : String(t.cats || "").split(",").map((s: string) => s.trim()).filter(Boolean),
          })));
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    api<{ items: { slug: string; product_count?: number }[] }>("/api/public/categories")
      .then((d) => {
        const map: Record<string, number> = {};
        (d.items || []).forEach((c) => { map[c.slug] = Number(c.product_count || 0); });
        setCounts(map);
      })
      .catch(() => undefined);
  }, []);

  const countFor = (t: Tile): number | null => {
    // A count is only shown when the tile's destination is exactly one category
    // listing whose real product_count we know. Filter/editorial destinations
    // (/urlis, /gifting, ?material=, ?q=) show no count to stay honest.
    if (t.cats.length !== 1) return null;
    const n = counts[t.cats[0]];
    return n === undefined ? null : n;
  };

  return (
    <div className="mt-12">
      {(["Copper", "Brass", "Mixed"] as Family[]).map((family) => {
        const familyTiles = tiles.filter((t) => t.family === family);
        if (!familyTiles.length) return null;
        return (
          <div key={family} className="mb-10 last:mb-0">
            <div className="mb-4 flex items-center gap-3">
              <span className={`h-2.5 w-2.5 rounded-full ${FAMILY_STYLE[family].dot}`} aria-hidden="true" />
              <h3 className="font-inter text-[11px] uppercase tracking-[0.22em] text-editorial-ink/70">
                {family === "Mixed" ? "Copper & Brass Together" : `${family} Collections`}
              </h3>
              <span className="h-px flex-1 bg-editorial-ink/10" aria-hidden="true" />
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
              {familyTiles.map((t) => {
                const n = countFor(t);
                return (
                  <Link
                    key={t.href + t.img}
                    href={t.href}
                    className="group relative block overflow-hidden rounded-sm bg-editorial-dark"
                    aria-label={`${t.title} — ${t.text}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.img} alt={t.alt} loading="lazy" className="aspect-[4/5] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
                    <span className="absolute inset-0 bg-gradient-to-t from-editorial-dark/85 via-editorial-dark/20 to-transparent" aria-hidden="true" />
                    <span className={`absolute left-3 top-3 rounded-sm px-2 py-1 font-inter text-[9px] uppercase tracking-[0.14em] ${FAMILY_STYLE[family].chip}`}>
                      {family}
                    </span>
                    {n !== null && (
                      <span className="absolute right-3 top-3 rounded-sm bg-editorial-dark/85 px-2 py-1 font-inter text-[9px] uppercase tracking-[0.1em] text-editorial-gold">
                        {n} {n === 1 ? "product" : "products"}
                      </span>
                    )}
                    <span className="absolute inset-x-0 bottom-0 block p-4 md:p-5">
                      <span className="block font-cormorant text-lg leading-tight text-editorial-bg md:text-xl">{t.title}</span>
                      <span className="mt-1.5 block font-inter text-[10px] uppercase tracking-[0.16em] text-editorial-gold md:text-[11px]">{t.text}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
