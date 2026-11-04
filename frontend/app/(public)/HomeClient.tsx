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

const TRUST_STATS = [
  { value: "5+", label: "Countries Served" },
  { value: "99%", label: "On-Time Delivery" },
  { value: "20+", label: "Verified Buyers" },
  { value: "100+", label: "Products" },
];

const TESTIMONIALS = [
  { quote: "Excellent craftsmanship and reliable wholesale supply. Our customers love the copper bottles.", name: "Retail Buyer, UAE", rating: 5 },
  { quote: "Great quality brass décor with consistent finishing. Smooth ordering process for bulk orders.", name: "Import Buyer, UK", rating: 5 },
  { quote: "Responsive team and dependable export packaging. Will continue sourcing from New Look Impex.", name: "Wholesale Distributor, USA", rating: 5 },
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

/** Rotating offer announcements (Shopify-style) shown above the slideshow */
const OFFER_MESSAGES = [
  "🍁  AUTUMN SALE — Up to 30% Off on Copper & Brass Collections",
  "🎁  Festive Gift Sets Now Live — Order Early for Season Stock",
  "🚚  Free Worldwide Shipping on Bulk Orders Above $5,000",
  "✨  New Autumn Arrivals — Fresh From Moradabad Workshops",
];

/** Image slideshow below the Copper Collection section */
const SHOWCASE_SLIDES = [
  { src: "/slideshow-1.jpg", tag: "Autumn Edit", caption: "Hand-Hammered Copper Pitchers — Autumn Styling", alt: "Hand-hammered copper pitcher with autumn flowers — copper jug manufacturer and wholesale exporter Moradabad India" },
  { src: "/slideshow-2.jpg", tag: "Wellness", caption: "Copper Drinkware — Hydration, Designed Beautifully", alt: "Copper jug, glasses and bottles set — copper drinkware manufacturer and bulk supplier Moradabad India" },
  { src: "/slideshow-3.jpg", tag: "Artisanal Brass", caption: "The Artisanal Brass Collection — Handcrafted Heritage", alt: "Engraved brass canisters, spice box and tea strainer — brass kitchenware manufacturer and exporter Moradabad India" },
];

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

  useEffect(() => {
    const t = setInterval(() => setOffer((o) => (o + 1) % OFFER_MESSAGES.length), 3500);
    return () => clearInterval(t);
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
      navigator.clipboard?.writeText("HALLOWEEN30").then(() => setCopiedCode(true));
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
      {/* Hero Section */}
      <section className="relative bg-cream text-navy overflow-hidden">
        <div className="grid md:grid-cols-2 items-stretch">
          <div className="relative order-2 md:order-1 flex items-center">
            <div className="absolute inset-0 bg-gradient-to-br from-cream via-cream to-sand/60" aria-hidden="true" />
            <div className="relative container-x !ml-0 md:!pl-12 py-16 md:py-24 px-6">
              <p className="text-clay uppercase tracking-[0.28em] text-xs font-semibold">Timeless Heritage</p>
              <h1 className="font-serif font-bold text-4xl md:text-5xl lg:text-6xl mt-4 leading-[1.08]">
                Elevate Every Interior. Timeless{" "}
                <span className="text-clay">Copper</span> &amp;{" "}
                <span className="text-gold underline decoration-gold/40 decoration-2 underline-offset-8">Brass</span>{" "}
                Masterpieces.
              </h1>
              <p className="mt-5 text-navy/70 max-w-2xl text-base md:text-lg leading-relaxed">
                New Look Impex — artisan copper and brass collections from Moradabad, India. Premium craftsmanship
                for global retailers, wholesalers, interior designers, and corporate importers. End-to-end
                manufacturing, quality assurance, and export logistics.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/products" className="btn btn-clay !px-6 !py-3">Explore Our Catalog</Link>
                <Link href="/request-quote" className="btn btn-outline !px-6 !py-3 !border-clay !text-clay hover:!bg-clay hover:!text-cream">
                  Partner With Us
                </Link>
              </div>
              <form className="mt-8 flex flex-col sm:flex-row gap-2 max-w-xl" role="search" onSubmit={(e) => {
                e.preventDefault();
                const query = q.trim();
                router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
              }}>
                <label htmlFor="hero-search" className="sr-only">Search the catalogue</label>
                <input id="hero-search" className="input !py-3 flex-1 bg-white" placeholder='Try "brass urli" or "copper diya"…' value={q} onChange={(e) => setQ(e.target.value)} />
                <button type="submit" className="btn btn-clay !py-3">Search</button>
              </form>
            </div>
          </div>
          <div className="relative order-1 md:order-2 min-h-[320px] md:min-h-[560px] lg:min-h-[640px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hero-brass-kitchen.jpg"
              onError={(e) => { const t = e.currentTarget; if (!t.dataset.fb) { t.dataset.fb = "1"; t.src = "https://luqgcacxkcrmhsdopjyl.supabase.co/storage/v1/object/public/media/banner-featured-collection.jpg"; } }}
              alt="Hand-hammered brass cookware set — The Hadai Collection by New Look Impex, brass kitchenware manufacturer and exporter in Moradabad, India" className="absolute inset-0 w-full h-full object-cover"
              fetchPriority="high" loading="eager" width={1024} height={1024} />
            <div className="absolute inset-0 hidden md:block bg-gradient-to-r from-cream via-transparent to-transparent w-1/4" aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* B2B trust strip — manufacturer / exporter / wholesaler keyword band */}
      <section aria-label="B2B manufacturer credentials" className="border-y border-sand bg-cream">
        <div className="container-x py-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-center">
          <span className="inline-flex items-center gap-2 text-xs md:text-sm font-semibold text-navy uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-clay" aria-hidden="true" /> Brass &amp; Copper Manufacturer — Moradabad, India
          </span>
          <span className="inline-flex items-center gap-2 text-xs md:text-sm font-semibold text-navy uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-gold" aria-hidden="true" /> Wholesale &amp; Export Supplier — GSTIN 09AFKPA4462R1ZW
          </span>
          <span className="inline-flex items-center gap-2 text-xs md:text-sm font-semibold text-navy uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-navy" aria-hidden="true" /> OEM / Private Label — B2B Bulk Orders
          </span>
          <span className="inline-flex items-center gap-2 text-xs md:text-sm font-semibold text-navy uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-clay-dark" aria-hidden="true" /> Trusted Since 2012 — Global B2B Buyers
          </span>
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
              {categories.filter((c) => !["Brass Urlis", "Copper Urlis", "Brass Diyas", "Metal Diyas", "Brass Lanterns", "Decorative Bowls"].includes(c.name)).slice(0, 8).map((c) => (
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

      {/* New Arrivals - Copper Cookware */}
      <section className="section" aria-labelledby="new-arrivals">
        <div className="container-x">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="eyebrow text-clay">Latest</p>
              <h2 id="new-arrivals" className="font-sans font-bold text-navy text-2xl md:text-3xl mt-2">New Arrivals</h2>
              <p className="text-sm text-gray mt-1">Premium copper cookware — hammered copper kitchenware for healthy cooking and elegant serving</p>
            </div>
            <Link href="/categories/copper-kitchenware" className="btn btn-outline btn-sm">View All Copper Cookware →</Link>
          </div>
          {featured === null ? <Loading label="Loading new arrivals…" /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              {copperAll.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* Material — Copper Collection */}
      <section className="section bg-sand/30" aria-labelledby="copper-collection">
        <div className="container-x">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="eyebrow text-clay">Material</p>
              <h2 id="copper-collection" className="font-sans font-bold text-navy text-2xl md:text-3xl mt-2">Copper Collection</h2>
              <p className="text-sm text-gray mt-1">Premium copper handicrafts — hammered vessels, planters, jugs and classic home décor, crafted from pure copper</p>
            </div>
            <Link href="/products?material=Copper" className="btn btn-outline btn-sm">View All Copper Products →</Link>
          </div>
          {featured === null ? <Loading label="Loading…" /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              {copperAll.slice(4, 8).map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* Autumn Showcase — Rotating Offers + Image Slideshow */}
      <section className="section !pt-8 bg-navy" aria-labelledby="autumn-showcase">
        <div className="container-x">
          <h2 id="autumn-showcase" className="sr-only">Autumn Collection Showcase</h2>

          {/* Rotating offer announcements (Shopify-style) */}
          <div className="bg-clay text-cream rounded-lg md:rounded-full h-10 md:h-11 px-4 md:px-8 flex items-center justify-center text-center mb-6" role="status" aria-live="polite">
            <span key={offer} className="nli-rotate-in whitespace-nowrap overflow-hidden text-ellipsis text-[11px] md:text-sm font-semibold tracking-wide">
              {OFFER_MESSAGES[offer]}
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
          <div className="text-center mb-8">
            <p className="eyebrow text-clay">Gifts</p>
            <h2 id="copper-gifts" className="font-sans font-bold text-navy text-2xl md:text-3xl mt-2">
              Gifts Handcrafted in Copper
            </h2>
            <p className="text-gray mt-2 max-w-2xl mx-auto text-sm">
              Premium copper drinkware gift sets for weddings, festivals and every celebration. Thoughtful. Timeless.
              Beautifully wrapped.
            </p>
          </div>
          {featured === null ? <Loading label="Loading…" /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              {(featured || []).length > 0 && copperAll.slice(8, 12).length > 0 ? copperAll.slice(8, 12).map((p) => <ProductCard key={p.id} product={p} />) : copperAll.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
          <div className="text-center mt-8">
            <Link href="/products?material=Copper" className="btn btn-outline btn-sm">View All Copper Products →</Link>
          </div>
        </div>
      </section>

      {/* Brass Collection Showcase */}
      <section className="section" aria-labelledby="brass-showcase">
        <div className="container-x">
          <div className="text-center mb-8">
            <p className="eyebrow text-clay">Collection</p>
            <h2 id="brass-showcase" className="font-sans font-bold text-navy text-2xl md:text-3xl mt-2">
              Brass Collection
            </h2>
            <p className="text-gray mt-2 max-w-2xl mx-auto text-sm">
              Premium brass handicrafts and home décor — urlis, diyas, lanterns, vases, and decorative pieces.
              Thoughtful. Timeless. Beautifully crafted.
            </p>
          </div>
          {featured === null ? <Loading label="Loading…" /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              {brassAll.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
          <div className="text-center mt-8">
            <Link href="/products?material=Brass" className="btn btn-outline btn-sm">View All Brass Products →</Link>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="section" aria-labelledby="featured-products">
        <div className="container-x">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="eyebrow text-clay">Best Sellers</p>
              <h2 id="featured-products" className="font-sans font-bold text-navy text-2xl md:text-3xl mt-2">Our Most Loved &amp; Top-Selling Products</h2>
              <p className="text-sm text-gray mt-1">Latest collections — best sellers recommended by our buyers, a rotating mix from every category</p>
            </div>
            <Link href="/products" className="btn btn-outline btn-sm">View All →</Link>
          </div>
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
                With decades of craft tradition and verified supplier networks, we deliver premium metalware to retailers,
                importers, and distributors across 50+ countries. GSTIN: 09AFKPA4462R1ZW.
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
            <div className="grid grid-cols-2 gap-4">
              {TRUST_STATS.map((s) => (
                <div key={s.label} className="card text-center">
                  <p className="font-sans font-bold text-3xl text-clay">{s.value}</p>
                  <p className="text-xs text-gray mt-1">{s.label}</p>
                </div>
              ))}
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

      {/* Our Impact - Helping Artisans Grow */}
      <section className="section bg-sand/40" aria-labelledby="impact">
        <div className="container-x">
          <div className="text-center mb-10">
            <p className="eyebrow text-clay">Our Impact</p>
            <h2 id="impact" className="font-sans font-bold text-navy text-3xl md:text-4xl mt-2">Helping Artisans Grow</h2>
            <p className="text-gray mt-3 max-w-2xl mx-auto text-sm">
              Every piece you bring home carries the hands, heritage, and hope of India's metal artisans.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { value: "30+", label: "Artisan families empowered through craftsmanship" },
              { value: "60+", label: "Meaningful livelihoods created" },
              { value: "100+", label: "Lives positively impacted through our artisans" },
              { value: "250+", label: "Heritage designs brought to life" },
            ].map((s) => (
              <div key={s.label} className="card text-center">
                <p className="font-sans font-bold text-3xl text-clay">{s.value}</p>
                <p className="text-xs text-gray mt-2">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-gray leading-relaxed">
              This is craftsmanship with a purpose — helping Indian art survive, and grow, in a way it never has before.
            </p>
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

      {/* Client Testimonials */}
      <section className="section" aria-labelledby="testimonials">
        <div className="container-x">
          <div className="text-center mb-8">
            <p className="eyebrow text-clay">Trust</p>
            <h2 id="testimonials" className="font-sans font-bold text-navy text-2xl md:text-3xl mt-2">Client Testimonials</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5 mb-8">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="card text-center">
                <div className="text-gold text-lg mb-2">{"★".repeat(t.rating)}</div>
                <p className="text-sm text-gray italic">"{t.quote}"</p>
                <p className="mt-3 text-xs font-semibold tracking-wide text-navy uppercase">{t.name}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {["EPCH", "UP EPB", "ODOP", "GST Registered"].map((badge) => (
              <span key={badge} className="badge badge-brass !px-4 !py-2 text-sm">{badge}</span>
            ))}
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

      {/* Certifications */}
      <section className="section bg-white border-y border-sand" aria-labelledby="certifications">
        <div className="container-x">
          <div className="text-center mb-8">
            <p className="eyebrow text-clay">Trust</p>
            <h2 id="certifications" className="font-sans font-bold text-navy text-2xl md:text-3xl mt-2">Certifications &amp; Organization Resources</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "EPCH", desc: "Export Promotion Council for Handicrafts", href: "https://www.epch.in", logo: "/logo-epch.png" },
              { name: "UP EPB", desc: "Uttar Pradesh Export Promotion Bureau", href: "https://upepb.org", logo: "/logo-up-epb.jpg" },
              { name: "ODOP", desc: "One District One Product — Moradabad", href: "https://odop.gov.in", logo: "/logo-odop.jpg" },
              { name: "GST Registered", desc: "GSTIN: 09AFKPA4462R1ZW", href: "#", logo: "/logo-gst.png" },
            ].map((c) => (
              <a key={c.name} href={c.href} target="_blank" rel="noopener noreferrer" className="card text-center hover:shadow-lg transition-shadow flex flex-col items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.logo} alt={c.name} className="h-12 w-auto object-contain mb-2" loading="lazy" />
                <p className="font-sans font-bold text-navy text-sm">{c.name}</p>
                <p className="text-xs text-gray mt-1">{c.desc}</p>
              </a>
            ))}
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
          <div className="text-center mb-8">
            <p className="eyebrow text-clay">Everything, One Place</p>
            <h2 id="mix-collection" className="font-sans font-bold text-navy text-2xl md:text-3xl mt-2">The Mix Collection — All Products</h2>
            <p className="text-gray mt-2 max-w-2xl mx-auto text-sm">
              A curated mix from every range — brass, copper, home décor, festive and gifting.
              Browse the full wholesale catalogue in one view.
            </p>
          </div>
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

      {/* ── Halloween offer popup (Shopify-style) ── */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/70" role="dialog" aria-modal="true" aria-label="Halloween offer">
          <div className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl nli-rotate-in">
            <div className="bg-gradient-to-br from-navy via-navy to-clay-dark p-8 text-center">
              <button type="button" onClick={closePopup} aria-label="Close offer"
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-cream/15 text-cream flex items-center justify-center hover:bg-cream/30">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
              <p className="text-5xl" aria-hidden="true">🎃</p>
              <h2 className="font-serif font-bold text-3xl text-cream mt-3">Halloween Offer</h2>
              <p className="text-gold uppercase tracking-[0.25em] text-xs font-semibold mt-2">Trick or Treat — Treat Yourself</p>
              <p className="text-cream/90 mt-4 text-sm leading-relaxed">
                Flat <strong className="text-gold text-2xl">30% OFF</strong> on all Copper &amp; Brass collections —
                this spooky season only. While stock lasts.
              </p>
              <button type="button" onClick={copyCode}
                className="mt-5 inline-flex items-center gap-2 bg-cream/10 border border-dashed border-gold px-5 py-2.5 rounded-lg text-cream font-mono text-lg tracking-widest hover:bg-cream/20">
                HALLOWEEN30
                <span className="text-[10px] font-sans uppercase tracking-wider text-gold">{copiedCode ? "✓ Copied" : "Copy code"}</span>
              </button>
              <p className="text-cream/60 text-[11px] mt-2">Mention this code in your quote request — valid until 18 November.</p>
              <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
                <Link href="/products" onClick={closePopup} className="btn bg-gold text-navy hover:bg-cream">Shop the Halloween Sale</Link>
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