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

export default function HomeClient() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [featured, setFeatured] = useState<ProductCardType[] | null>(null);
  const [dataError, setDataError] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDataError("");
    Promise.allSettled([
      api<{ items: Category[] }>("/api/public/categories"),
      api<{ items: ProductCardType[] }>("/api/public/products?sort=featured&page_size=8"),
    ]).then((results) => {
      if (cancelled) return;
      const [cats, feats] = results;
      if (cats.status === "fulfilled") setCategories(cats.value.items || []);
      if (feats.status === "fulfilled") setFeatured(feats.value.items || []);
      if (results.some((r) => r.status === "rejected")) setDataError("Some sections could not be loaded.");
    });
    return () => { cancelled = true; };
  }, []);

  const retry = () => {
    setCategories(null); setFeatured(null); setDataError("");
    api<{ items: Category[] }>("/api/public/categories").then((d) => setCategories(d.items || [])).catch((e) => setDataError(String(e)));
    api<{ items: ProductCardType[] }>("/api/public/products?sort=featured&page_size=8").then((d) => setFeatured(d.items || [])).catch((e) => setDataError(String(e)));
  };

  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-navy text-white overflow-hidden">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://luqgcacxkcrmhsdopjyl.supabase.co/storage/v1/object/public/media/banner-featured-collection.jpg"
            alt="Handcrafted brass and copper collection" className="w-full h-full object-cover opacity-30"
            fetchPriority="high" loading="eager" width={1920} height={1080} />
        </div>
        <div className="relative container-x py-24 md:py-36">
          <div className="max-w-3xl">
            <p className="text-gold uppercase tracking-[0.28em] text-xs font-semibold">Timeless Heritage</p>
            <h1 className="font-serif font-bold text-4xl md:text-6xl mt-4 leading-[1.05]">
              Elevate Every Interior. Timeless Copper &amp; Brass Masterpieces.
            </h1>
            <p className="mt-5 text-white/80 max-w-2xl text-lg">
              New Look Impex — artisan copper and brass collections from Moradabad, India. Premium craftsmanship
              for global retailers, wholesalers, interior designers, and corporate importers. End-to-end
              manufacturing, quality assurance, and export logistics.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products" className="btn btn-clay !px-6 !py-3">Explore Our Catalog</Link>
              <Link href="/request-quote" className="btn !px-6 !py-3 border border-white text-white hover:bg-white hover:text-navy">
                Partner With Us
              </Link>
            </div>
            <form className="mt-8 flex flex-col sm:flex-row gap-2 max-w-xl" role="search" onSubmit={(e) => {
              e.preventDefault();
              const query = q.trim();
              router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
            }}>
              <label htmlFor="hero-search" className="sr-only">Search the catalogue</label>
              <input id="hero-search" className="input !py-3 flex-1 !bg-white/90" placeholder='Try "brass urli" or "copper diya"…' value={q} onChange={(e) => setQ(e.target.value)} />
              <button type="submit" className="btn btn-clay !py-3">Search</button>
            </form>
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
              {categories.filter((c) => !["Brass Urlis", "Copper Urlis", "Brass Diyas", "Metal Diyas", "Brass Lanterns", "Decorative Bowls"].includes(c.name)).slice(0, 8).map((c) => (
                <Link key={c.slug} href={`/categories/${c.slug}`} className="group flex flex-col items-center text-center">
                  <span className="relative block w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-cream ring-2 ring-clay/25 group-hover:ring-clay transition-all">
                    {c.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.image_url.startsWith("http") ? c.image_url : `https://new-look-impex-api.onrender.com${c.image_url}`} alt={c.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
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
              {featured.filter((p) => p.category?.slug === "copper-kitchenware" || p.material === "Copper").slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* Copper Collection - Brass Kitchenware */}
      <section className="section bg-sand/30" aria-labelledby="copper-collection">
        <div className="container-x">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="eyebrow text-clay">Material</p>
              <h2 id="copper-collection" className="font-sans font-bold text-navy text-2xl md:text-3xl mt-2">Copper Collection</h2>
              <p className="text-sm text-gray mt-1">Premium brass kitchenware — handcrafted brass cookware for traditional and modern kitchens</p>
            </div>
            <Link href="/categories/brass-kitchenware" className="btn btn-outline btn-sm">View All Brass Kitchenware →</Link>
          </div>
          {featured === null ? <Loading label="Loading…" /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              {featured.filter((p) => p.category?.slug === "brass-kitchenware" || p.material === "Brass").slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
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
              Latest New Arrivals
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
                        alt={p.image.alt_text || p.name}
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
              {(featured || []).filter((p) => p.material === "Copper").slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
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
              {(featured || []).filter((p) => p.material === "Brass").slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
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
              <p className="text-sm text-gray mt-1">Latest collections — best sellers recommended by our buyers</p>
            </div>
            <Link href="/products" className="btn btn-outline btn-sm">View All →</Link>
          </div>
          {featured === null ? <Loading label="Loading products…" /> : featured.length === 0 ? (
            <p className="text-sm text-gray">No featured products published yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              {featured.slice(0, 8).map((p) => <ProductCard key={p.id} product={p} />)}
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
            <form className="mt-6 flex flex-col sm:flex-row gap-2 max-w-md mx-auto" onSubmit={(e) => { e.preventDefault(); }}>
              <label htmlFor="newsletter-email" className="sr-only">Email address</label>
              <input id="newsletter-email" type="email" className="input flex-1" placeholder="Your business email" required />
              <button type="submit" className="btn btn-clay !px-6 !py-2.5 shrink-0">Subscribe</button>
            </form>
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
    </>
  );
}