"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useLeadMarket } from "@/lib/market";
import { NLI_SALE_POPUP_EVENT, playPopChime } from "@/lib/assistant";

/**
 * Shopify-style sales surfaces:
 *   1. SaleBar    — sticky BOTTOM announcer with a live countdown to the end
 *                   of the current seasonal campaign, a claim CTA and a
 *                   daily dismiss.
 *   2. SalePopup  — delayed (once/day) modal that shows the live offer and
 *                   takes the buyer's email to claim the discount code.
 *
 * Every figure (name, %, code, end date) comes from GET
 * /api/public/active-campaign — nothing is hard-coded or invented. If the
 * campaign endpoint fails or the sale has ended, neither surface appears.
 * The claim reuses the existing public enquiry flow (newsletter
 * subscription), so consent, rate limiting and the welcome email (which
 * contains the code) behave exactly like the homepage sign-up.
 */

interface Campaign {
  emoji: string;
  name: string;
  percent: number;
  code: string;
  ends_at: string;
  ends_label: string;
}

let campaignPromise: Promise<Campaign | null> | null = null;
function getCampaign(): Promise<Campaign | null> {
  if (!campaignPromise) {
    campaignPromise = api<Campaign>("/api/public/active-campaign")
      .then((c) => (c && c.code && c.percent ? c : null))
      .catch(() => null);
  }
  return campaignPromise;
}

