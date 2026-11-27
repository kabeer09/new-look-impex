"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, trackEvent } from "@/lib/api";
import { gaEvent } from "@/lib/ga4";
import type { ProductCard } from "@/lib/types";
import { ProductGrid } from "@/components/public/Shared";
import { Loading, ErrorBox } from "@/components/public/States";
import { useWhatsappNumber } from "@/hooks/useWhatsapp";
import { useLeadMarket } from "@/lib/market";
import type { EuropeCountry } from "./europe-data";
import { EUROPE_COUNTRIES } from "./europe-data";
import { MarketHero, MarketGallery } from "@/components/public/MarketVisuals";
import { getMarketVisual } from "@/lib/market-visuals";

const SITE = "https://www.newlookimpex.store";

/** Premium Europe-market landing page. All copy comes from the country config;
 *  all figures stay in a written quote — nothing invented, nothing converted. */
export function EuropeCountryPage({
  cfg,
  initialProducts = null,
}: {
  cfg: EuropeCountry;
  initialProducts?: ProductCard[] | null;
}) {
  const [products, setProducts] = useState<ProductCard[] | null>(initialProducts);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ name: "", company: "", email: "", country: cfg.name, product_interest: "", quantity: "" });
  const [formState, setFormState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const wa = useWhatsappNumber();
  const lead = useLeadMarket();

  const canonical = `${SITE}/europe/${cfg.slug}`;
  const visual = getMarketVisual(cfg.slug);

  useEffect(() => {
    trackEvent({ event_type: "product_view", country: cfg.name });
    if (initialProducts !== null) return;
    api<{ items: ProductCard[] }>("/api/public/products?page_size=100&sort=featured")
      .then((d) => {
        const items = (d.items || []).filter(
          (p) => p.category && cfg.categories.includes(p.category.slug)
        );
        setProducts(items.length ? items : d.items || []);
      })
      .catch((e) => setErr(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.slug]);

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Europe Markets", item: `${SITE}/europe` },
      { "@type": "ListItem", position: 3, name: cfg.name, item: canonical },
    ],
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: cfg.faqs.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
  const webpageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: cfg.h1,
    description: cfg.intro[0]?.slice(0, 160),
    url: canonical,
    inLanguage: "en",
    areaServed: { "@type": "Country", name: cfg.name },
    about: { "@type": "Thing", name: cfg.focus },
    mentions: cfg.categories.map((c) => ({ "@type": "Thing", name: c })),
    primaryImageOfPage: { "@type": "ImageObject", url: `${SITE}${visual.hero}` },
    isPartOf: { "@type": "WebSite", name: "New Look Impex", url: SITE },
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState("sending");
    try {
      await api("/api/public/enquiries", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          company: form.company,
          email: form.email,
          country: form.country || cfg.name,
          product_interest: form.product_interest,
          message: `Europe ${cfg.name} landing-page enquiry. Estimated quantity: ${form.quantity || "not specified"}.`,
          consent: true,
          landing_page: `europe-${cfg.slug}`,
          preferred_currency: lead.preferred_currency,
        }),
      });
      trackEvent({ event_type: "rfq_submit", country: cfg.name });
      gaEvent("generate_lead", { lead_type: "enquiry", source: `europe-${cfg.slug}` });
      setFormState("sent");
    } catch {
      setFormState("error");
    }
  };

  const waLink = `https://wa.me/${wa}?text=${encodeURIComponent(`Hello, I would like a wholesale quotation for ${cfg.name}.`)}`;

  return (
    <div className="bg-ivory">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webpageLd) }} />

      {/* 1. Country-specific photo-led hero */}
      <MarketHero
        visual={visual}
        eyebrow={`Europe Markets · ${cfg.focus}`}
        h1={cfg.h1}
        intro={cfg.intro[0]}
        breadcrumb={<><Link href="/" className="hover:text-gold">Home</Link><span className="mx-2">/</span><Link href="/europe" className="hover:text-gold">Europe&nbsp;Markets</Link><span className="mx-2">/</span><span>{cfg.name}</span></>}
        ctas={<><a href="#enquire" className="btn btn-primary">Request a Wholesale Quote</a><a href={waLink} target="_blank" rel="noopener noreferrer" className="btn btn-outline">WhatsApp Enquiry</a></>}
      />

      {/* 2. Intro + focus bullets */}
      <section className="container-x section max-w-5xl">
        <p className="eyebrow text-clay-dark">Indian Handcrafted Excellence for {cfg.name}</p>
        {cfg.intro.slice(1).map((p, i) => <p key={i} className="mt-4 leading-relaxed text-charcoal/80">{p}</p>)}
        <ul className="mt-8 grid gap-3 md:grid-cols-2">
          {cfg.bullets.map((b) => (
            <li key={b} className="flex gap-3 text-sm">
              <span className="text-gold font-bold" aria-hidden="true">✦</span>
              <span className="text-charcoal/85">{b}</span>
            </li>
          ))}
        </ul>
        <MarketGallery images={visual.gallery} name={cfg.name} theme={visual.theme} />
      </section>

      {/* 3. Country-specific product collections */}
      <section className="border-y border-gold/20 bg-sand/40">
        <div className="container-x section">
          <h2 className="font-cormorant text-3xl font-semibold text-navy">Copper &amp; Brass Collections for {cfg.name}</h2>
          <p className="mt-2 text-sm text-gray">Published catalogue pieces matched to this market's focus. Every specification and price is confirmed in a written quotation.</p>
          <div className="mt-8">
            {err && <ErrorBox error={err} retry={() => window.location.reload()} />}
            {!err && products === null && <Loading label="Loading products…" />}
            {!err && products !== null && <ProductGrid products={products.slice(0, 12)} emptyHint="Browse the full catalogue for more." />}
          </div>
          <Link href="/products" className="link mt-6 inline-block">View the full catalogue →</Link>
        </div>
      </section>

      {/* 4. Wholesale & B2B partnerships */}
      <section className="container-x section max-w-6xl">
        <h2 className="font-cormorant text-3xl font-semibold text-navy">Wholesale &amp; B2B Partnerships</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Bulk orders", "Volume enquiries quoted individually with MOQ and packaging confirmed in writing."],
            ["Private label", "Custom labelling and retail packaging quoted for buyers in " + cfg.name + "."],
            ["Custom manufacturing", "Share a drawing or reference — sizes, finishes and details are quoted per order."],
            ["OEM opportunities", "Moradabad manufacture with export documentation handled per order."],
          ].map(([t, d]) => (
            <div key={t} className="border border-gold/25 bg-white p-5">
              <h3 className="font-serif font-bold text-navy">{t}</h3>
              <p className="mt-2 text-sm text-gray leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Link href="/customisation" className="link">Explore customisation &amp; OEM →</Link>
        </div>
      </section>

      {/* 5. Why choose New Look Impex */}
      <section className="bg-emerald text-cream">
        <div className="container-x section max-w-6xl">
          <h2 className="font-cormorant text-3xl font-semibold text-cream">Why choose New Look Impex</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Moradabad heritage", "Manufacturing base in Moradabad, India — the country's brass and copper handicraft cluster."],
              ["Handcrafted metal", "Hand-hammered copper and brass pieces; finish and specification confirmed per order."],
              ["Export-oriented", "We handle export documentation and ship from Moradabad to buyers worldwide."],
              ["Customisation", "Finishes, packaging and private label options are quoted for every enquiry."],
            ].map(([t, d]) => (
              <div key={t}>
                <h3 className="font-serif font-bold text-gold-light">{t}</h3>
                <p className="mt-2 text-sm text-cream/80 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Country-specific enquiry form */}
      <section id="enquire" className="container-x section max-w-3xl">
        <h2 className="font-cormorant text-3xl font-semibold text-navy">Enquire from {cfg.name}</h2>
        <p className="mt-2 text-sm text-gray">Tell us what you need — we reply with a written quotation. No prices or lead times are assumed here.</p>
        {formState === "sent" ? (
          <div className="mt-6 border border-emerald/30 bg-emerald/10 p-6">
            <p className="font-serif text-xl font-bold text-navy">Thank you — your enquiry is received.</p>
            <p className="mt-2 text-sm text-gray">Our export team will reply in writing. Your reference was sent by email if you provided one.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-charcoal">Buyer name</span>
              <input required className="input mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-charcoal">Company</span>
              <input className="input mt-1" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-charcoal">Country</span>
              <input className="input mt-1" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-charcoal">Email</span>
              <input required type="email" className="input mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-charcoal">Product interest</span>
              <input className="input mt-1" placeholder="e.g. copper bottles, brass urli" value={form.product_interest} onChange={(e) => setForm({ ...form, product_interest: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-charcoal">Estimated quantity</span>
              <input className="input mt-1" placeholder="e.g. 500 units" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </label>
            <div className="sm:col-span-2">
              <button type="submit" className="btn btn-primary" disabled={formState === "sending"}>
                {formState === "sending" ? "Sending…" : "Request a Wholesale Quote"}
              </button>
              {formState === "error" && <p className="mt-2 text-sm text-brass-dark">Could not send just now — please try again or use WhatsApp.</p>}
            </div>
          </form>
        )}
      </section>

      {/* FAQs */}
      <section className="container-x section max-w-4xl">
        <h2 className="font-cormorant text-3xl font-semibold text-navy">Buyer questions — {cfg.name}</h2>
        <div className="mt-6 space-y-5">
          {cfg.faqs.map(([q, a]) => (
            <div key={q} className="border-b border-gold/20 pb-4">
              <h3 className="font-serif font-bold text-navy">{q}</h3>
              <p className="mt-1 text-sm text-gray leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sibling Europe markets */}
      <nav aria-label="Other Europe markets" className="container-x section max-w-4xl border-t border-gold/20">
        <h2 className="font-cormorant text-2xl font-semibold text-navy">Other Europe markets</h2>
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {EUROPE_COUNTRIES.filter((c) => c.slug !== cfg.slug).map((c) => (
            <li key={c.slug}><Link href={`/europe/${c.slug}`} className="link">{c.name}</Link></li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
