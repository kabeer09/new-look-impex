"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CURRENCIES,
  CURRENCY_LABELS,
  DESTINATIONS,
  dismissWelcome,
  isWelcomeDismissed,
  useMarket,
} from "@/lib/market";

type Tone = "light" | "dark";

const SELECT_TONE: Record<Tone, string> = {
  // The light field reads clearly on both ivory surfaces and the dark footer
  // (white fill, charcoal text, system dropdown — always legible).
  light: "input",
  dark: "input",
};

const LABEL_TONE: Record<Tone, string> = {
  light: "label",
  dark: "block text-[10px] font-medium uppercase tracking-[0.16em] text-cream/70 mb-1",
};

const NOTE_TONE: Record<Tone, string> = {
  light: "help",
  dark: "mt-2 text-[11px] leading-relaxed text-cream/60",
};

/** Destination + currency selects — reused by the header panel and footer. */
export function MarketFields({
  idPrefix,
  tone = "light",
}: {
  idPrefix: string;
  tone?: Tone;
}) {
  const { destKey, currency, manual, detected, setDestination, setCurrency, rates, ratesLoading } =
    useMarket();

  const rateNote = !manual
    ? "Prices are shown exactly as listed until you pick a currency to convert."
    : ratesLoading
      ? "Loading indicative exchange rates…"
      : rates?.available && rates.date
        ? `Indicative conversion · provider rate date ${rates.date}`
        : "Live rates unavailable — quotes are issued in writing.";

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className={LABEL_TONE[tone]} htmlFor={`${idPrefix}-dest`}>
          Destination
        </label>
        <select
          id={`${idPrefix}-dest`}
          className={SELECT_TONE[tone]}
          value={destKey}
          onChange={(e) => setDestination(e.target.value)}
        >
          <option value="" disabled>
            Select destination…
          </option>
          {DESTINATIONS.map((d) => (
            <option key={d.key} value={d.key}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={LABEL_TONE[tone]} htmlFor={`${idPrefix}-cur`}>
          Currency
        </label>
        <select
          id={`${idPrefix}-cur`}
          className={SELECT_TONE[tone]}
          value={manual ? currency : ""}
          onChange={(e) => {
            if (e.target.value) setCurrency(e.target.value as (typeof CURRENCIES)[number]);
          }}
        >
          <option value="" disabled={!manual}>
            {manual ? "As listed" : "As listed (choose to convert)"}
          </option>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {CURRENCY_LABELS[c]}
            </option>
          ))}
        </select>
        <p className={NOTE_TONE[tone]}>{rateNote}</p>
      </div>
      {detected && !manual && (
        <p className={`sm:col-span-2 ${NOTE_TONE[tone]}`}>
          Destination above is only a suggestion from your location — change it any time. Nothing
          on the page converts until you choose a currency.
        </p>
      )}
    </div>
  );
}

const GLOBE_ICON = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" />
  </svg>
);

/** Compact header control — opens the destination/currency panel. */
export function MarketToggle({ idPrefix = "hdr" }: { idPrefix?: string }) {
  const { destination, currency, destKey, manual } = useMarket();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const short = destKey && destKey !== "row" ? destination.key.toUpperCase() : "Global";

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`${manual ? `${short} · ${currency}` : `${short} · listed`} — Destination and currency: ${destination.label}${manual ? `, ${currency}` : ", prices as listed"}`}
        title={manual ? "Destination & currency" : "Destination & currency — prices shown as listed"}
        className="flex h-9 items-center gap-1.5 px-1.5 text-editorial-ink transition-colors hover:text-editorial-accent"
      >
        {GLOBE_ICON}
        <span className="hidden font-inter text-[11px] uppercase tracking-[0.14em] sm:inline">
          {manual ? `${short} · ${currency}` : `${short} · listed`}
        </span>
        <span className="font-inter text-[11px] font-semibold tracking-[0.1em] sm:hidden">
          {manual ? currency : short}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Destination and currency"
          className="absolute right-0 top-full z-50 mt-2 w-[19.5rem] max-w-[calc(100vw-2rem)] rounded-lg border border-stone-200 bg-white p-4 shadow-xl"
        >
          <p className="mb-3 font-cormorant text-lg font-semibold text-espresso">
            Shop in your market
          </p>
          <MarketFields idPrefix={idPrefix} tone="light" />
          <p className="mt-3 text-[11px] leading-relaxed text-gray">
            {manual
              ? "Converted prices are indicative and carry the rate date shown. Every order is confirmed by a written quotation."
              : "Prices are listed in the catalogue currency until you choose one to convert. Every order is confirmed by a written quotation."}
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="btn btn-ghost btn-sm mt-3 w-full"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * One-time, dismissible welcome for buyers whose country we could infer.
 * Never redirects — it only offers the matching country page.
 */
export function MarketWelcome() {
  const { destKey, destination, detected } = useMarket();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!detected || !destination.page) return;
    if (isWelcomeDismissed(destKey)) return;
    setShow(true);
  }, [detected, destKey, destination.page]);

  if (!show || !destination.page) return null;

  const close = () => {
    dismissWelcome(destKey);
    setShow(false);
  };

  return (
    <div className="border-b border-editorial-gold/30 bg-editorial-dark text-cream" role="status">
      <div className="container-x flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-2.5">
        <p className="font-inter text-[11px] uppercase tracking-[0.16em] text-cream/85">
          Welcome — you appear to be visiting from {destination.label}
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <Link
            href={destination.page}
            onClick={close}
            className="font-inter text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-light underline underline-offset-4 hover:text-white"
          >
            Open our {destination.label} wholesale page →
          </Link>
          <button
            type="button"
            onClick={close}
            className="font-inter text-[11px] uppercase tracking-[0.16em] text-cream/60 transition-colors hover:text-cream"
          >
            Stay here
          </button>
          <button
            type="button"
            onClick={close}
            aria-label="Dismiss welcome message"
            className="flex h-5 w-5 items-center justify-center text-[12px] text-cream/60 transition-colors hover:text-cream"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
