"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, trackEvent } from "@/lib/api";
import { gaEvent } from "@/lib/ga4";
import { useWhatsappNumber } from "@/hooks/useWhatsapp";
import { ASSISTANT_BRIEF_KEY, NLI_CHAT_EVENT, playPopChime } from "@/lib/assistant";

/**
 * Floating live-chat assistant (Shopify-style bubble, bottom-right).
 *
 * Honest rules it keeps (same as the wizard it replaced):
 *  - rule-based replies only — no invented prices, MOQ, lead times or dates;
 *  - every concrete answer points to a real page, WhatsApp or the RFQ form;
 *  - when the buyer starts an RFQ from here, their last message is written
 *    into the RFQ hand-off key and the assistant_complete event fires.
 */

type Action = { label: string; href?: string; run?: "rfq" | "claim" };
type ProductHit = { id: number; name: string; slug: string };
type LeadFields = Record<"name" | "company" | "email" | "country" | "phone" | "product" | "quantity" | "customisation" | "destination" | "message", string>;

interface Msg {
  id: number;
  from: "bot" | "you";
  text: string;
  actions?: Action[];
  products?: ProductHit[];
}

const WELCOME_KEY = "nli_chat_welcomed";

const GREETING: Msg = {
  id: 1,
  from: "bot",
  text: "Hello! I'm the New Look Impex assistant — brass & copper handicrafts, made in Moradabad, India. What can I help with today?",
  actions: [
    { label: "Get a wholesale quote", run: "rfq" },
    { label: "Browse products", href: "/products" },
    { label: "Shipping & export", href: "/shipping-export" },
    { label: "Discount code", run: "claim" },
  ],
};

function route(text: string, whatsapp: string): Msg {
  const t = text.toLowerCase();
  const has = (...w: string[]) => w.some((x) => t.includes(x));
  const waLink = `https://wa.me/${whatsapp}?text=${encodeURIComponent("Hello, I would like to discuss wholesale requirements with New Look Impex.")}`;

  if (has("price", "pricing", "cost", "rate", "quotation", "quote", "rfq", "moq", "bulk price")) {
    return {
      id: Date.now(),
      from: "bot",
      text: "Prices, MOQ, lead times and packaging are confirmed in a written quotation by our export team — I can't quote figures here. Start an enquiry and I'll carry your message across to the form.",
      actions: [
        { label: "Start my RFQ", run: "rfq" },
        { label: "Browse products", href: "/products" },
      ],
    };
  }
  if (has("discount", "coupon", "sale", "offer", "code", "% off", "cheaper")) {
    return {
      id: Date.now(),
      from: "bot",
      text: "There's a live seasonal offer on right now — open the discount popup to claim your code by email, and our team applies it when preparing your quotation.",
      actions: [
        { label: "Claim my discount code", run: "claim" },
        { label: "Start my RFQ", run: "rfq" },
      ],
    };
  }
  if (has("ship", "export", "customs", "freight", "deliver", "courier", "container", "incoterm")) {
    return {
      id: Date.now(),
      from: "bot",
      text: "We export worldwide from Moradabad, India. The shipping method, cost and delivery dates are always confirmed in your written quotation — the export page explains how we pack and ship.",
      actions: [
        { label: "Shipping & export", href: "/shipping-export" },
        { label: "Start my RFQ", run: "rfq" },
      ],
    };
  }
  if (has("whatsapp", "human", "person", "call", "phone", "talk to", "team", "agent")) {
    return {
      id: Date.now(),
      from: "bot",
      text: "You can reach our team directly on WhatsApp, or send an enquiry and we'll reply in writing with the full quotation.",
      actions: [
        { label: "WhatsApp us", href: waLink },
        { label: "Send an enquiry", run: "rfq" },
      ],
    };
  }
  if (has("urli", "diya", "lantern", "brass", "copper", "decor", "gifting", "gift", "vase", "bowl", "plate", "statue", "pooja")) {
    return {
      id: Date.now(),
      from: "bot",
      text: "We make brass and copper handicrafts — urlis, diyas, lanterns, home décor, gifting and pooja items — in our own Moradabad workshops. Browse the published catalogue or tell me what you're looking for.",
      actions: [
        { label: "Browse products", href: "/products" },
        { label: "Start my RFQ", run: "rfq" },
      ],
    };
  }
  if (has("hello", "hi ", "hey", "salam", "good morning", "good evening") || t.trim() === "hi" || t.trim() === "hello") {
    return {
      id: Date.now(),
      from: "bot",
      text: "Hello! Ask me about our products, shipping, discounts — or I can start your wholesale enquiry right away.",
      actions: [
        { label: "Get a wholesale quote", run: "rfq" },
        { label: "Browse products", href: "/products" },
      ],
    };
  }
  return {
    id: Date.now(),
    from: "bot",
    text: "I can help with products, shipping, discount codes and quote requests. Which one shall we start with? (You can also just describe what you need and I'll pass it to our quoting desk.)",
    actions: [
      { label: "Get a wholesale quote", run: "rfq" },
      { label: "Browse products", href: "/products" },
      { label: "Discount code", run: "claim" },
      { label: "WhatsApp us", href: waLink },
    ],
  };
}

