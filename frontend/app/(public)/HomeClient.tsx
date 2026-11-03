"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, mediaUrl, cardSrcSet, whatsappLink } from "@/lib/api";
import type { Banner, Category, Collection, ProductCard as ProductCardType } from "@/lib/types";
import { ProductGrid, SectionTitle } from "@/components/public/Shared";
import { ProductCard } from "@/components/public/ProductCard";
import { Loading, ErrorBox } from "@/components/public/States";

const FAQS = [
  {
    q: "Do you ship across India and internationally?",
    a: "Yes. We handle domestic (pan-India) and export enquiries. Shipping terms, freight and lead time are confirmed in writing per order based on destination and volume.",
  },
  {
    q: "What is the minimum order quantity (MOQ)?",
    a: "MOQs vary by product and finish. Each product page lists its MOQ; custom or bulk quantities are quoted per enquiry.",
  },
  {
    q: "Can I request custom sizes, finishes or bespoke designs?",
    a: "Yes. Customisation (size, finish, bespoke design) is quoted like any wholesale order — share your requirements via Request a Quote or WhatsApp.",
  },
  {
    q: "How do I place a bulk / wholesale order?",
    a: "Browse the catalogue, add items to your enquiry list with quantities, and submit a Request a Quote. You receive a reference number and a written quotation covering price, MOQ and lead time.",
  },
  {
    q: "Are prices listed on the website?",
    a: "Pricing is on request (B2B). Every enquiry receives a written per-order quote. No prices are fabricated or shown as fixed retail.",
  },
  {
    q: "Do you offer samples before bulk orders?",
    a: "Sample availability and terms are confirmed per product on enquiry. Ask for samples when you request a quote.",
  },
];

const PURPOSES = [
  {
    title: "Retail & Boutique",
    text: "Curated décor pieces suited to gift shops, lifestyle stores and boutiques.",
    href: "/products",
  },
  {
    title: "Interior Design",
    text: "Statement metal décor for residential and commercial interiors.",
    href: "/metal-home-decor",
  },
  {
    title: "Hospitality",
    text: "Durable, high-presence pieces for hotels, restaurants and venues — quoted per project.",
    href: "/collections",
  },
  {
    title: "Festive & Corporate Gifting",
    text: "Diyas, lanterns and keepsakes for seasonal and corporate gifting programmes.",
    href: "/gifting",
  },
];

const JOURNAL = [
  {
    title: "A buyer's guide to styling brass décor",
    text: "How brass finishes, patinas and scale work across modern and traditional interiors — an educational primer for retail buyers.",
  },
  {
    title: "Planning a seasonal gifting programme",
    text: "What to confirm early when sourcing décor for festive or corporate gifting: quantities, finishes, packaging and timelines.",
  },
  {
    title: "Wholesale sourcing checklist",
    text: "The questions to ask any décor supplier before placing a bulk order — MOQ, samples, specifications and written quotes.",
  },
];

const PURPOSE_IMAGE_KEYWORDS: Record<string, string[]> = {
  "Retail & Boutique": ["gift", "boutique", "corporate-gifting"],
  "Interior Design": ["metal-home-decor", "decor", "home"],
  Hospitality: ["bowl", "lantern", "urli"],
  "Festive & Corporate Gifting": ["festival", "diya", "gifting"],
};

function purposeImage(title: string, categories: Category[]): string | null {
  const keys = PURPOSE_IMAGE_KEYWORDS[title] || [];
  for (const k of keys) {
    const hit = categories.find(
      (c) => c.image_url && (`${c.slug} ${c.name}`.toLowerCase().includes(k))
    );
    if (hit?.image_url) return hit.image_url;
  }
  return categories.find((c) => c.image_url)?.image_url || null;
}

