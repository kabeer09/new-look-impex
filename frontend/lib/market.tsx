"use client";

/**
 * Market context — destination country + display currency + indicative FX.
 *
 * Privacy: the country comes from a proxy-set request header (Vercel /
 * Cloudflare) written to a first-party cookie by `middleware.ts`. No IP is
 * stored, no third-party geolocation service is called, and the buyer can
 * override the detection at any time from the header or footer selector.
 *
 * Honesty: prices are ALWAYS shown as stored (the approved base currency)
 * until the buyer explicitly picks a currency in the header/footer selector
 * (`manual`). Geo detection only *suggests* a market — it never converts a
 * figure by itself. Once a currency is manually picked, `money()` renders a
 * converted figure only when
 *   1. the product actually has an approved base price, and
 *   2. a real rate pair for base→target exists in the cached payload,
 * and it always carries the provider's own rate date. Otherwise callers fall
 * back to "Request Wholesale Quote in <currency>". Prices stored in the
 * database are never rewritten — conversion is display-only.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";

export type MarketCurrency = "USD" | "GBP" | "AED" | "AUD" | "CAD" | "EUR" | "INR";

export const CURRENCIES: readonly MarketCurrency[] = [
  "USD", "GBP", "AED", "AUD", "CAD", "EUR", "INR",
];

export const CURRENCY_LABELS: Record<MarketCurrency, string> = {
  USD: "USD ($)",
  GBP: "GBP (£)",
  AED: "AED (د.إ)",
  AUD: "AUD (A$)",
  CAD: "CAD (C$)",
  EUR: "EUR (€)",
  INR: "INR (₹)",
};

export interface Destination {
  key: string;
  label: string;
  currency: MarketCurrency;
  /** Dedicated country landing page, when one exists. */
  page?: string;
}

export const DESTINATIONS: Destination[] = [
  { key: "us", label: "United States", currency: "USD", page: "/usa" },
  { key: "uk", label: "United Kingdom", currency: "GBP", page: "/uk" },
  { key: "uae", label: "United Arab Emirates", currency: "AED", page: "/uae" },
  { key: "au", label: "Australia", currency: "AUD", page: "/au" },
  { key: "ca", label: "Canada", currency: "CAD", page: "/canada" },
  { key: "eu", label: "Europe", currency: "EUR", page: "/europe" },
  { key: "in", label: "India", currency: "INR" },
  { key: "row", label: "Rest of world", currency: "USD" },
];

const DEST_BY_KEY: Record<string, Destination> = DESTINATIONS.reduce(
  (acc, d) => ({ ...acc, [d.key]: d }),
  {}
);

/** ISO-3166-1 codes that settle on the Europe destination (EUR). */
const EUROPE_CODES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE", "IS", "LI", "NO", "CH", "RS", "BA", "ME", "MK", "AL",
  "UA", "MD", "BY", "RU", "TR", "GE", "AM", "AZ", "XK",
]);

const COUNTRY_DEST: Record<string, string> = {
  US: "us", GB: "uk", AE: "uae", AU: "au", CA: "ca", IN: "in",
};

/** Map a detected ISO country code to one of our destinations ("" = unknown). */
export function destKeyForCountry(iso: string): string {
  const up = (iso || "").trim().toUpperCase();
  if (!up) return "";
  if (COUNTRY_DEST[up]) return COUNTRY_DEST[up];
  if (EUROPE_CODES.has(up)) return "eu";
  return "row";
}

/* ---------------- persistence helpers (first-party, no third parties) ------- */

const DEST_COOKIE = "nli_dest";
const CUR_COOKIE = "nli_cur";
const GEO_COOKIE = "nli_geo"; // written by middleware from the geo header
const LS_DEST = "nli_dest";
const LS_CUR = "nli_cur";
const WELCOME_PREFIX = "nli_welcome:"; // per-destination dismissal

function readCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : "";
}

function writeCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=31536000;samesite=lax`;
}

function readLS(name: string): string {
  try {
    return localStorage.getItem(name) || "";
  } catch {
    return "";
  }
}

function writeLS(name: string, value: string): void {
  try {
    localStorage.setItem(name, value);
  } catch {
    /* private mode — cookie still carries the choice */
  }
}

export function isWelcomeDismissed(destKey: string): boolean {
  return readLS(WELCOME_PREFIX + destKey) === "1";
}

export function dismissWelcome(destKey: string): void {
  writeLS(WELCOME_PREFIX + destKey, "1");
}

/* ---------------------------- money formatting ----------------------------- */

export function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export interface MoneyResult {
  /** A figure may be shown honestly (same currency, or a real rate existed). */
  ok: boolean;
  /** Formatted amount in the buyer's display currency ("" when !ok). */
  text: string;
  /** True when the figure was converted — the rate date must be shown. */
  converted: boolean;
  /** Provider rate date, present only when converted. */
  date?: string;
}

export interface RatesPayload {
  available: boolean;
  base?: string;
  rates?: Record<string, number>;
  date?: string;
  source?: string;
}

/* ------------------------------- context ---------------------------------- */

export interface MarketValue {
  /** Selected destination key ("" until the visitor's market is resolved). */
  destKey: string;
  destination: Destination;
  /** True when the destination came from IP geo and was never chosen by hand. */
  detected: boolean;
  /**
   * True only after the buyer explicitly picked a destination/currency in the
   * selector. While false, prices render exactly as stored in the database —
   * geo detection alone never triggers a conversion.
   */
  manual: boolean;
  /** Display/suggestion currency — conversions happen only when `manual`. */
  currency: MarketCurrency;
  rates: RatesPayload | null;
  ratesLoading: boolean;
  setDestination: (key: string) => void;
  setCurrency: (c: MarketCurrency) => void;
  money: (amount: number | null | undefined, baseCurrency?: string | null) => MoneyResult;
  /** "Request Wholesale Quote in GBP" — the honest no-price fallback. */
  quoteIn: string;
}

/** Fallback used if a component renders outside <MarketProvider>: USD, no rates. */
function standaloneMoney(
  amount: number | null | undefined,
  baseCurrency?: string | null
): MoneyResult {
  if (amount == null || !Number.isFinite(amount)) {
    return { ok: false, text: "", converted: false };
  }
  const base = (baseCurrency || "USD").trim().toUpperCase();
  if (base === "USD") {
    return { ok: true, text: formatAmount(amount, "USD"), converted: false };
  }
  return { ok: false, text: "", converted: false };
}

const DEFAULT_VALUE: MarketValue = {
  destKey: "",
  destination: DEST_BY_KEY.row,
  detected: false,
  manual: false,
  currency: "USD",
  rates: null,
  ratesLoading: true,
  setDestination: () => undefined,
  setCurrency: () => undefined,
  money: standaloneMoney,
  quoteIn: "Request Wholesale Quote in USD",
};

const MarketContext = createContext<MarketValue>(DEFAULT_VALUE);

export function useMarket(): MarketValue {
  return useContext(MarketContext);
}

/**
 * Lead metadata derived from the visitor's market — attached to public
 * enquiry submissions so the team can quote in the buyer's currency.
 * `country` is only ever a destination we actually resolved (never guessed),
 * and is empty when the visitor is on the generic "Rest of world" market.
 * `preferred_currency` is reported only after the buyer explicitly picked one
 * — a geo suggestion alone is never recorded as a preference.
 */
export function useLeadMarket(): { preferred_currency: MarketCurrency | ""; country: string } {
  const { currency, manual, destKey, destination } = useMarket();
  return {
    preferred_currency: manual ? currency : "",
    country: destKey && destKey !== "row" ? destination.label : "",
  };
}

function isCurrency(v: string): v is MarketCurrency {
  return (CURRENCIES as readonly string[]).includes(v);
}

export function MarketProvider({ children }: { children: ReactNode }) {
  const [destKey, setDestKey] = useState("");
  const [detected, setDetected] = useState(false);
  const [manual, setManual] = useState(false);
  const [currency, setCurrencyState] = useState<MarketCurrency>("USD");
  const [rates, setRates] = useState<RatesPayload | null>(null);
  const [ratesLoading, setRatesLoading] = useState(true);

  // Resolve the persisted / geo-detected market after mount so server and
  // client render the same tree on the first pass (no hydration drift).
  // Only an explicit earlier choice (nli_dest / nli_cur, written solely by the
  // selector) counts as `manual` — the geo cookie never enables conversion.
  useEffect(() => {
    const manualDest = readLS(LS_DEST) || readCookie(DEST_COOKIE);
    const hasManualDest = Boolean(manualDest && DEST_BY_KEY[manualDest]);
    const manualCur = (readLS(LS_CUR) || readCookie(CUR_COOKIE)).toUpperCase();
    const hasManualCur = isCurrency(manualCur);
    let key = hasManualDest ? manualDest : "";
    let fromGeo = false;
    if (!hasManualDest) {
      const geoKey = destKeyForCountry(readCookie(GEO_COOKIE));
      if (geoKey) {
        key = geoKey;
        fromGeo = true;
      }
    }
    const dest = DEST_BY_KEY[key];
    const suggested: MarketCurrency = hasManualCur
      ? manualCur
      : dest
        ? dest.currency
        : "USD";
    setDestKey(key);
    setDetected(fromGeo);
    setManual(hasManualDest || hasManualCur);
    setCurrencyState(suggested);
  }, []);

  // Indicative rates — fetched once, cached server-side for 6 hours.
  useEffect(() => {
    let cancelled = false;
    api<RatesPayload>("/api/public/rates")
      .then((p) => {
        if (!cancelled) setRates(p && typeof p === "object" ? p : { available: false });
      })
      .catch(() => {
        if (!cancelled) setRates({ available: false });
      })
      .finally(() => {
        if (!cancelled) setRatesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setDestination = useCallback((key: string) => {
    const d = DEST_BY_KEY[key];
    if (!d) return;
    writeLS(LS_DEST, key);
    writeCookie(DEST_COOKIE, key);
    // The destination implies its default quotation currency; a later explicit
    // currency pick overrides it.
    writeLS(LS_CUR, d.currency);
    writeCookie(CUR_COOKIE, d.currency);
    setDestKey(key);
    setCurrencyState(d.currency);
    setManual(true); // a hand-made choice is what enables conversion
    setDetected(false); // a hand-made choice ends the "detected" welcome offer
  }, []);

  const setCurrency = useCallback((c: MarketCurrency) => {
    if (!isCurrency(c)) return;
    writeLS(LS_CUR, c);
    writeCookie(CUR_COOKIE, c);
    setCurrencyState(c);
    setManual(true); // a hand-made choice is what enables conversion
  }, []);

  const money = useCallback(
    (amount: number | null | undefined, baseCurrency?: string | null): MoneyResult => {
      if (amount == null || !Number.isFinite(amount)) {
        return { ok: false, text: "", converted: false };
      }
      const base = (baseCurrency || "USD").trim().toUpperCase();
      // Until the buyer explicitly picks a currency, the figure renders exactly
      // as approved and stored in the catalogue — geo detection never converts.
      if (!manual || base === currency) {
        return { ok: true, text: formatAmount(amount, base), converted: false };
      }
      const table = rates;
      if (!table?.available || !table.rates) {
        return { ok: false, text: "", converted: false };
      }
      const from = table.rates[base];
      const to = table.rates[currency];
      if (!from || !to) {
        return { ok: false, text: "", converted: false };
      }
      const converted = amount * (to / from);
      const rounded = Math.round(converted * 100) / 100;
      return {
        ok: true,
        text: formatAmount(rounded, currency),
        converted: true,
        date: table.date,
      };
    },
    [manual, currency, rates]
  );

  const value = useMemo<MarketValue>(
    () => ({
      destKey,
      destination: DEST_BY_KEY[destKey] || DEST_BY_KEY.row,
      detected,
      manual,
      currency,
      rates,
      ratesLoading,
      setDestination,
      setCurrency,
      money,
      quoteIn: `Request Wholesale Quote in ${currency}`,
    }),
    [destKey, detected, manual, currency, rates, ratesLoading, setDestination, setCurrency, money]
  );

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}