export function ChatBot() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [fields, setFields] = useState<LeadFields>({ name: "", company: "", email: "", country: "", phone: "", product: "", quantity: "", customisation: "", destination: "", message: "" });
  const [consent, setConsent] = useState(false);
  const [awaitingConsent, setAwaitingConsent] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const whatsapp = useWhatsappNumber();

  // First visit: after a short pause, pop the chat with a soft chime and a
  // friendly hint so a new buyer notices the assistant and starts chatting.
  // Shown once per browser; dismissed permanently once opened or hint closed.
  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(WELCOME_KEY) === "1"; } catch { /* private mode */ }
    if (seen) return;
    const timer = window.setTimeout(() => {
      // Pop a friendly welcome card beside the bubble (instead of throwing the
      // full panel in the buyer's face); one click opens the conversation.
      setShowHint(true);
      playPopChime();
      try { localStorage.setItem(WELCOME_KEY, "1"); } catch { /* private mode */ }
    }, 1800);
    return () => window.clearTimeout(timer);
  }, []);

  // Header/footer CTAs can ask the bubble to open.
  useEffect(() => {
    const openIt = () => setOpen(true);
    window.addEventListener(NLI_CHAT_EVENT, openIt);
    return () => window.removeEventListener(NLI_CHAT_EVENT, openIt);
  }, []);

  // Hide the WhatsApp button while the panel is open so the two never overlap.
  useEffect(() => {
    document.documentElement.classList.toggle("nli-chat-open", open);
    return () => document.documentElement.classList.remove("nli-chat-open");
  }, [open]);

  // Escape closes the full-screen chat (expected keyboard behaviour).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, typing, open]);

  const push = (m: Msg) => setMsgs((cur) => [...cur, m]);

  // Everything the buyer has typed in this session — `input` is cleared on
  // send, so the RFQ hand-off reads from here instead of the live field.
  const buyerMsgsRef = useRef<string[]>([]);

  const botSay = (text: string, actions?: Action[]) => {
    setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      push({ id: Date.now(), from: "bot", text, actions });
    }, 650);
  };

  const startRfq = (note: string) => {
    try {
      const brief = [
        "Enquiry started from the live chat assistant.",
        note.trim() ? `Buyer's own message: ${note.trim()}` : "",
      ]
        .filter(Boolean)
        .join(" ");
      localStorage.setItem(ASSISTANT_BRIEF_KEY, brief);
    } catch {
      /* storage unavailable — the RFQ page still works without the hand-off */
    }
    if (!startedRef.current) {
      startedRef.current = true;
      trackEvent({ event_type: "assistant_complete" });
    }
    push({ id: Date.now(), from: "bot", text: "Great — I've saved what you told me. The quote form will open with it filled in; add quantities and send, and our export team replies with a written quotation." });
  };

  const runAction = (a: Action) => {
    if (a.run === "rfq") {
      startRfq(buyerMsgsRef.current.join(" "));
      setOpen(false);
      router.push("/request-quote");
      return;
    }
    if (a.run === "claim") {
      window.dispatchEvent(new Event("nli-sale-popup-open"));
      push({ id: Date.now(), from: "you", text: "Discount code" });
      botSay("I've opened the offer popup — enter your email there to claim the code.");
      return;
    }
    if (a.href && a.href.startsWith("http")) {
      window.open(a.href, "_blank", "noopener,noreferrer");
      return;
    }
    if (a.href) {
      // Internal navigation: close the bubble and let Next handle the link.
      setOpen(false);
      return;
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || typing) return;
    push({ id: Date.now(), from: "you", text });
    buyerMsgsRef.current.push(text);
    setInput("");
    setTyping(true);
    try {
      const history = msgs.filter(m => m.text !== GREETING.text).slice(-8).map(m => ({ role: m.from === "you" ? "user" : "assistant", content: m.text }));
      const r = await api<{ reply: string; fields: LeadFields; ready: boolean; products: ProductHit[]; saved?: { reference: string; duplicate?: boolean } }>(
        "/api/public/assistant/chat",
        { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, history, fields, consent }) });
      if (r.fields) setFields(cur => ({ ...cur, ...r.fields }));
      setTyping(false);
      push({ id: Date.now(), from: "bot", text: r.reply, products: r.products || [] });
      if (r.saved) {
        try { localStorage.setItem(ASSISTANT_BRIEF_KEY, `Chat enquiry ${r.saved.reference}`); } catch { /* storage unavailable */ }
        trackEvent({ event_type: "assistant_complete" });
        gaEvent("generate_lead", { lead_type: "chat_assistant", source: "public_chatbot" });
      }
      if (!r.saved && !consent) setAwaitingConsent(true);
    } catch {
      setTyping(false);
      const fallback = route(text, whatsapp);
      botSay(fallback.text, fallback.actions);
    }
  };

  return (
    <>
      {/* First-visit welcome card — friendly, dismissible, one tap to chat. */}
      {showHint && !open && (
        <div role="dialog" aria-label="Chat welcome" className="fixed right-[4.5rem] z-50 w-60 rounded-xl border border-gold/50 bg-ivory p-4 shadow-[0_12px_40px_rgba(33,27,23,0.3)]"
             style={{ top: "45%", transform: "translateY(-50%)" }}>
          <button type="button" aria-label="Dismiss chat welcome" onClick={() => setShowHint(false)}
                  className="absolute right-2.5 top-2 text-base leading-none text-gray transition-colors hover:text-navy">✕</button>
          <span className="text-2xl" aria-hidden="true">👋</span>
          <p className="mt-1.5 font-serif text-base font-bold text-navy">Hi there!</p>
          <p className="mt-1 text-xs leading-relaxed text-gray">
            Need a wholesale quote? Ask me about products, pricing or shipping — I'm here to help.
          </p>
          <button type="button" onClick={() => { setOpen(true); setShowHint(false); }}
                  className="btn btn-primary btn-sm mt-3 w-full">Start chat</button>
        </div>
      )}

      {/* Launcher bubble — mid-right, clearly separate from the WhatsApp button */}
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setShowHint(false); }}
        aria-label={open ? "Close live chat" : "Open live chat"}
        aria-expanded={open}
        className="fixed right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-gold/60 bg-espresso text-gold shadow-[0_8px_28px_rgba(33,27,23,0.35)] transition-transform hover:scale-105"
        style={{ top: "45%", transform: "translateY(-50%)" }}
      >
        {open ? (
          <span aria-hidden="true" className="text-xl leading-none">✕</span>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-6 w-6">
            <path
              d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H9l-4 3.5V6.5Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <circle cx="9" cy="10" r="1" fill="currentColor" />
            <circle cx="12.5" cy="10" r="1" fill="currentColor" />
            <circle cx="16" cy="10" r="1" fill="currentColor" />
          </svg>
        )}
        {!open && !showHint && (
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-espresso bg-gold" aria-hidden="true" />
        )}
      </button>

      {/* Chat panel — full-screen chat view (fills mobile viewport, centered
          app-like screen on desktop) instead of a small floating box. */}
      {open && (
        <div
          role="dialog"
          aria-label="New Look Impex live chat"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col bg-ivory sm:items-center sm:justify-center sm:bg-espresso/70 sm:p-6"
        >
          <div className="flex h-full w-full flex-col overflow-hidden bg-ivory shadow-[0_24px_70px_rgba(33,27,23,0.45)] sm:h-[min(92vh,52rem)] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-gold/40">
          <div className="flex items-center justify-between gap-3 bg-espresso px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/60 text-gold" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H9l-4 3.5V6.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  <circle cx="9" cy="10" r="1" fill="currentColor" /><circle cx="12.5" cy="10" r="1" fill="currentColor" /><circle cx="16" cy="10" r="1" fill="currentColor" />
                </svg>
              </span>
              <div>
                <p className="font-serif text-base font-bold text-cream sm:text-lg">New Look Impex · Assistant</p>
                <p className="text-[10px] uppercase tracking-[0.16em] text-gold/90">
                  Export desk · Moradabad, India
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-full border border-cream/30 px-3 py-1.5 text-sm text-cream/80 transition-colors hover:bg-cream/10 hover:text-cream"
            >
              ✕ Close
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-6">
            {msgs.map((m) => (
              <div key={m.id} className={m.from === "you" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.from === "you"
                      ? "bg-navy text-cream"
                      : "border border-clay/20 bg-white text-charcoal"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  {m.products && m.products.length > 0 && (
                    <div className="mt-2.5 space-y-1.5">
                      {m.products.slice(0, 4).map(p => (
                        <Link key={p.id} href={`/products/${p.slug}`} onClick={() => setOpen(false)}
                          className="flex items-center justify-between gap-2 rounded-lg border border-gold/30 bg-ivory px-2.5 py-1.5 text-[11px] text-espresso hover:border-gold">
                          <span className="truncate">{p.name}</span><span className="text-clay" aria-hidden="true">→</span>
                        </Link>
                      ))}
                    </div>
                  )}
                  {m.actions && m.actions.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {m.actions.map((a) =>
                        a.href && !a.href.startsWith("http") ? (
                          <Link
                            key={a.label}
                            href={a.href}
                            onClick={() => setOpen(false)}
                            className="rounded-full border border-navy/40 px-2.5 py-1 text-[11px] font-semibold text-navy transition-colors hover:bg-navy hover:text-cream"
                          >
                            {a.label}
                          </Link>
                        ) : (
                          <button
                            key={a.label}
                            type="button"
                            onClick={() => runAction(a)}
                            className="rounded-full border border-navy/40 px-2.5 py-1 text-[11px] font-semibold text-navy transition-colors hover:bg-navy hover:text-cream"
                          >
                            {a.label}
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="rounded-xl border border-clay/20 bg-white px-4 py-3">
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray [animation-delay:-0.2s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray [animation-delay:-0.1s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray" />
                  </span>
                </div>
              </div>
            )}
          </div>

          {(awaitingConsent || fields.email) && (
            <label className="flex items-center gap-2 border-t border-clay/15 bg-ivory px-4 py-2 text-[11px] text-gray sm:px-6">
              <input type="checkbox" checked={consent} onChange={e => { setConsent(e.target.checked); setAwaitingConsent(false); }} className="h-3.5 w-3.5" />
              I agree that New Look Impex may use these details to reply to my wholesale enquiry.
            </label>
          )}
          <form onSubmit={send} className="flex items-center gap-2 border-t border-clay/20 bg-white px-4 py-3 sm:px-6">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message…"
              aria-label="Chat message"
              autoFocus
              className="min-w-0 flex-1 rounded-full border border-clay/30 bg-ivory px-4 py-2.5 text-sm text-charcoal outline-none placeholder:text-gray focus:border-gold"
            />
            <button type="submit" className="btn btn-primary" disabled={!input.trim()}>
              Send
            </button>
          </form>
          <p className="bg-white px-4 pb-3 text-center text-[10px] leading-snug text-gray sm:px-6">
            Automated assistant — prices, MOQ and delivery dates are confirmed in writing by our team.
          </p>
          </div>
        </div>
      )}
    </>
  );
}