function PurposeBanners({
  purposes,
  categories,
}: {
  purposes: { title: string; text: string; href: string }[];
  categories: Category[];
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {purposes.map((p) => {
        const img = purposeImage(p.title, categories);
        return (
          <Link
            key={p.title}
            href={p.href}
            className="group relative block aspect-[4/3] overflow-hidden bg-olive"
            aria-label={p.title}
          >
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaUrl(img)}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            ) : (
              <span
                className="absolute inset-0 flex items-center justify-center font-serif text-6xl font-bold text-cream/60"
                aria-hidden="true"
              >
                {p.title.trim().charAt(0) || "N"}
              </span>
            )}
            <span className="absolute inset-x-3 bottom-3 bg-cream/95 px-3 py-2 flex items-center justify-between">
              <span className="text-[12px] font-semibold tracking-wide text-espresso uppercase">
                {p.title}
              </span>
              <span className="text-clay font-bold" aria-hidden="true">→</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function CategoryCircle({ category }: { category: Category }) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group flex flex-col items-center text-center"
      aria-label={category.name}
    >
      <span className="relative block w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden bg-cream ring-1 ring-clay/25 group-hover:ring-clay transition-all">
        {category.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaUrl(category.image_url)}
            alt={category.name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <span
            className="absolute inset-0 flex items-center justify-center font-serif text-5xl font-bold text-clay/70"
            aria-hidden="true"
          >
            {category.name.trim().charAt(0).toUpperCase() || "N"}
          </span>
        )}
      </span>
      <span className="block mt-3 text-[13px] font-semibold tracking-wide text-espresso uppercase group-hover:text-clay">
        {category.name}
      </span>
      <span className="block text-[11px] tracking-widest text-clay mt-0.5">SHOP NOW</span>
    </Link>
  );
}