const BAR_KEY = "nli_sale_bar_day"; // last day the bar was dismissed
const POPUP_KEY = "nli_sale_popup_day"; // last day the popup auto-showed
const CLAIM_KEY = "nli_sale_claim_day"; // last day the buyer claimed a code

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}
function readDay(key: string): string {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}
function writeDay(key: string): void {
  try {
    localStorage.setItem(key, todayKey());
  } catch {
    /* private mode — dismiss/seen state lives for this render only */
  }
}
function formatLeft(ms: number): string {
  const d = Math.floor(ms / 86400000);
  const h = Math.floor(ms / 3600000) % 24;
  const m = Math.floor(ms / 60000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/* ------------------------------------------------------------------ bar */

export function SaleBar() {
  const [camp, setCamp] = useState<Campaign | null>(null);
  const [visible, setVisible] = useState(false);
  const [left, setLeft] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getCampaign().then((c) => {
      if (!c) return;
      const end = Date.parse(c.ends_at);
      if (Number.isFinite(end) && end <= Date.now()) return; // sale over
      if (readDay(BAR_KEY) === todayKey()) return; // dismissed today
      setCamp(c);
      setVisible(true);
    });
  }, []);

  // Live countdown; hides itself the moment the campaign ends.
  useEffect(() => {
    if (!visible || !camp) return;
    const end = Date.parse(camp.ends_at);
    const tick = () => {
      const ms = end - Date.now();
      if (ms <= 0) {
        setVisible(false);
        return;
      }
      setLeft(formatLeft(ms));
    };
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [visible, camp]);

  // Publish the bar's height so the compare tray and chat bubble stack
  // above it instead of covering it.
  useEffect(() => {
    const el = ref.current;
    if (!visible || !el) return;
    const apply = () =>
      document.documentElement.style.setProperty("--nli-bottom-h", `${el.offsetHeight}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.setProperty("--nli-bottom-h", "0px");
    };
  }, [visible]);

  if (!visible || !camp) return null;

  return (
    <div
      ref={ref}
      role="status"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/40 bg-espresso text-cream shadow-[0_-6px_24px_rgba(33,27,23,0.25)]"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5">
        <p className="text-[11px] leading-relaxed md:text-xs">
          <span className="font-bold uppercase tracking-[0.14em] text-gold">
            {camp.emoji} {camp.name} — {camp.percent}% off
          </span>
          <span className="mx-2 text-cream/40" aria-hidden="true">
            |
          </span>
          <span>
            code <strong className="font-mono tracking-wide">{camp.code}</strong>
          </span>
          <span className="mx-2 text-cream/40" aria-hidden="true">
            |
          </span>
          <span>
            ends in <strong className="tabular-nums">{left}</strong>
          </span>
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(NLI_SALE_POPUP_EVENT))}
            className="btn btn-brass btn-sm"
          >
            Claim discount
          </button>
          <button
            type="button"
            onClick={() => {
              writeDay(BAR_KEY);
              setVisible(false);
            }}
            aria-label="Dismiss sale announcement for today"
            className="text-cream/60 transition-colors hover:text-cream"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- popup */

export function SalePopup() {
  const [camp, setCamp] = useState<Campaign | null>(null);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [popupImages, setPopupImages] = useState<string[]>([]);
  const lead = useLeadMarket();

  useEffect(() => {
    api<Record<string, any>>("/api/public/site-content")
      .then((c) => {
        const imgs = c?.popup_images;
        if (Array.isArray(imgs) && imgs.length) setPopupImages(imgs.map(String));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let timer = 0;
    const manual = () => {
      setOpen(true);
      playPopChime();
      // A buyer who already claimed today sees their code, not the form again.
      if (readDay(CLAIM_KEY) === todayKey()) setState("done");
    };
    window.addEventListener(NLI_SALE_POPUP_EVENT, manual);
    getCampaign().then((c) => {
      if (!c) return;
      setCamp(c);
      if (readDay(CLAIM_KEY) === todayKey()) return; // already claimed today
      if (readDay(POPUP_KEY) === todayKey()) return; // already shown today
      timer = window.setTimeout(() => {
        writeDay(POPUP_KEY);
        setOpen(true);
        playPopChime();
      }, 6000);
    });
    return () => {
      window.removeEventListener(NLI_SALE_POPUP_EVENT, manual);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open || !camp) return null;

  const claimed = readDay(CLAIM_KEY) === todayKey();

  const claim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!camp || !email.trim()) return;
    setState("sending");
    try {
      await api("/api/public/enquiries", {
        method: "POST",
        body: JSON.stringify({
          name: "Sale Popup Subscriber",
          email: email.trim(),
          product_interest: "Newsletter subscription",
          message: `Claimed discount code ${camp.code} (${camp.name} ${camp.percent}% off) via the sales popup.`,
          campaign: camp.code,
          landing_page: "sale-popup",
          consent: true,
          preferred_currency: lead.preferred_currency,
          ...(lead.country ? { country: lead.country } : {}),
        }),
      });
      writeDay(CLAIM_KEY);
      setState("done");
    } catch (err) {
      const msg = String(err);
      if (msg.includes("409")) {
        // Already subscribed — the code is theirs either way.
        writeDay(CLAIM_KEY);
        setState("done");
      } else {
        setState("error");
      }
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(camp.code);
    } catch {
      /* clipboard blocked — the code is selectable in the field below */
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-espresso/70 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-label={`${camp.percent}% off ${camp.name} offer`}
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="relative w-full max-w-md rounded-xl border border-gold/50 bg-ivory p-6 shadow-[0_24px_70px_rgba(33,27,23,0.45)] md:p-7">
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close offer"
          className="absolute right-3 top-3 text-lg leading-none text-gray transition-colors hover:text-navy"
        >
          ✕
        </button>

        {/* Real product images — a small banner of our brass & copper ranges */}
        <div className="-mx-6 -mt-6 mb-5 flex gap-1.5 overflow-hidden rounded-t-xl md:-mx-7 md:-mt-7">
          {(popupImages.length ? popupImages : ["/nli-copper-bottle.jpg", "/nli-brass-utensils.jpg", "/nli-gift-set.jpg", "/nli-copper-gift-set.jpg"]).map((src) => (
            <div key={src} className="h-28 flex-1 overflow-hidden bg-champagne">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="Handcrafted brass and copper products from New Look Impex" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>

        {state !== "done" ? (
          <>
            <p className="text-center text-2xl" aria-hidden="true">
              {camp.emoji}
            </p>
            <h2 className="mt-2 text-center font-serif text-3xl font-bold text-navy">
              {camp.percent}% OFF {camp.name}
            </h2>
            <p className="mt-2 text-center text-sm text-gray">
              Enter your email to claim your discount code — plus first look at new arrivals and
              trade offers. Offer ends {camp.ends_label}.
            </p>

            <form onSubmit={claim} className="mt-5 space-y-3">
              <label className="label" htmlFor="sale-email">
                Business email
              </label>
              <input
                id="sale-email"
                type="email"
                required
                autoComplete="email"
                className="input"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={state === "sending"}
              >
                {state === "sending" ? "Claiming…" : "Claim my discount code"}
              </button>
              {state === "error" && (
                <p className="text-xs text-red-700" role="alert">
                  We couldn't save your email just now — please try again, or use the code{" "}
                  <strong className="font-mono">{camp.code}</strong> in your enquiry.
                </p>
              )}
            </form>

            <p className="mt-3 text-center text-[11px] leading-snug text-gray">
              We'll email you this code and occasional trade updates. Unsubscribe anytime — your
              details are never resold.
            </p>
          </>
        ) : (
          <div className="text-center">
            <p className="text-4xl" aria-hidden="true">
              {camp.emoji}
            </p>
            <h2 className="mt-2 font-serif text-2xl font-bold text-navy">Your code is ready</h2>
            <p className="mt-1 text-sm text-gray">
              {claimed && email.trim()
                ? "We've also emailed it to you."
                : "Quote it in your enquiry and our team applies the discount to your quotation."}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <input
                readOnly
                value={camp.code}
                aria-label="Discount code"
                onFocus={(e) => e.currentTarget.select()}
                className="w-44 rounded-lg border border-gold/60 bg-champagne/50 px-3 py-2.5 text-center font-mono text-lg font-bold tracking-widest text-navy"
              />
              <button type="button" onClick={copyCode} className="btn btn-outline btn-sm">
                Copy
              </button>
            </div>
            <p className="mt-4 text-xs text-gray">
              {camp.name} — {camp.percent}% off, ends {camp.ends_label}.
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn btn-ghost btn-sm mt-4"
            >
              Continue shopping
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
