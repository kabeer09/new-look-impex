"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, mediaUrl } from "@/lib/api";
import type { Banner, Category, Collection, ProductCard as ProductCardType } from "@/lib/types";
import { ProductCard } from "@/components/public/ProductCard";
import { Loading, ErrorBox } from "@/components/public/States";
import { useRfqCart } from "@/lib/rfq";

const SERVICES = [
  {
    title: "Handcrafted Copper & Brass Manufacturing",
    text: "Direct from Moradabad — India's brass and copper capital. We manufacture urlis, diyas, lanterns, bottles, kitchenware, and home décor with verified artisan craftsmanship.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    title: "Wholesale & Bulk Supply",
    text: "Competitive wholesale pricing for retailers, importers, and distributors. Bulk orders, container-level supply, and consistent quality across large volumes.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    title: "Custom Manufacturing & Private Label",
    text: "Bespoke designs, custom sizes, finishes, engravings, and private labelling. OEM/ODM solutions tailored to your brand requirements.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    title: "Global Export & Logistics",
    text: "Export-ready packaging, documentation support, and worldwide shipping coordination. Serving USA, UK, UAE, Australia, Canada, Europe, and Saudi Arabia.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
];

const PROCESS_STEPS = [
  { num: "01", title: "Consultation & Requirement Analysis", text: "Share your product requirements, quantities, and destination. We analyze and recommend the best solutions." },
  { num: "02", title: "Supplier Matching & Sourcing", text: "We match your requirements with verified manufacturers in Moradabad and across India." },
  { num: "03", title: "Rigorous Quality Inspection", text: "Multi-stage quality checks covering material, dimensions, finish, and packaging." },
  { num: "04", title: "Documentation & Secure Freight", text: "Complete export documentation and secure freight coordination with tracking." },
  { num: "05", title: "Global Delivery & After-Sales Support", text: "Timely delivery to your destination with ongoing support for repeat orders." },
];

const FAQS = [
  { q: "Do you accept international wholesale orders?", a: "Yes. We handle bulk and export enquiries from buyers worldwide. Each order receives a written quotation with price, MOQ, lead time, and shipping terms." },
  { q: "What is your minimum order quantity (MOQ)?", a: "MOQs vary by product and finish. Each product page lists its MOQ. Custom and bulk quantities are quoted per enquiry." },
  { q: "Can products be customized?", a: "Yes. Custom sizes, finishes, engravings, and private labelling are available. Customization is quoted like any wholesale order." },
  { q: "Do you offer private labelling?", a: "Yes. Private label and OEM manufacturing are available for bulk orders. Discuss your requirements via Request a Quote." },
  { q: "Can buyers request samples?", a: "Sample availability and terms are confirmed per product on enquiry. Ask for samples when you request a quote." },
  { q: "What packaging options are available?", a: "Standard export packaging is used. Gift-box presentation is available on selected sets. Custom packaging is quoted per order." },
  { q: "Which countries do you export to?", a: "We export to USA, UK, UAE, Australia, Canada, Europe, Saudi Arabia, and other international markets." },
  { q: "How can buyers request a quotation?", a: "Browse the catalogue, add items to your enquiry list with quantities, and submit a Request a Quote. You receive a reference number and a written quotation." },
];

const MEDIA_BASE = "https://luqgcacxkcrmhsdopjyl.supabase.co/storage/v1/object/public/media/";

/** ── Automated seasonal campaigns (mirror of backend/app/campaigns.py) ──
 *  The API /api/public/active-campaign is authoritative; this client-side
 *  fallback keeps the site correct even if the API is briefly unreachable. */
type CampaignInfo = {
  code: string; name: string; short: string; emoji: string; percent: number;
  tagline: string; blurb: string; cta: string; ends_label: string;
};

const NLI_CALENDAR: Array<Omit<CampaignInfo, "ends_label"> & { m: number; d0: number; d1: number }> = [
  { code: "NEWYEAR25", name: "New Year Sale", short: "New Year", emoji: "🎆", percent: 25, m: 1, d0: 1, d1: 15, tagline: "Start the year in style — fresh stock, fresh prices", blurb: "Kick off the new year with a flat discount across Copper & Brass collections. New-year production slots are open for bulk orders.", cta: "Shop the New Year Sale" },
  { code: "LOVE15", name: "Valentine's Day Sale", short: "Valentine's", emoji: "💝", percent: 15, m: 2, d0: 7, d1: 14, tagline: "Gifts forged in metal — for the ones you love", blurb: "A flat discount on gifting favourites — copper drinkware sets and engraved brass décor, gift-wrapped and ready for February 14th.", cta: "Shop Valentine's Gifts" },
  { code: "SPRING20", name: "Spring Festival Sale", short: "Spring", emoji: "🌸", percent: 20, m: 3, d0: 10, d1: 31, tagline: "Spring refresh for retail shelves worldwide", blurb: "Storewide spring savings — refresh your shelves with hand-hammered copper and blooming brass florals.", cta: "Shop the Spring Sale" },
  { code: "EASTER15", name: "Easter Sale", short: "Easter", emoji: "🐣", percent: 15, m: 4, d0: 10, d1: 20, tagline: "Table-worthy brass & copper for the Easter season", blurb: "Easter savings on serving and table décor picks — trays, bowls and centrepieces finished for spring tables.", cta: "Shop the Easter Sale" },
  { code: "MOTHER20", name: "Mother's Day Sale", short: "Mother's Day", emoji: "💐", percent: 20, m: 5, d0: 1, d1: 10, tagline: "Happy Mother's Day — gifts as timeless as her", blurb: "Mother's Day savings on gift-ready copper drinkware and keepsake brass décor. Custom gift packaging available.", cta: "Shop Mother's Day Gifts" },
  { code: "FATHER20", name: "Father's Day Sale", short: "Father's Day", emoji: "👔", percent: 20, m: 6, d0: 12, d1: 21, tagline: "Happy Father's Day — for the man who has everything", blurb: "Father's Day savings — copper mugs, bar sets and brass accents he will actually keep.", cta: "Shop Father's Day Gifts" },
  { code: "SUMMER25", name: "Summer Sale", short: "Summer", emoji: "☀️", percent: 25, m: 7, d0: 1, d1: 31, tagline: "High summer, hot prices — storewide savings", blurb: "Summer-long savings — copper pitchers and barware shine in July. Stock up before the festive buying season.", cta: "Shop the Summer Sale" },
  { code: "FREEDOM15", name: "Independence Day Sale", short: "Independence Day", emoji: "🇮🇳", percent: 15, m: 8, d0: 10, d1: 17, tagline: "Crafted in India — proud of it", blurb: "Celebrating India's Independence Day with savings on the heritage craft of Moradabad's metalworkers.", cta: "Shop the Independence Day Sale" },
  { code: "FESTIVE20", name: "Festive Season Preview", short: "Festive", emoji: "🪔", percent: 20, m: 9, d0: 1, d1: 30, tagline: "Diwali & festive buying starts here — order early", blurb: "The festive preview — brass urlis, diyas and lanterns ahead of the Diwali rush. Book production slots early.", cta: "Shop the Festive Preview" },
  { code: "AUTPREP15", name: "Autumn Preview Sale", short: "Autumn Preview", emoji: "🍂", percent: 15, m: 10, d0: 1, d1: 14, tagline: "Autumn is coming — new stock just landed", blurb: "Early-autumn savings — first pick of new copper cookware and brass décor before Halloween week.", cta: "Shop the Autumn Preview" },
  { code: "HALLOWEEN30", name: "Halloween Sale", short: "Halloween", emoji: "🎃", percent: 30, m: 10, d0: 15, d1: 31, tagline: "Trick or treat — treat yourself", blurb: "The biggest spooky-season discount on all Copper & Brass collections — this week only. While stock lasts.", cta: "Shop the Halloween Sale" },
  { code: "AUTUMN25", name: "Autumn Sale", short: "Autumn", emoji: "🍁", percent: 25, m: 11, d0: 1, d1: 19, tagline: "Autumn styling, autumn savings", blurb: "Storewide autumn savings — hand-hammered copper and engraved brass, fresh from Moradabad workshops.", cta: "Shop the Autumn Sale" },
  { code: "BLACKFRIDAY30", name: "Black Friday Sale", short: "Black Friday", emoji: "🛍️", percent: 30, m: 11, d0: 20, d1: 30, tagline: "The biggest sale of the year — Black Friday & Cyber Monday", blurb: "Our biggest discount of the year, live through Black Friday and Cyber Monday. While stock lasts.", cta: "Shop Black Friday" },
  { code: "XMAS25", name: "Christmas Sale", short: "Christmas", emoji: "🎄", percent: 25, m: 12, d0: 1, d1: 26, tagline: "Merry Christmas — handmade gifts from Moradabad", blurb: "Christmas savings on heirloom-quality brass and copper gifts, beautifully wrapped. Order before shipping cut-offs.", cta: "Shop the Christmas Sale" },
  { code: "NYEAR20", name: "New Year Countdown", short: "New Year", emoji: "⏳", percent: 20, m: 12, d0: 27, d1: 31, tagline: "Countdown to the new year — last chance prices", blurb: "Final sale days of the year — prices reset when the calendar turns. Lock in new-year stock now.", cta: "Shop the Countdown Sale" },
];

const MONTHS_SHORT = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function campaignForDate(now: Date): CampaignInfo {
  const mi = now.getMonth(), day = now.getDate();
  const hit = NLI_CALENDAR.find((c) => c.m === mi + 1 && day >= c.d0 && day <= c.d1);
  if (hit) return { ...hit, ends_label: `${hit.d1} ${MONTHS_SHORT[hit.m - 1]}` };
  return { code: "WELCOME10", name: "Welcome Offer", short: "Welcome", emoji: "🤝", percent: 10, tagline: "New buyers welcome — 10% off your first order", blurb: "A standing welcome to New Look Impex — Moradabad's premier copper & brass manufacturer. New buyers save on their first order.", cta: "Shop the Welcome Offer", ends_label: "always on" };
}

/** Evergreen ticker lines shown alongside the seasonal campaign */
const OFFER_STATIC = [
  "🚚  Free Worldwide Shipping on Bulk Orders Above $5,000",
  "🎁  Custom Gift Packaging & Private Label on Request",
];

/** Image slideshow below the Copper Collection section */
const SHOWCASE_SLIDES = [
  { src: "/slideshow-1.jpg", tag: "Autumn Edit", caption: "Hand-Hammered Copper Pitchers — Autumn Styling", alt: "Hand-hammered copper pitcher with autumn flowers — copper jug manufacturer and wholesale exporter Moradabad India" },
  { src: "/slideshow-2.jpg", tag: "Wellness", caption: "Copper Drinkware — Hydration, Designed Beautifully", alt: "Copper jug, glasses and bottles set — copper drinkware manufacturer and bulk supplier Moradabad India" },
  { src: "/slideshow-3.jpg", tag: "Artisanal Brass", caption: "The Artisanal Brass Collection — Handcrafted Heritage", alt: "Engraved brass canisters, spice box and tea strainer — brass kitchenware manufacturer and exporter Moradabad India" },
];

/** Pinterest-lookbook card header used across homepage sections (Halloween-popup DNA). */
function SectionCard(props: {
  id: string;
  eyebrow: string;
  title: string;
  blurb: string;
  badge?: string;
  variant?: "navy" | "clay";
  imgA?: string | null;
  imgB?: string | null;
  actions: React.ReactNode;
}) {
  const { id, eyebrow, title, blurb, badge, variant = "navy", imgA, imgB, actions } = props;
  const grad = variant === "navy" ? "from-navy via-navy to-clay-dark" : "from-clay-dark via-navy to-navy";
  return (
    <div className="relative rounded-3xl overflow-hidden shadow-xl mb-6">
      <div className={`absolute inset-0 bg-gradient-to-br ${grad}`} aria-hidden="true" />
      <div className="relative grid md:grid-cols-[1.15fr_0.85fr] items-center gap-6 p-6 md:p-10">
        <div>
          <p className="text-gold uppercase tracking-[0.25em] text-xs font-semibold">{eyebrow}</p>
          <h2 id={id} className="font-serif font-bold text-3xl md:text-4xl text-cream mt-2">{title}</h2>
          <p className="text-cream/80 mt-3 max-w-lg text-sm leading-relaxed">{blurb}</p>
          <div className="mt-5 flex flex-wrap gap-3">{actions}</div>
        </div>
        {imgA && (
          <div className="relative h-44 md:h-56 hidden md:block" aria-hidden="true">
            <div className="absolute right-24 top-2 w-32 md:w-36 -rotate-6 rounded-2xl overflow-hidden ring-4 ring-cream/90 shadow-2xl bg-cream">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgA} alt="" className="w-full aspect-square object-cover" loading="lazy" />
            </div>
            <div className="absolute right-0 bottom-0 w-36 md:w-44 rotate-3 rounded-2xl overflow-hidden ring-4 ring-gold/60 shadow-2xl bg-cream">
              {imgB ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imgB} alt="" className="w-full aspect-[4/5] object-cover" loading="lazy" />
              ) : (
                <div className="w-full aspect-[4/5] bg-cream/20" />
              )}
              {badge && (
                <span className="absolute top-2 left-2 bg-gold text-navy text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
                  {badge}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomeClient() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [featured, setFeatured] = useState<ProductCardType[] | null>(null);
  const [dataError, setDataError] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [slide, setSlide] = useState(0);
  const [offer, setOffer] = useState(0);
  const [subEmail, setSubEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const [subStatus, setSubStatus] = useState<{ ok: boolean; text: string } | null>(null);

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
    Promise.allSettled([
      api<{ items: Category[] }>("/api/public/categories"),
      api<{ items: ProductCardType[] }>("/api/public/products?sort=featured&page_size=24"),
    ]).then((results) => {
      if (cancelled) return;
      const [cats, feats] = results;
      if (cats.status === "fulfilled") setCategories(cats.value.items || []);
      if (feats.status === "fulfilled") setFeatured(feats.value.items || []);
      if (results.some((r) => r.status === "rejected")) setDataError("Some sections could not be loaded.");
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % SHOWCASE_SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  // ── Automated seasonal campaign (rotates by date: Halloween, Black Friday, Christmas, …) ──
  const [campaign, setCampaign] = useState<CampaignInfo | null>(null);
  useEffect(() => {
    api<CampaignInfo>("/api/public/active-campaign").then(setCampaign).catch(() => undefined);
  }, []);
  const camp: CampaignInfo = campaign || campaignForDate(new Date());

  const offerMessages = [
    `${camp.emoji}  ${camp.name.toUpperCase()} — FLAT ${camp.percent}% OFF STOREWIDE`,
    camp.ends_label === "always on"
      ? `USE CODE ${camp.code} — NEW BUYERS WELCOME`
      : `USE CODE ${camp.code} — VALID TILL ${camp.ends_label.toUpperCase()}`,
    `✨  ${camp.tagline}`,
    ...OFFER_STATIC,
  ];

  useEffect(() => {
    const t = setInterval(() => setOffer((o) => (o + 1) % offerMessages.length), 3500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const bothMix = [...copperAll.slice(4, 6), ...brassAll.slice(0, 2)];

  // ── Shopify-style Halloween offer popup (once per session, after ~6s) ──
  const [showPopup, setShowPopup] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem("nli_popup_seen")) return;
    } catch { /* storage unavailable */ }
    const t = setTimeout(() => setShowPopup(true), 6000);
    return () => clearTimeout(t);
  }, []);
  const closePopup = () => {
    setShowPopup(false);
    try { sessionStorage.setItem("nli_popup_seen", "1"); } catch { /* ignore */ }
  };
  const copyCode = () => {
    try {
      navigator.clipboard?.writeText(camp.code).then(() => setCopiedCode(true));
    } catch { /* clipboard unavailable */ }
    setCopiedCode(true);
  };

  // ── Shopify-style "Recent orders" social proof toasts (bottom-left) ──
  const PING_CITIES = [
    "Dubai, UAE", "London, UK", "Sydney, Australia", "New York, USA",
    "Toronto, Canada", "Riyadh, KSA", "Kuala Lumpur, Malaysia", "Frankfurt, Germany",
    "Los Angeles, USA", "Manchester, UK",
  ];
  const [ping, setPing] = useState<null | { name: string; img: string | null; qty: number; where: string; mins: number }>(null);
  const [pingClosed, setPingClosed] = useState(false);
  useEffect(() => {
    if (pingClosed) return;
    let alive = true;
    let hideT: ReturnType<typeof setTimeout> | null = null;
    const showPing = () => {
      if (!alive) return;
      const list = featured || [];
      if (list.length > 0) {
        const p = list[Math.floor(Math.random() * list.length)];
        setPing({
          name: p.name,
          img: p.image?.url?.startsWith("http") ? p.image.url : (p.image?.url ? `https://new-look-impex-api.onrender.com${p.image.url}` : null),
          qty: [24, 48, 50, 100, 120, 200, 250][Math.floor(Math.random() * 7)],
          where: PING_CITIES[Math.floor(Math.random() * PING_CITIES.length)],
          mins: [2, 3, 5, 7, 9, 12][Math.floor(Math.random() * 6)],
        });
        hideT = setTimeout(() => { if (alive) setPing(null); }, 7000);
      }
    };
    const iv = setInterval(showPing, 22000);
    const first = setTimeout(showPing, 12000);
    return () => { alive = false; clearInterval(iv); clearTimeout(first); if (hideT) clearTimeout(hideT); };
  }, [featured, pingClosed]);

  return (
    <>
      {/* Hero Section — Pinterest editorial, copper & brass tones */}
      <section className="relative bg-cream text-navy overflow-hidden">
        {/* warm glow blobs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gold/20 blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="absolute top-40 -right-24 w-[28rem] h-[28rem] rounded-full bg-clay/15 blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 rounded-full bg-sand/70 blur-2xl pointer-events-none" aria-hidden="true" />

        <div className="relative container-x py-14 md:py-20">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            {/* Copy */}
            <div className="order-2 md:order-1">
              <p className="text-clay uppercase tracking-[0.28em] text-xs font-semibold">✦ Timeless Heritage ✦</p>
              <h1 className="font-serif font-bold text-4xl md:text-5xl lg:text-6xl mt-4 leading-[1.08]">
                Elevate Every Interior. Timeless{" "}
                <em className="font-serif italic text-clay">Copper</em> &amp;{" "}
                <em className="font-serif italic text-gold">Brass</em>{" "}
                Masterpieces.
              </h1>
              <p className="mt-5 text-navy/70 max-w-xl text-base md:text-lg leading-relaxed">
                Artisan collections from Moradabad — hand-hammered, export-ready. Premium
                craftsmanship for <strong className="text-navy">retailers, wholesalers, interior designers,
                and corporate importers</strong> — end-to-end manufacturing, quality assurance and export logistics.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/products" className="btn bg-clay text-cream hover:bg-clay-dark !px-6 !py-3 shadow-lg shadow-clay/25">Explore Our Catalog</Link>
                <Link href="/request-quote" className="btn bg-transparent border-2 !border-clay !text-clay hover:bg-clay hover:!text-cream !px-6 !py-3">
                  Partner With Us
                </Link>
              </div>
              <form className="mt-6 flex flex-col sm:flex-row gap-2 max-w-xl" role="search" onSubmit={(e) => {
                e.preventDefault();
                const query = q.trim();
                router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
              }}>
                <label htmlFor="hero-search" className="sr-only">Search the catalogue</label>
                <input id="hero-search" className="input !py-3 flex-1 bg-white" placeholder='Try "brass urli" or "copper diya"…' value={q} onChange={(e) => setQ(e.target.value)} />
                <button type="submit" className="btn bg-clay text-cream hover:bg-clay-dark !py-3">Search</button>
              </form>
            </div>

            {/* Visual collage — arch frame + floating polaroids */}
            <div className="relative order-1 md:order-2 flex justify-center pb-10 md:pb-6">
              <div className="relative w-64 md:w-80 lg:w-96">
                <div className="relative rounded-t-[999px] rounded-b-[2rem] overflow-hidden ring-4 ring-gold/50 shadow-2xl bg-cream">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/hero-banner.png"
                    onError={(e) => { const t = e.currentTarget; if (!t.dataset.fb) { t.dataset.fb = "1"; t.src = "https://luqgcacxkcrmhsdopjyl.supabase.co/storage/v1/object/public/media/banner-featured-collection.jpg"; } }}
                    alt="Brass cookware — New Look Impex"
                    className="w-full aspect-[3/4] object-cover"
                    fetchPriority="high" loading="eager" width={1024} height={1024} />
                </div>
                <div className="absolute -bottom-8 -left-10 md:-left-16 w-24 md:w-32 -rotate-6 rounded-xl overflow-hidden ring-4 ring-cream shadow-xl bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/slideshow-1.jpg" alt="" aria-hidden="true" className="w-full aspect-square object-cover" loading="lazy" />
                </div>
                <div className="absolute bottom-16 -right-6 md:-right-12 w-20 md:w-28 rotate-6 rounded-xl overflow-hidden ring-4 ring-gold/70 shadow-xl bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/slideshow-3.jpg" alt="" aria-hidden="true" className="w-full aspect-square object-cover" loading="lazy" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Shop by Category */}
      <section className="section" aria-labelledby="shop-by-category">
        <div className="container-x">
          <div className="text-center mb-8">
            <p className="eyebrow text-clay">Browse</p>
            <h2 id="shop-by-category" className="font-sans font-bold text-navy text-2xl md:text-3xl mt-2">Shop by Category</h2>
            <p className="text-gray mt-1 text-sm">Browse the catalogue by craft range</p>
          </div>
          {categories === null ? <Loading label="Loading categories…" /> : categories.length === 0 ? (
            <p className="text-sm text-gray text-center">Categories will appear here once published.</p>
          ) : (
            <div className="flex flex-wrap justify-center gap-6 md:gap-8">
              {categories.filter((c) => !["Brass Urlis", "Copper Urlis", "Brass Diyas", "Metal Diyas", "Brass Lanterns", "Decorative Bowls", "Copper Handicrafts", "Brass Handicrafts", "Metal Home Décor", "Metal Home Decor"].includes(c.name)).slice(0, 8).map((c) => (
                <Link key={c.slug} href={`/categories/${c.slug}`} className="group flex flex-col items-center text-center">
                  <span className="relative block w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-cream ring-2 ring-clay/25 group-hover:ring-clay transition-all">
                    {c.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.image_url.startsWith("http") ? c.image_url : `https://new-look-impex-api.onrender.com${c.image_url}`} alt={`${c.name} — wholesale handcrafted by New Look Impex, brass & copper products manufacturer and exporter in Moradabad, India`} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center font-serif text-5xl font-bold text-clay/70" aria-hidden="true">
                        {c.name.trim().charAt(0).toUpperCase() || "N"}
                      </span>
                    )}
                  </span>
                  <span className="block mt-3 text-[13px] font-semibold tracking-wide text-navy uppercase group-hover:text-clay">
                    {c.name}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* New Arrivals - Copper Cookware (lookbook card header) */}
      <section className="section !pb-0" aria-labelledby="new-arrivals">
        <div className="container-x">
          <SectionCard
            id="new-arrivals"
            eyebrow="✨ Latest"
            title="New Arrivals"
            blurb="Fresh from the artisan bench — premium copper cookware, hand-hammered kitchenware for healthy cooking and elegant serving."
            badge="🆕 Just Landed"
            imgA={toFullUrl(copperAll[0]?.image?.url)}
            imgB={toFullUrl(copperAll[1]?.image?.url)}
            actions={
              <>
                <Link href="/categories/copper-kitchenware" className="btn bg-gold text-navy hover:bg-cream">Shop Copper Cookware</Link>
                <Link href="/products?sort=newest" className="btn border border-cream/40 text-cream hover:bg-cream/10">View All New Arrivals →</Link>
              </>
            }
          />
          {featured === null ? <Loading label="Loading new arrivals…" /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              {copperAll.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* Material — Copper & Brass Collections */}
      <section className="section bg-sand/30" aria-labelledby="copper-collection">
        <div className="container-x">
          <SectionCard
            id="copper-collection"
            eyebrow="Material"
            title="Copper & Brass Collections"
            blurb="The best of both metals — hand-hammered copper cookware and planters beside engraved brass kitchenware, urlis and décor. Solid, food-safe, and built to last."
            badge="🤝 Best of Both"
            imgA={toFullUrl(copperAll[4]?.image?.url)}
            imgB={toFullUrl(brassAll[0]?.image?.url)}
            actions={
              <>
                <Link href="/products?material=Copper" className="btn bg-gold text-navy hover:bg-cream">Shop Copper</Link>
                <Link href="/products?material=Brass" className="btn border border-cream/40 text-cream hover:bg-cream/10">Shop Brass →</Link>
              </>
            }
          />
          {featured === null ? <Loading label="Loading…" /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              {bothMix.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* Autumn Showcase — Rotating Offers + Image Slideshow */}
      <section className="section !pt-8 bg-navy" aria-labelledby="autumn-showcase">
        <div className="container-x">
          <h2 id="autumn-showcase" className="sr-only">Autumn Collection Showcase</h2>

          {/* Rotating offer announcements (Shopify-style) — driven by the live campaign */}
          <div className="bg-clay text-cream rounded-lg md:rounded-full h-10 md:h-11 px-4 md:px-8 flex items-center justify-center text-center mb-6" role="status" aria-live="polite">
            <span key={offer} className="nli-rotate-in whitespace-nowrap overflow-hidden text-ellipsis text-[11px] md:text-sm font-semibold tracking-wide">
              {offerMessages[offer % offerMessages.length]}
            </span>
          </div>

          {/* Image slideshow — aspect ratio matches image (16:9) so nothing is cropped */}
          <div className="relative rounded-2xl overflow-hidden w-full aspect-[16/9] group" aria-roledescription="carousel">
            {SHOWCASE_SLIDES.map((s, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={s.src} src={s.src} alt={s.alt}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${i === slide ? "opacity-100" : "opacity-0"}`}
                loading={i === 0 ? "eager" : "lazy"} width={800} height={640} />
            ))}
            {SHOWCASE_SLIDES.map((s, i) => (
              <div key={`cap-${i}`} className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/95 via-navy/50 to-transparent pt-16 pb-6 px-6 md:px-10 transition-opacity duration-500 ${i === slide ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                <p className="text-gold text-[11px] md:text-xs uppercase tracking-[0.28em] font-semibold">{s.tag}</p>
                <h3 className="text-cream font-serif font-bold text-xl md:text-3xl mt-1">{s.caption}</h3>
              </div>
            ))}

            {/* Prev / Next */}
            <button type="button" aria-label="Previous slide"
              onClick={() => setSlide((s) => (s - 1 + SHOWCASE_SLIDES.length) % SHOWCASE_SLIDES.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 md:w-10 md:h-10 rounded-full bg-cream/90 text-navy flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button type="button" aria-label="Next slide"
              onClick={() => setSlide((s) => (s + 1) % SHOWCASE_SLIDES.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 md:w-10 md:h-10 rounded-full bg-cream/90 text-navy flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
            </button>

            {/* Dots */}
            <div className="absolute bottom-3 right-4 flex gap-1.5">
              {SHOWCASE_SLIDES.map((s, i) => (
                <button key={`dot-${i}`} type="button" aria-label={`Go to slide ${i + 1}`}
                  onClick={() => setSlide(i)}
                  className={`w-2 h-2 rounded-full transition-all ${i === slide ? "bg-gold w-5" : "bg-cream/50 hover:bg-cream/80"}`} />
              ))}
            </div>
          </div>

          <div className="text-center mt-6">
            <Link href="/products" className="btn btn-clay !px-6 !py-3">Shop the Autumn Collection</Link>
          </div>
        </div>
      </section>

      {/* Core Services */}
      <section className="section bg-sand/40" aria-labelledby="services">
        <div className="container-x">
          <div className="text-center mb-10">
            <p className="eyebrow text-clay">What We Do</p>
            <h2 id="services" className="font-sans font-bold text-navy text-2xl md:text-3xl mt-2">Core Services</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {SERVICES.map((s) => (
              <div key={s.title} className="card hover:shadow-lg transition-shadow">
                <div className="text-clay mb-3">{s.icon}</div>
                <h3 className="font-sans font-bold text-navy text-lg">{s.title}</h3>
                <p className="text-sm text-gray mt-2">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Choose Better for Your Home */}
      <section className="section bg-cream" aria-labelledby="choose-better">
        <div className="container-x">
          <div className="text-center mb-10">
            <p className="eyebrow text-clay">Healthy Living</p>
            <h2 id="choose-better" className="font-sans font-bold text-navy text-2xl md:text-3xl mt-2">
              Choose Better for Your Home
            </h2>
            <p className="text-gray mt-2 max-w-2xl mx-auto text-sm">
              Because a healthy home builds a healthy life. Discover our handcrafted copper and brass collections
              that bring wellness, elegance, and tradition to your everyday living.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {featured === null ? <Loading label="Loading products…" /> : (
              (featured || []).slice(0, 8).map((p) => (
                <Link key={p.id} href={`/products/${p.slug}`} className="group block bg-white rounded-2xl overflow-hidden border border-sand shadow-sm hover:shadow-lg transition-shadow">
                  <div className="relative aspect-square bg-cream overflow-hidden">
                    {p.image?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image.url.startsWith("http") ? p.image.url : `https://new-look-impex-api.onrender.com${p.image.url}`}
                        alt={`${p.name} — handcrafted ${p.material || "brass"} product wholesale from New Look Impex, Moradabad`}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center font-serif text-5xl font-bold text-clay/40">
                        {p.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-sans font-semibold text-navy text-sm leading-snug">{p.name}</h3>
                    <p className="text-xs text-gray mt-1">{[p.material, p.finish].filter(Boolean).join(" · ")}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
          <div className="text-center mt-8">
            <Link href="/products" className="btn btn-clay !px-6 !py-3">Explore All Products</Link>
          </div>
        </div>
      </section>

      {/* Gifts Handcrafted in Copper */}
      <section className="section bg-sand/30" aria-labelledby="copper-gifts">
        <div className="container-x">
          <SectionCard
            id="copper-gifts"
            eyebrow="🎁 Gifts"
            title="Gifts Handcrafted in Copper"
            blurb="Premium copper drinkware gift sets for weddings, festivals and every celebration. Thoughtful. Timeless. Beautifully wrapped — customised gift packaging available for corporate programmes."
            badge="🎁 Gift Ready"
            imgA={toFullUrl(copperAll[8]?.image?.url)}
            imgB={toFullUrl(copperAll[9]?.image?.url)}
            actions={
              <>
                <Link href="/products?material=Copper" className="btn bg-gold text-navy hover:bg-cream">Shop Gift Sets</Link>
                <Link href="/gifting" className="btn border border-cream/40 text-cream hover:bg-cream/10">Corporate Gifting →</Link>
              </>
            }
          />
          {featured === null ? <Loading label="Loading…" /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              {copperAll.length > 12 ? copperAll.slice(8, 12).map((p) => <ProductCard key={p.id} product={p} />) : copperAll.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* Brass Collection Showcase */}
      <section className="section" aria-labelledby="brass-showcase">
        <div className="container-x">
          <SectionCard
            id="brass-showcase"
            eyebrow="✨ Collection"
            title="Brass Collection"
            blurb="Engraved brass urlis, diyas, lanterns, vases and décor — the metal handicrafts Moradabad has been famous for, finished for modern homes worldwide."
            badge="✨ Signature Metal"
            imgA={toFullUrl(brassAll[0]?.image?.url)}
            imgB={toFullUrl(brassAll[1]?.image?.url)}
            actions={
              <>
                <Link href="/products?material=Brass" className="btn bg-gold text-navy hover:bg-cream">Shop Brass Collection</Link>
                <Link href="/products?category=brass-kitchenware" className="btn border border-cream/40 text-cream hover:bg-cream/10">Brass Kitchenware →</Link>
              </>
            }
          />
          {featured === null ? <Loading label="Loading…" /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              {brassAll.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* Featured Products */}
      <section className="section" aria-labelledby="featured-products">
        <div className="container-x">
          <SectionCard
            id="featured-products"
            eyebrow="⭐ Best Sellers"
            title="Our Most Loved & Top-Selling Products"
            blurb="A rotating mix from every category — copper drinkware, brass décor, festive pieces and gifting, hand-picked by our buyers from real order trends."
            badge="⭐ Most Loved"
            imgA={toFullUrl(ft[8]?.image?.url)}
            imgB={toFullUrl(ft[9]?.image?.url)}
            actions={
              <>
                <Link href="/products" className="btn bg-gold text-navy hover:bg-cream">View All Products</Link>
                <Link href="/request-quote" className="btn border border-cream/40 text-cream hover:bg-cream/10">Request a Quote →</Link>
              </>
            }
          />
          {featured === null ? <Loading label="Loading products…" /> : ft.length === 0 ? (
            <p className="text-sm text-gray">No featured products published yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              {ft.slice(8, 12).map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* About Us / Corporate Vision */}
      <section className="section bg-sand/30" aria-labelledby="about">
        <div className="container-x">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="eyebrow text-clay">Our Story</p>
              <h2 id="about" className="font-sans font-bold text-navy text-3xl md:text-4xl mt-2">
                Excellence in Global Trade, Built on Trust &amp; Precision
              </h2>
              <p className="text-gray mt-4 leading-relaxed">
                New Look Impex is a Moradabad-based manufacturer and exporter of handcrafted brass and copper handicrafts.
                We deliver premium metalware to retailers, importers, and distributors worldwide. GSTIN: 09AFKPA4462R1ZW.
              </p>
              <p className="text-gray mt-3 leading-relaxed">
                Every product is crafted with attention to material quality, finish consistency, and export-ready packaging.
                We handle bulk orders, custom manufacturing, private labelling, and corporate gifting programmes. Our
                products are available in copper and brass finishes — hammered, polished, matte, and antique — across
                urlis, diyas, lanterns, bottles, kitchenware, and home décor collections.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/about" className="btn btn-clay">Learn More</Link>
                <Link href="/craft" className="btn btn-outline">Our Craft</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Trade Process */}
      <section className="section" aria-labelledby="process">
        <div className="container-x">
          <div className="text-center mb-10">
            <p className="eyebrow text-clay">How We Work</p>
            <h2 id="process" className="font-sans font-bold text-navy text-2xl md:text-3xl mt-2">Our Trade Process</h2>
            <p className="text-gray mt-1 text-sm">End-to-end B2B sourcing and export process</p>
          </div>
          <div className="grid md:grid-cols-5 gap-4">
            {PROCESS_STEPS.map((step) => (
              <div key={step.num} className="card text-center">
                <div className="w-12 h-12 rounded-full bg-clay text-white flex items-center justify-center font-bold text-lg mx-auto mb-3">
                  {step.num}
                </div>
                <h3 className="font-sans font-bold text-navy text-sm">{step.title}</h3>
                <p className="text-xs text-gray mt-2">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Craft / Helping Artisans Grow */}
      <section className="section !pt-0" aria-labelledby="craft-story">
        <div className="container-x">
          <div className="grid md:grid-cols-2 gap-0 bg-white border border-sand overflow-hidden rounded-2xl">
            <div className="relative min-h-72 bg-navy overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://luqgcacxkcrmhsdopjyl.supabase.co/storage/v1/object/public/media/craft-story-moradabad.jpg"
                alt="Artisan hand-crafting a copper vessel" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="p-8 md:p-12">
              <p className="eyebrow text-clay">Our Craft</p>
              <h2 id="craft-story" className="font-sans font-bold text-navy text-3xl md:text-4xl mt-2">New Look Impex – Bringing Indian Brass &amp; Copper Craftsmanship to the World</h2>
              <div className="text-gray space-y-4 mt-4">
                <p>New Look Impex (NLI Collections) is an India-based manufacturer and exporter of handcrafted brass products, copper handicrafts, traditional Indian metal crafts, home décor, festive decorations and premium gifting collections.</p>
                <p>Based in Moradabad, Uttar Pradesh, India — a city internationally recognised for its brass and metal craftsmanship — New Look Impex combines traditional Indian artistry with contemporary product designs to serve international retailers, wholesalers, importers, distributors and gifting businesses.</p>
                <p>Under the leadership of CEO Mr. Suhel Ahmed, New Look Impex has developed an international business perspective through extensive exposure to global trade markets, including the Canton Fair in China, Hong Kong trade fairs, and international exhibitions in Dubai.</p>
              </div>
              <Link href="/about" className="btn btn-clay mt-4">Learn More About Us</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Brand Story */}
      <section className="section bg-sand/30" aria-labelledby="brand-story">
        <div className="container-x">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="relative min-h-72 bg-navy overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://luqgcacxkcrmhsdopjyl.supabase.co/storage/v1/object/public/media/craft-story-moradabad.jpg"
                alt="New Look Impex brand story"
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div>
              <p className="eyebrow text-clay">Our Brand Story</p>
              <h2 id="brand-story" className="font-sans font-bold text-navy text-3xl md:text-4xl mt-2">
                Rooted in Moradabad. Crafted for the World.
              </h2>
              <p className="text-gray mt-4 leading-relaxed">
                New Look Impex (NLI Collections) is a Moradabad-based manufacturer and exporter of handcrafted brass and
                copper handicrafts. Rooted in a city renowned for its metalcraft heritage, we combine traditional artisan
                skills with modern quality standards to serve global retailers, importers, and distributors.
              </p>
              <p className="text-gray mt-3 leading-relaxed">
                Our product range spans copper bottles and drinkware, copper kitchenware, brass home décor, brass urlis,
                diyas, lanterns, and luxury gifting collections. Every piece is crafted with attention to material
                quality, finish consistency, and export-ready packaging.
              </p>
              <p className="text-gray mt-3 leading-relaxed">
                We serve buyers across the USA, UK, UAE, Australia, Canada, Europe, and Saudi Arabia with bulk orders,
                custom manufacturing, private labelling, and corporate gifting programmes. Each order receives a written
                quotation with price, MOQ, lead time, and shipping terms.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/about" className="btn btn-clay">Learn More About Us</Link>
                <Link href="/craft" className="btn btn-outline">Our Craft</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* B2B Trade Banner */}
      <section className="section !pt-0" aria-labelledby="b2b-banner">
        <div className="container-x">
          <div className="bg-navy text-white p-8 md:p-12 rounded-2xl text-center">
            <h2 id="b2b-banner" className="font-sans font-bold text-2xl md:text-3xl">Looking for Custom Designs or Private Label Manufacturing?</h2>
            <p className="text-white/70 mt-3 max-w-2xl mx-auto">We offer bespoke manufacturing, custom finishes, private labelling, and OEM solutions for international buyers. Book a virtual showroom tour or submit an RFQ.</p>
            <div className="mt-6 flex flex-wrap gap-3 justify-center">
              <Link href="/request-quote" className="btn btn-clay !px-6 !py-3">Submit RFQ</Link>
              <Link href="/customisation" className="btn !px-6 !py-3 border border-white text-white hover:bg-white hover:text-navy">Book Virtual Showroom Tour</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Follow Our Craft */}
      <section className="section" aria-labelledby="social">
        <div className="container-x">
          <div className="text-center mb-8">
            <p className="eyebrow text-clay">Connect</p>
            <h2 id="social" className="font-sans font-bold text-navy text-2xl md:text-3xl mt-2">Follow Our Craft</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <a href="https://www.instagram.com/nli_collections_india" target="_blank" rel="noopener noreferrer" className="card flex items-center gap-4 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xl font-bold">IG</div>
              <div><p className="font-semibold text-navy">Instagram</p><p className="text-xs text-gray">@nli_collections_india</p></div>
            </a>
            <a href="https://youtube.com/@nlicollections" target="_blank" rel="noopener noreferrer" className="card flex items-center gap-4 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-white text-xl font-bold">YT</div>
              <div><p className="font-semibold text-navy">YouTube</p><p className="text-xs text-gray">@nlicollections</p></div>
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section bg-sand/40" aria-labelledby="faq">
        <div className="container-x max-w-3xl">
          <div className="text-center mb-8">
            <p className="eyebrow text-clay">Support</p>
            <h2 id="faq" className="font-sans font-bold text-navy text-2xl md:text-3xl mt-2">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-2">
            {FAQS.map((f, i) => (
              <div key={i} className="bg-white border border-sand rounded-xl">
                <button type="button" className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left" onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i}>
                  <span className="font-sans font-semibold text-navy">{f.q}</span>
                  <span className="text-clay text-xl">{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && <div className="px-5 pb-4 text-sm text-gray leading-relaxed">{f.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mix Collection — all products in one view for every visitor */}
      <section className="section" aria-labelledby="mix-collection">
        <div className="container-x">
          <SectionCard
            id="mix-collection"
            eyebrow="🧩 Everything, One Place"
            title="The Mix Collection — All Products"
            blurb="Every range in one scroll — brass, copper, home décor, festive and gifting, mixed across categories so you see the whole catalogue in seconds."
            badge="🧩 Every Range Here"
            imgA={toFullUrl(ft[12]?.image?.url)}
            imgB={toFullUrl(ft[13]?.image?.url)}
            actions={
              <>
                <Link href="/products" className="btn bg-gold text-navy hover:bg-cream">View All Products</Link>
                <Link href="/categories" className="btn border border-cream/40 text-cream hover:bg-cream/10">Browse by Category →</Link>
              </>
            }
          />
          {featured === null ? <Loading label="Loading mix collection…" /> : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {ft.slice(12, 20).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
          <div className="text-center mt-8">
            <Link href="/products" className="btn btn-clay !px-6 !py-3">View All Products →</Link>
          </div>
        </div>
      </section>

      {/* ── Shop By Metals — brassglobe-style SEO section with regional/Hindi keywords ── */}
      <section className="section" aria-labelledby="shop-by-metals">
        <div className="container-x">
          <div className="text-center mb-10">
            <p className="eyebrow text-clay">Shop by Metal</p>
            <h2 id="shop-by-metals" className="font-serif font-bold text-navy text-3xl md:text-4xl mt-2">
              Copper, Brass &amp; Bronze Utensils — Handcrafted in Moradabad
            </h2>
            <p className="text-gray mt-2 max-w-2xl mx-auto text-sm">
              Choose your metal. From tamba (copper) drinkware to pital ke bartan (brass utensils)
              and kansa (bronze) dinnerware — every piece is hand-hammered by our artisans and
              factory-direct for wholesale buyers worldwide.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Link
              href="/products?material=Copper"
              className="group relative rounded-3xl overflow-hidden border border-sand bg-cream hover:border-clay transition-all"
              aria-label="Shop copper utensils — copper cookware, bottles, jugs and mugs manufacturer in Moradabad"
            >
              <div className="aspect-[4/5] bg-sand/40 relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={toFullUrl(copperAll[0]?.image?.url) || "/hero-banner.png"}
                  alt="Copper utensils — copper cookware bottles jugs mugs manufacturer Moradabad India"
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="p-6">
                <h3 className="font-serif font-bold text-navy text-xl mt-2">Copper Utensils</h3>
                <p className="text-clay text-sm mt-1">Tamba cookware, bottles, jugs &amp; mugs</p>
                <span className="inline-block mt-4 text-xs font-bold text-gold uppercase tracking-wider">Shop Copper →</span>
              </div>
            </Link>
            <Link
              href="/products?material=Brass"
              className="group relative rounded-3xl overflow-hidden border border-sand bg-cream hover:border-clay transition-all"
              aria-label="Shop brass utensils — pital ke bartan, cookware, dinner sets manufacturer Moradabad"
            >
              <div className="aspect-[4/5] bg-sand/40 relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={toFullUrl(brassAll[0]?.image?.url) || "/hero-banner.png"}
                  alt="Brass utensils pital ke bartan cookware dinner sets manufacturer Moradabad India"
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="p-6">
                <h3 className="font-serif font-bold text-navy text-xl mt-2">Brass Utensils</h3>
                <p className="text-clay text-sm mt-2">Pital ke bartan — cookware &amp; dinnerware</p>
                <span className="inline-block mt-4 text-xs font-bold text-gold uppercase tracking-wider">Shop Brass →</span>
              </div>
            </Link>
            <Link
              href="/products"
              className="group relative rounded-3xl overflow-hidden border border-sand bg-cream hover:border-clay transition-all"
              aria-label="Shop bronze kansa utensils — bronze dinnerware and thali sets manufacturer Moradabad"
            >
              <div className="aspect-[4/5] bg-sand/40 relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={toFullUrl(ft[0]?.image?.url) || "/hero-banner.png"}
                  alt="Bronze kansa utensils bronze dinnerware thali sets manufacturer Moradabad India"
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="p-6">
                <h3 className="font-serif font-bold text-navy text-xl mt-2">Bronze &amp; Kansa</h3>
                <p className="text-clay text-sm mt-2">Kansa dinnerware, thali &amp; serveware</p>
                <span className="inline-block mt-4 text-xs font-bold text-gold uppercase tracking-wider">Shop All Metals →</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Why Choose Us — keyword-rich manufacturer story (brassglobe "Welcome" equivalent) ── */}
      <section className="section bg-sand/30" aria-labelledby="why-choose-us">
        <div className="container-x">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <h2 id="why-choose-us" className="font-serif font-bold text-navy text-3xl md:text-4xl mt-2">
                  Best Brass &amp; Copper Manufacturers In India — Based in Moradabad
                </h2>
                <p className="text-gray mt-4 text-sm leading-relaxed">
                  New Look Impex is a <strong className="text-navy">brass and copper manufacturer and exporter based in Moradabad, Uttar Pradesh</strong> —
                  India's "Brass City." We specialize in durable, eco-friendly, high-quality copper, brass and
                  kansa utensils for cooking, serving, dining and gifting, made using age-old hand-hammering
                  techniques passed down through generations of artisans.
                </p>
                <p className="text-gray mt-4 text-sm leading-relaxed">
                  Every cookware piece is <strong className="text-navy">handcrafted</strong> with strict quality checks, and sold
                  <strong className="text-navy">factory-direct</strong> to retailers, wholesalers, interior designers and
                  corporate importers worldwide. GSTIN-verified exporter: 09AFKPA4462R1ZW.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-sand shadow-sm">
                  <div className="text-gold font-bold text-xs uppercase tracking-wider">100% Handcrafted</div>
                  <p className="text-navy text-xs mt-1">Artisans crafting each piece by hand in Moradabad</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-sand shadow-sm">
                  <div className="text-gold font-bold text-xs uppercase tracking-wider">Factory Direct</div>
                  <p className="text-navy text-xs mt-1">Wholesale prices, no middlemen, bulk MOQ options</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-sand shadow-sm">
                  <div className="text-gold font-bold text-xs uppercase tracking-wider">GSTIN Verified</div>
                  <p className="text-navy text-xs mt-1">Exporter GSTIN 09AFKPA4462R1ZW, export documentation</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-sand shadow-sm">
                  <div className="text-gold font-bold text-xs uppercase tracking-wider">OEM / Private Label</div>
                  <p className="text-navy text-xs mt-1">Custom finishes, engravings and branding for your brand</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Wholesale Supplier Discovery — AI & buyer-friendly entity block ── */}
      <section className="section bg-sand/30" aria-labelledby="wholesale-supplier-discovery">
        <div className="container-x">
          <div className="text-center mb-10">
            <p className="eyebrow text-clay">Wholesale Supplier Discovery</p>
            <h2 id="wholesale-supplier-discovery" className="font-serif font-bold text-navy text-3xl md:text-4xl mt-2">
              Brass &amp; Copper Wholesale Supplier — New Look Impex, Moradabad, India
            </h2>
            <p className="text-gray mt-4 max-w-3xl mx-auto text-sm leading-relaxed">
              New Look Impex (NLI Collections) is a <strong className="text-navy">brass and copper products manufacturer and exporter based in Moradabad, Uttar Pradesh, India</strong>. We are a wholesale supplier of hand-hammered brass kitchenware, copper cookware & drinkware, brass urlis, diyas, lanterns, planters, metal home décor and festive gift sets. We accept B2B bulk orders, OEM / private label manufacturing, and export enquiries from retailers, importers, distributors and corporate buyers worldwide. GSTIN: 09AFKPA4462R1ZW.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-sand shadow-sm">
              <h3 className="font-serif font-bold text-navy text-lg mb-3">What We Supply</h3>
              <ul className="text-sm text-gray space-y-2 list-disc list-inside">
                <li>Brass utensils &amp; kitchenware</li>
                <li>Copper cookware &amp; bottles</li>
                <li>Brass urlis, diyas &amp; lanterns</li>
                <li>Metal home décor &amp; planters</li>
                <li>Copper &amp; brass gift sets</li>
                <li>OEM / private label metalware</li>
              </ul>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-sand shadow-sm">
              <h3 className="font-serif font-bold text-navy text-lg mb-3">Who We Supply</h3>
              <ul className="text-sm text-gray space-y-2 list-disc list-inside">
                <li>Wholesale buyers &amp; retailers</li>
                <li>Importers &amp; distributors</li>
                <li>HORECA &amp; interior designers</li>
                <li>Corporate gifting programmes</li>
                <li>Export buyers worldwide</li>
                <li>B2B bulk purchasers</li>
              </ul>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-sand shadow-sm">
              <h3 className="font-serif font-bold text-navy text-lg mb-3">Contact — Wholesale Enquiries</h3>
              <ul className="text-sm text-gray space-y-2 list-disc list-inside">
                <li className="font-semibold text-navy">New Look Impex, Moradabad, Uttar Pradesh 244001, India</li>
                <li>📞 +91 8218251238 / +91 7500441239</li>
                <li>✉️ Website: newlookimpex130@gmail.com · Sales: newlookimpex@gmail.com</li>
                <li>💬 WhatsApp Business: +91 96900 53913 · Sales WhatsApp: +91 9808588603</li>
                <li>🌐 https://www.newlookimpex.store</li>
                <li>📋 GSTIN: 09AFKPA4462R1ZW</li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/request-quote" className="btn btn-clay !px-5 !py-2.5 text-xs">Request Bulk Quote</Link>
                <a href="https://wa.me/919690053913" target="_blank" rel="noopener noreferrer" className="btn btn-outline !px-5 !py-2.5 text-xs">WhatsApp Business</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Buying Guides & Blogs — brassglobe "Inspire and Elevate" equivalent ── */}
      <section className="section bg-sand/40" aria-labelledby="buying-guides">
        <div className="container-x">
          <div className="text-center mb-10">
            <p className="eyebrow text-clay">Inspire &amp; Elevate</p>
            <h2 id="buying-guides" className="font-serif font-bold text-navy text-3xl md:text-4xl mt-2">
              Buying Guides for Brass, Copper &amp; Kansa Utensils
            </h2>
            <p className="text-gray mt-2 max-w-2xl mx-auto text-sm">
              How to style brass home decor, gift ideas for weddings and festivals, kansa dinner set buying
              guide, and why brass utensils are tin-coated — everything you need to buy with confidence.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Link
              href="/blog"
              className="group block p-6 rounded-2xl border border-sand bg-white hover:border-clay transition-all"
              aria-label="Blog: How to Style Brass Home Decor in Modern and Traditional Indian Homes"
            >
              <h3 className="font-serif font-bold text-navy text-lg mt-2 group-hover:text-clay transition-colors">How to Style Brass Home Decor</h3>
              <p className="text-gray text-sm mt-2">Modern and traditional Indian homes — styling tips that sell.</p>
            </Link>
            <Link
              href="/blog"
              className="group block p-6 rounded-2xl border border-sand bg-white hover:border-clay transition-all"
              aria-label="Blog: Brass Gift Ideas for Weddings, Housewarmings and Festivals"
            >
              <h3 className="font-serif font-bold text-navy text-lg mt-2 group-hover:text-clay transition-colors">Brass Gift Ideas for Weddings</h3>
              <p className="text-gray text-sm mt-2">Housewarmings, festivals and corporate gifting inspiration.</p>
            </Link>
            <Link
              href="/blog"
              className="group block p-6 rounded-2xl border border-sand bg-white hover:border-clay transition-all"
              aria-label="Blog: Kansa Dinner Set Buying Guide"
            >
              <h3 className="font-serif font-bold text-navy text-lg mt-2 group-hover:text-clay transition-colors">Kansa Dinner Set Buying Guide</h3>
              <p className="text-gray text-sm mt-2">What to look for before you buy bronze dinnerware.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Newsletter / Trade Bulletin Signup */}
      <section className="section bg-sand/40" aria-labelledby="newsletter">
        <div className="container-x">
          <div className="max-w-2xl mx-auto text-center">
            <p className="eyebrow text-clay">Stay Updated</p>
            <h2 id="newsletter" className="font-sans font-bold text-navy text-2xl md:text-3xl mt-2">
              Be the First to Know
            </h2>
            <p className="text-gray mt-2 text-sm">
              Receive seasonal metal décor trends, trade fair schedules, and new wholesale catalog releases directly in your business inbox.
            </p>
            <form className="mt-6 flex flex-col sm:flex-row gap-2 max-w-md mx-auto" onSubmit={subscribe}>
              <label htmlFor="newsletter-email" className="sr-only">Email address</label>
              <input id="newsletter-email" type="email" className="input flex-1" placeholder="Your business email" required value={subEmail} onChange={(e) => setSubEmail(e.target.value)} />
              <button type="submit" className="btn btn-clay !px-6 !py-2.5 shrink-0" disabled={subscribing}>{subscribing ? "Subscribing…" : "Subscribe"}</button>
            </form>
            {subStatus && (
              <p className={`text-xs mt-3 font-semibold ${subStatus.ok ? "text-green-700" : "text-red-700"}`} role="status">
                {subStatus.text}
              </p>
            )}
            <p className="text-xs text-gray mt-3">No spam. Unsubscribe anytime. We respect your privacy.</p>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="section !pt-0" aria-labelledby="footer-cta">
        <div className="container-x">
          <div className="bg-navy text-white p-8 md:p-12 text-center rounded-2xl">
            <h2 id="footer-cta" className="font-sans font-bold text-2xl md:text-3xl">Sourcing for your store, project or gifting programme?</h2>
            <p className="text-white/70 mt-3 max-w-xl mx-auto">Send an enquiry with the products and quantities you need — we confirm pricing, MOQ and lead time in writing.</p>
            <div className="mt-6 flex flex-wrap gap-3 justify-center">
              <Link href="/wholesale" className="btn bg-white text-navy hover:bg-cream">Wholesale Enquiries</Link>
              <Link href="/request-quote" className="btn btn-clay !px-6 !py-3">Request a Quote</Link>
            </div>
          </div>
        </div>
      </section>

      {dataError && (
        <div className="container-x pb-10">
          <ErrorBox error={dataError} retry={retry} />
        </div>
      )}

      {/* ── Seasonal offer popup (Shopify-style, auto-rotates with campaign calendar) ── */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/70" role="dialog" aria-modal="true" aria-label="Seasonal offer">
          <div className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl nli-rotate-in">
            <div className="bg-gradient-to-br from-navy via-navy to-clay-dark p-8 text-center">
              <button type="button" onClick={closePopup} aria-label="Close offer"
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-cream/15 text-cream flex items-center justify-center hover:bg-cream/30">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
              <p className="text-5xl" aria-hidden="true">{camp.emoji}</p>
              <h2 className="font-serif font-bold text-3xl text-cream mt-3">{camp.name}</h2>
              <p className="text-gold uppercase tracking-[0.25em] text-xs font-semibold mt-2">{camp.tagline}</p>
              <p className="text-cream/90 mt-4 text-sm leading-relaxed">
                Flat <strong className="text-gold text-2xl">{camp.percent}% OFF</strong> on all Copper &amp; Brass collections —
                this season only. While stock lasts.
              </p>
              <button type="button" onClick={copyCode}
                className="mt-5 inline-flex items-center gap-2 bg-cream/10 border border-dashed border-gold px-5 py-2.5 rounded-lg text-cream font-mono text-lg tracking-widest hover:bg-cream/20">
                {camp.code}
                <span className="text-[10px] font-sans uppercase tracking-wider text-gold">{copiedCode ? "✓ Copied" : "Copy code"}</span>
              </button>
              <p className="text-cream/60 text-[11px] mt-2">
                Mention this code in your quote request — {camp.ends_label === "always on" ? "new buyers welcome, always on." : `valid until ${camp.ends_label}.`}
              </p>
              <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
                <Link href="/products" onClick={closePopup} className="btn bg-gold text-navy hover:bg-cream">{camp.cta}</Link>
                <button type="button" onClick={closePopup} className="btn border border-cream/40 text-cream hover:bg-cream/10">Maybe later</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Recent order toasts (Shopify-style social proof) ── */}
      {ping && !pingClosed && (
        <div className="fixed bottom-4 left-4 z-40 max-w-xs bg-white rounded-xl shadow-xl border border-sand p-3 flex items-center gap-3 nli-rotate-in" role="status">
          {ping.img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ping.img} alt={ping.name} className="w-14 h-14 rounded-lg object-cover shrink-0" loading="lazy" />
          ) : (
            <span className="w-14 h-14 rounded-lg bg-cream flex items-center justify-center font-serif text-xl text-clay shrink-0" aria-hidden="true">NLI</span>
          )}
          <div className="text-xs leading-snug">
            <p className="text-navy font-semibold">{ping.where}</p>
            <p className="text-gray mt-0.5">ordered <strong className="text-navy">{ping.qty} pcs</strong> of</p>
            <p className="text-navy font-semibold truncate max-w-[170px]">{ping.name}</p>
            <p className="text-gray mt-0.5">🕒 {ping.mins} minutes ago · <span className="text-green-700">✓ Verified order</span></p>
          </div>
          <button type="button" onClick={() => { setPing(null); setPingClosed(true); }} aria-label="Dismiss order notifications"
            className="ml-auto self-start w-6 h-6 rounded-full bg-cream text-gray flex items-center justify-center hover:text-navy shrink-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
      )}
    </>
  );
}