export default function HomeClient() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [featured, setFeatured] = useState<ProductCardType[] | null>(null);
  const [spotlight, setSpotlight] = useState<Collection | null>(null);
  const [spotlightProducts, setSpotlightProducts] = useState<ProductCardType[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [dataError, setDataError] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDataError("");
    // Featured collection: prefer the brass edit, else the first featured collection.
    const spotlightPromise = api<Collection>("/api/public/collections/brass-collection")
      .catch(() =>
        api<{ items: Collection[] }>("/api/public/collections").then((d) => {
          const items = d.items || [];
          const first = items.find((c) => c.featured) || items[0];
          if (!first) throw new Error("No collections available");
          return first;
        })
      )
      .then((col) =>
        api<Collection & { items?: ProductCardType[] }>(`/api/public/collections/${encodeURIComponent(col.slug)}`)
          .then((full) => ({ col: full as Collection, products: full.items || [] }))
          .catch(() => ({ col, products: [] as ProductCardType[] }))
      );
    Promise.allSettled([
      api<{ items: Category[] }>("/api/public/categories"),
      api<{ items: ProductCardType[] }>("/api/public/products?sort=featured&page_size=8"),
      spotlightPromise,
      api<{ items: Banner[] }>("/api/public/banners?placement=home_hero").catch(() => ({ items: [] as Banner[] })),
    ]).then((results) => {
      if (cancelled) return;
      const [cats, feats, spot, bans] = results;
      if (cats.status === "fulfilled") setCategories(cats.value.items || []);
      if (feats.status === "fulfilled") setFeatured(feats.value.items || []);
      if (spot.status === "fulfilled") {
        setSpotlight(spot.value.col);
        setSpotlightProducts(spot.value.products.slice(0, 4));
      }
      if (bans.status === "fulfilled") setBanners(bans.value.items || []);
      if (results.some((r) => r.status === "rejected")) {
        setDataError("Some sections could not be loaded — the catalogue service may be unavailable.");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Rotate hero banners (drop-folder uploads appear here automatically).
  useEffect(() => {
    if (banners.length < 2) return;
    const t = window.setInterval(() => setBannerIdx((i) => (i + 1) % banners.length), 7000);
    return () => window.clearInterval(t);
  }, [banners.length]);

  const heroBanner = banners.length > 0 ? banners[bannerIdx % banners.length] : null;

  // Story visual: collection image first, else the first category image available.
  const storyImage =
    spotlight?.image_url ||
    (categories || []).find((c) => c.image_url)?.image_url ||
    null;

  const retry = () => {
    setCategories(null);
    setFeatured(null);
    setSpotlight(null);
    setBanners([]);
    setBannerIdx(0);
    setDataError("");
    api<{ items: Category[] }>("/api/public/categories")
      .then((d) => setCategories(d.items || []))
      .catch((e) => setDataError(String(e)));
    api<{ items: Banner[] }>("/api/public/banners?placement=home_hero")
      .then((d) => setBanners(d.items || []))
      .catch(() => undefined);
    api<{ items: ProductCardType[] }>("/api/public/products?sort=featured&page_size=8")
      .then((d) => setFeatured(d.items || []))
      .catch((e) => setDataError(String(e)));
  };

  return (
    <>
      {/* Editorial hero */}
      <section className="relative bg-espresso text-cream overflow-hidden">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://luqgcacxkcrmhsdopjyl.supabase.co/storage/v1/object/public/media/banner-featured-collection.jpg"
            alt="Handcrafted brass and copper collection"
            className="w-full h-full object-cover opacity-40"
            fetchPriority="high"
            loading="eager"
            width={1920}
            height={1080}
          />
        </div>
        <div className="relative container-x py-20 md:py-32 text-center">
          <p className="text-gold-light uppercase tracking-[0.28em] text-xs font-semibold">
            Handcrafted in Moradabad
          </p>
          <h1 className="font-serif font-bold text-4xl md:text-6xl mt-4 leading-[1.05] text-white">
            Authentic Brass &amp; Copper Collection
            <br />
            <em className="font-accent text-gold-light">Crafted for Modern Homes.</em>
          </h1>
          <p className="mt-5 text-cream/80 max-w-2xl mx-auto text-lg">
            Discover handcrafted copper and brass collections from Moradabad, India. Designed for
            global retailers, wholesalers and discerning buyers.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link href="/products" className="btn btn-clay !px-6 !py-3">
              Explore Collections
            </Link>
            <Link
              href="/request-quote"
              className="btn !px-6 !py-3 border border-cream text-cream hover:bg-cream hover:text-espresso"
            >
              Request Wholesale Catalogue
            </Link>
          </div>
        </div>
      </section>
      {/* Torn-paper divider into the catalogue */}
      <div className="bg-white" aria-hidden="true">
        <svg className="block w-full h-6 text-cream" viewBox="0 0 1200 24" preserveAspectRatio="none" fill="currentColor">
          <path d="M0,0 L1200,0 L1200,8 L1100,10 L1020,6 L940,12 L860,8 L780,14 L700,9 L620,13 L540,8 L460,12 L380,7 L300,11 L220,8 L140,13 L60,9 L0,12 Z" />
        </svg>
      </div>

      <div className="container-x">
        {/* Shop by Category */}
        <section className="section" aria-labelledby="shop-by-category">
          <div className="text-center mb-8">
            <h2 id="shop-by-category" className="font-serif font-bold text-espresso text-2xl md:text-3xl">
              Shop by Category
            </h2>
            <p className="text-gray mt-1 text-sm">Browse the catalogue by craft range</p>
          </div>
          {categories === null ? (
            <Loading label="Loading categories…" />
          ) : categories.length === 0 ? (
            <p className="text-sm text-gray text-center">Categories will appear here once published.</p>
          ) : (
            <div className="flex flex-wrap justify-center gap-6 md:gap-8">
              {categories.slice(0, 6).map((c) => (
                <CategoryCircle key={c.slug} category={c} />
              ))}
            </div>
          )}
        </section>

        {/* Featured Collection editorial split */}
        {spotlight && (
          <section className="section !pt-0" aria-labelledby="featured-collection">
            <div className="grid lg:grid-cols-2 gap-0 bg-white border border-sand">
              <div className="relative min-h-72 bg-navy overflow-hidden">
                {spotlight.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaUrl(spotlight.image_url)}
                    alt={spotlight.name}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span
                    className="absolute inset-0 flex items-center justify-center font-serif text-8xl font-bold text-gold-light"
                    aria-hidden="true"
                  >
                    {spotlight.name.trim().charAt(0).toUpperCase() || "N"}
                  </span>
                )}
              </div>
              <div className="p-8 md:p-12">
                <p className="text-petrol uppercase tracking-widest text-xs font-semibold">
                  Featured Collection
                </p>
                <h2 id="featured-collection" className="font-serif font-bold text-navy text-3xl md:text-4xl mt-2">
                  {spotlight.name}
                </h2>
                {spotlight.description && <p className="text-gray mt-4">{spotlight.description}</p>}
                {spotlightProducts.length > 0 && (
                  <ul className="mt-5 space-y-1.5 text-sm">
                    {spotlightProducts.map((p) => (
                      <li key={p.id}>
                        <Link href={`/products/${p.slug}`} className="text-navy hover:underline underline-offset-2">
                          {p.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href={`/collections/${spotlight.slug}`} className="btn btn-primary">
                    View the Collection
                  </Link>
                  <Link href="/collections" className="btn btn-outline">
                    All Collections
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Featured Products */}
        <section className="section" aria-labelledby="featured-products">
          <div className="grid lg:grid-cols-5 gap-8">
            <div className="lg:col-span-1">
              <p className="eyebrow text-clay">Handpicked</p>
              <h2 id="featured-products" className="font-serif italic font-bold text-espresso text-3xl md:text-4xl mt-2">
                Featured Pieces
              </h2>
              <p className="text-sm text-gray mt-3">
                Selected pieces from the current catalogue — requested pricing on every item.
              </p>
              <Link href="/products" className="inline-block mt-4 text-xs tracking-[0.18em] text-clay font-semibold hover:underline underline-offset-4">
                EXPLORE ALL
              </Link>
            </div>
            <div className="lg:col-span-4">
              {featured === null ? (
                <Loading label="Loading products…" />
              ) : featured.length === 0 ? (
                <p className="text-sm text-gray">No featured products are published yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                  {featured.slice(0, 4).map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Timless Brass & Copper Essentials */}
        <section className="section" aria-labelledby="essentials">
          <div className="text-center mb-8">
            <h2 id="essentials" className="font-serif font-bold text-espresso text-2xl md:text-3xl">
              Timless Brass &amp; Copper Essentials
            </h2>
            <p className="text-gray mt-1 text-sm">
              Premium handcrafted brass &amp; copper collection for cooking, serving, gifting and everyday living
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { name: "Brass Collection", slug: "brass-collection", img: "https://luqgcacxkcrmhsdopjyl.supabase.co/storage/v1/object/public/media/coll-brass-collection.jpg" },
              { name: "Copper Collection", slug: "copper-collection", img: "https://luqgcacxkcrmhsdopjyl.supabase.co/storage/v1/object/public/media/coll-copper-collection.jpg" },
              { name: "Copper Drinkware", slug: "copper-drinkware", img: "https://luqgcacxkcrmhsdopjyl.supabase.co/storage/v1/object/public/media/coll-copper-drinkware.jpg" },
              { name: "Brass Kitchen", slug: "brass-kitchen-collection", img: "https://luqgcacxkcrmhsdopjyl.supabase.co/storage/v1/object/public/media/coll-brass-kitchen.jpg" },
              { name: "Metal Home Décor", slug: "metal-home-decor", img: "https://luqgcacxkcrmhsdopjyl.supabase.co/storage/v1/object/public/media/coll-metal-home-decor.jpg" },
              { name: "Gifting", slug: "gifting", img: "https://luqgcacxkcrmhsdopjyl.supabase.co/storage/v1/object/public/media/coll-gifting.jpg" },
            ].map((c) => (
              <Link
                key={c.slug}
                href={`/collections/${c.slug}`}
                className="group block bg-white border border-clay/15 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaUrl(c.img)}
                  alt={c.name}
                  className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="p-3 text-center">
                  <p className="text-xs font-semibold tracking-wide text-espresso uppercase">{c.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Craftsmanship storytelling */}
        <section className="section !pt-0" aria-labelledby="craft-story">
          <div className="grid md:grid-cols-2 gap-0 bg-white border border-clay/15">
            <div className="relative min-h-72 bg-espresso overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://luqgcacxkcrmhsdopjyl.supabase.co/storage/v1/object/public/media/craft-story-moradabad.jpg"
                alt="Craftsmanship in Moradabad"
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="p-8 md:p-12">
              <p className="eyebrow text-clay">Our Craft</p>
              <h2 id="craft-story" className="font-serif font-bold text-espresso text-3xl md:text-4xl mt-2">
                The Story Behind Every Piece
              </h2>
              <div className="text-gray space-y-4 mt-4">
                <p>
                  New Look Impex works from Moradabad, Uttar Pradesh — a city with a long-standing
                  tradition of brass and copper metalcraft. Our catalogue centres on handcrafted home
                  décor: urlis, diyas, lanterns, bowls, trays and statement pieces.
                </p>
                <p>
                  Each design is developed around the qualities of its material — the warmth of brass,
                  the lustre of copper — and finished for contemporary retail, hospitality and gifting
                  settings.
                </p>
                <Link href="/craft" className="btn btn-clay mt-2">
                  Discover Our Craft
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Shop by Purpose */}
        <section className="section" aria-labelledby="shop-by-purpose">
          <div className="relative mb-8 overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://luqgcacxkcrmhsdopjyl.supabase.co/storage/v1/object/public/media/shop-by-purpose.jpg"
              alt="Shop by purpose"
              className="w-full h-48 md:h-64 object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-espresso/60 flex items-center justify-center">
              <div className="text-center text-white">
                <h2 id="shop-by-purpose" className="font-serif italic font-bold text-2xl md:text-3xl">
                  Shop by Purpose
                </h2>
                <p className="text-white/80 mt-1 text-sm">Start from how you buy</p>
              </div>
            </div>
          </div>
          <PurposeBanners purposes={PURPOSES} categories={categories || []} />
        </section>

        {/* Customer Testimonials */}
        <section className="section bg-white border-y border-clay/10" aria-labelledby="testimonials">
          <div className="container-x">
            <div className="text-center mb-8">
              <h2 id="testimonials" className="font-serif font-bold text-espresso text-2xl md:text-3xl">
                Customers are saying
              </h2>
              <p className="text-gray mt-1 text-sm">What our wholesale buyers say about New Look Impex</p>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {[
                { quote: "Excellent craftsmanship and reliable wholesale supply. Our customers love the copper bottles.", name: "Retail Buyer, UAE", rating: 5 },
                { quote: "Great quality brass décor with consistent finishing. Smooth ordering process for bulk orders.", name: "Import Buyer, UK", rating: 5 },
                { quote: "Responsive team and dependable export packaging. Will continue sourcing from New Look Impex.", name: "Wholesale Distributor, USA", rating: 5 },
              ].map((t, i) => (
                <div key={i} className="card text-center">
                  <div className="text-gold text-lg mb-2">{"★".repeat(t.rating)}</div>
                  <p className="text-sm text-gray italic">"{t.quote}"</p>
                  <p className="mt-3 text-xs font-semibold tracking-wide text-espresso uppercase">{t.name}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray text-center mt-4">
              (Testimonials are editable from the admin dashboard — publish only genuine customer feedback with permission.)
            </p>
          </div>
        </section>

        {/* International Wholesale Enquiry */}
        <section className="section bg-espresso text-cream" aria-labelledby="global-enquiry">
          <div className="container-x">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <p className="text-gold-light uppercase tracking-[0.22em] text-xs font-semibold">Global Sourcing</p>
                <h2 id="global-enquiry" className="font-serif font-bold text-3xl md:text-4xl mt-2 text-white">
                  International Wholesale Enquiries Welcome
                </h2>
                <p className="text-cream/80 mt-4">
                  New Look Impex supplies handcrafted brass and copper handicrafts to buyers across the USA, UK, UAE,
                  Australia, Canada, Europe and Saudi Arabia. We handle bulk orders, custom manufacturing, private
                  labelling and corporate gifting programmes.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/request-quote" className="btn btn-clay !px-6 !py-3">
                    Request Wholesale Catalogue
                  </Link>
                  <Link href="/wholesale" className="btn !px-6 !py-3 border border-cream/40 text-cream hover:bg-cream hover:text-espresso">
                    Wholesale Programme
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {["USA", "UK", "UAE", "Australia", "Canada", "Europe"].map((c) => (
                  <Link
                    key={c}
                    href={`/${c.toLowerCase().replace(" ", "-")}`}
                    className="bg-white/10 backdrop-blur border border-cream/20 rounded-lg p-4 text-center hover:bg-white/20 transition-colors"
                  >
                    <span className="text-sm font-semibold tracking-wide">{c}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Instagram & YouTube Showcase */}
        <section className="section" aria-labelledby="social">
          <div className="container-x">
            <div className="text-center mb-8">
              <h2 id="social" className="font-serif font-bold text-espresso text-2xl md:text-3xl">
                Follow Our Craft
              </h2>
              <p className="text-gray mt-1 text-sm">Instagram &amp; YouTube — behind the scenes of Moradabad craftsmanship</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <a
                href="https://www.instagram.com/nli_collections_india"
                target="_blank"
                rel="noopener noreferrer"
                className="card flex items-center gap-4 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xl font-bold">
                  IG
                </div>
                <div>
                  <p className="font-semibold text-espresso">Instagram</p>
                  <p className="text-xs text-gray">@nli_collections_india</p>
                </div>
              </a>
              <a
                href="https://youtube.com/@nlicollections"
                target="_blank"
                rel="noopener noreferrer"
                className="card flex items-center gap-4 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-white text-xl font-bold">
                  YT
                </div>
                <div>
                  <p className="font-semibold text-espresso">YouTube</p>
                  <p className="text-xs text-gray">@nlicollections</p>
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* Certifications & Organization Resources */}
        <section className="section bg-white border-y border-clay/10" aria-labelledby="certifications">
          <div className="container-x">
            <div className="text-center mb-8">
              <h2 id="certifications" className="font-serif font-bold text-espresso text-2xl md:text-3xl">
                Certifications &amp; Organization Resources
              </h2>
              <p className="text-gray mt-1 text-sm">
                Verified business credentials and trade organization memberships
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: "EPCH", desc: "Export Promotion Council for Handicrafts", href: "https://www.epch.in" },
                { name: "UP EPB", desc: "Uttar Pradesh Export Promotion Bureau", href: "https://upepb.org" },
                { name: "ODOP", desc: "One District One Product — Moradabad", href: "https://odop.gov.in" },
                { name: "GST Registered", desc: "GSTIN: 09AFKPA4462R1ZW", href: "#" },
              ].map((c) => (
                <a
                  key={c.name}
                  href={c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card text-center hover:shadow-md transition-shadow"
                >
                  <p className="font-serif font-bold text-espresso text-lg">{c.name}</p>
                  <p className="text-xs text-gray mt-1">{c.desc}</p>
                </a>
              ))}
            </div>
            <p className="text-xs text-gray text-center mt-4">
              (Official logo assets are displayed only after verification. Organization memberships are subject to
              renewal and verification.)
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="section" aria-labelledby="faq">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h2 id="faq" className="font-serif font-bold text-espresso text-2xl md:text-3xl">
                Frequently Asked Questions
              </h2>
              <p className="text-gray mt-1 text-sm">Common questions from wholesale buyers</p>
            </div>
            <div className="space-y-2">
              {FAQS.map((f, i) => (
                <div key={i} className="border border-clay/20 bg-white">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    aria-expanded={openFaq === i}
                  >
                    <span className="font-serif font-semibold text-espresso">{f.q}</span>
                    <span className="text-clay text-xl">{openFaq === i ? "−" : "+"}</span>
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-4 text-sm text-gray leading-relaxed">{f.a}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Wholesale CTA */}
        <section className="section !pt-0" aria-labelledby="wholesale-cta">
          <div className="bg-espresso text-cream p-8 md:p-12 grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 id="wholesale-cta" className="font-serif font-bold text-3xl md:text-4xl text-white">
                Building Your Next Collection?
              </h2>
              <p className="text-cream/75 mt-4">
                Tell us what you are sourcing — products, quantities and destination — and we will
                confirm pricing, MOQ and lead time in writing before anything is committed.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row md:justify-end gap-3">
              <Link href="/wholesale" className="btn btn-clay !px-6 !py-3">
                Discuss Your Requirements
              </Link>
              <a
                href={whatsappLink("Hi New Look Impex, I would like to discuss wholesale requirements.")}
                target="_blank"
                rel="noopener noreferrer"
                className="btn !px-6 !py-3 border border-cream/40 text-cream hover:bg-cream hover:text-espresso"
              >
                WhatsApp Us
              </a>
            </div>
          </div>
        </section>

        {/* Sourcing assurances — factual, no testimonials */}
        <section className="section !pt-0" aria-label="Sourcing assurances">
          <div className="bg-olive text-cream p-8 md:p-12">
            <h2 className="font-serif italic font-bold text-2xl md:text-3xl text-center">
              Sourcing With Confidence
            </h2>
            <div className="mt-8 grid md:grid-cols-3 gap-8 text-center">
              <div>
                <p className="font-serif font-bold text-lg">Written Quotations</p>
                <p className="text-sm text-cream/80 mt-2">
                  Every enquiry receives a reference number and a written per-order quote covering
                  price, MOQ and lead time.
                </p>
              </div>
              <div>
                <p className="font-serif font-bold text-lg">Export Enquiries Welcome</p>
                <p className="text-sm text-cream/80 mt-2">
                  We respond to bulk and export enquiries from our listed target countries with
                  destination-specific terms.
                </p>
              </div>
              <div>
                <p className="font-serif font-bold text-lg">Customisation on Enquiry</p>
                <p className="text-sm text-cream/80 mt-2">
                  Sizes, finishes and bespoke designs are quoted like any wholesale order — just ask.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Journal teaser */}
        <section className="section" aria-labelledby="journal">
          <SectionTitle
            id="journal"
            title="Buying Guides"
            subtitle="Practical notes for wholesale décor buyers"
            href="/buyer-resources"
          />
          <div className="grid md:grid-cols-3 gap-5">
            {JOURNAL.map((j) => (
              <Link key={j.title} href="/buyer-resources" className="card-flat bg-white hover:border-brass transition-colors group">
                <p className="text-[11px] uppercase tracking-widest text-petrol font-semibold">Guide</p>
                <h3 className="font-serif font-semibold text-navy text-lg mt-1 group-hover:underline underline-offset-2">
                  {j.title}
                </h3>
                <p className="text-sm text-gray mt-2">{j.text}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {dataError && (
        <div className="container-x pb-10">
          <ErrorBox error={dataError} retry={retry} />
        </div>
      )}
    </>
  );
}
