"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

/** One occasion, as computed by the homepage's date-aware calendar. */
export interface SeasonalOccasion {
  card: {
    id: string;
    market: string;
    title: string;
    note: string;
    img: string;
    alt: string;
    href: string;
  };
  label: string;
  ts: number;
}

/** Buyer-facing market tags — derived from the card's market text, never from
 *  invented data. Maps to a flag glyph only; no external flags asset needed. */
function marketFlags(market: string): string {
  const m = market.toLowerCase();
  const flags: [string, string][] = [
    ["united states", "🇺🇸"], ["usa", "🇺🇸"], ["uk", "🇬🇧"],
    ["europe", "🇪🇺"], ["canada", "🇨🇦"], ["uae", "🇦🇪"],
    ["australia", "🇦🇺"], ["global", "🌍"],
  ];
  const found = flags.filter(([key]) => m.includes(key)).map(([, f]) => f);
  return Array.from(new Set(found)).join(" ");
}

function daysUntil(ts: number, now: Date): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(0, Math.round((ts - today) / 86400000));
}

function countdownLabel(days: number): string {
  if (days === 0) return "In season now";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  if (days < 45) return `In ${Math.round(days / 7)} weeks`;
  return `In ${Math.round(days / 30)} months`;
}

/**
 * International Buying Calendar — a premium, date-aware editorial timeline.
 * Only occasions that have not yet passed are shown; the next one is featured.
 * All data comes from the homepage's existing SEASON_CARDS + date computation.
 */
export function SeasonalCalendar({ items }: { items: SeasonalOccasion[] }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); }, []);

  if (!items.length) return null;
  const [featured, ...rest] = items;
  const upcoming = now ? items : null; // avoid SSR/client date mismatch

  return (
    <div className="mt-12">
      {/* Featured next occasion — wide editorial split */}
      <Link
        href={featured.card.href}
        className="group grid overflow-hidden rounded-sm border border-editorial-ink/10 bg-editorial-secondary"
        aria-label={`${featured.card.title} — ${featured.card.market}`}
      >
        <span className="relative block min-h-[280px] overflow-hidden md:min-h-[340px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={featured.card.img}
            alt={featured.card.alt}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-editorial-dark/80 via-editorial-dark/10 to-transparent md:bg-gradient-to-r" aria-hidden="true" />
          <span className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-sm bg-editorial-dark/85 px-3 py-1.5 font-inter text-[10px] uppercase tracking-[0.2em] text-editorial-gold">
            <span aria-hidden="true">◆</span> Next buying season
          </span>
        </span>
        <span className="flex flex-col justify-center p-7 md:p-10">
          <span className="font-inter text-[10px] uppercase tracking-[0.26em] text-editorial-accent">
            {marketFlags(featured.card.market)} {featured.card.market}
          </span>
          <span className="mt-3 block font-cormorant text-3xl leading-tight text-editorial-ink md:text-4xl">
            {featured.card.title}
          </span>
          <span className="mt-3 block font-inter text-sm leading-relaxed text-editorial-ink/70">
            {featured.card.note}
          </span>
          <span className="mt-5 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center bg-editorial-emerald px-4 py-2 font-inter text-[11px] uppercase tracking-[0.14em] text-editorial-bg">
              {upcoming ? countdownLabel(daysUntil(featured.ts, now!)) : featured.label}
            </span>
            <span className="font-inter text-xs text-editorial-ink/55">{featured.label}</span>
          </span>
          <span className="mt-6 inline-block border-b border-editorial-accent/50 pb-1 font-inter text-[11px] uppercase tracking-[0.18em] text-editorial-accent transition-colors group-hover:border-editorial-accent">
            Explore this edit <span aria-hidden="true" className="ml-1 inline-block transition-transform group-hover:translate-x-1">→</span>
          </span>
        </span>
      </Link>

      {/* Timeline rail — remaining upcoming occasions */}
      {rest.length > 0 && (
        <ol className="relative mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((o, i) => (
            <li key={o.card.id} className="relative">
              <Link
                href={o.card.href}
                className="group flex h-full flex-col overflow-hidden rounded-sm border border-editorial-ink/10 bg-white p-5 transition-colors hover:border-editorial-accent/50"
                aria-label={`${o.card.title} — ${o.card.market}`}
              >
                <span className="flex items-center justify-between font-inter text-[10px] uppercase tracking-[0.18em] text-editorial-ink/55">
                  <span>{marketFlags(o.card.market)} {o.card.market}</span>
                  <span className="text-editorial-gold">
                    {upcoming ? countdownLabel(daysUntil(o.ts, now!)) : `#${i + 2}`}
                  </span>
                </span>
                <span className="mt-3 block font-cormorant text-xl leading-tight text-editorial-ink">
                  {o.card.title}
                </span>
                <span className="mt-2 block font-inter text-[11px] font-semibold uppercase tracking-[0.12em] text-editorial-accent">
                  {o.label}
                </span>
                <span className="mt-3 block font-inter text-xs leading-relaxed text-editorial-ink/65">
                  {o.card.note}
                </span>
                <span className="mt-4 inline-block border-b border-editorial-accent/40 pb-0.5 font-inter text-[10px] uppercase tracking-[0.16em] text-editorial-accent">
                  Explore <span aria-hidden="true" className="ml-1 inline-block transition-transform group-hover:translate-x-1">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}

      <p className="mt-8 text-center font-inter text-[10px] uppercase tracking-[0.28em] text-editorial-ink/50 md:text-[11px]">
        The calendar updates itself <span className="text-editorial-gold" aria-hidden="true">·</span> Past occasions are removed automatically
      </p>
    </div>
  );
}
