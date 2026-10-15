"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, mediaUrl, whatsappLink } from "@/lib/api";
import type { Banner, Category, Collection, ProductCard as ProductCardType } from "@/lib/types";
import { ProductGrid, SectionTitle } from "@/components/public/Shared";
import { ProductCard } from "@/components/public/ProductCard";
import { Loading, ErrorBox } from "@/components/public/States";

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
      <section className="bg-cream text-espresso">
        <div className="container-x py-14 md:py-20 grid lg:grid-cols-5 gap-10 items-center">
          <div className="lg:col-span-3">
            <p className="text-clay uppercase tracking-[0.22em] text-xs font-semibold">
              Rooted in Tradition
            </p>
            <h1 className="font-serif font-bold text-4xl md:text-6xl mt-4 leading-[1.05]">
              Timeless Craftsmanship.
              <br />
              Made for <em className="font-accent text-clay">Modern Living.</em>
            </h1>
            <p className="mt-5 text-espresso/75 max-w-2xl text-lg">
              Handcrafted metal décor from Moradabad for retailers, importers, interior designers and
              gifting programmes — urlis, diyas, lanterns and statement homeware, quoted per order for
              wholesale and bulk enquiries.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products" className="btn btn-clay !px-6 !py-3">
                Explore Our Collection
              </Link>
              <Link
                href="/request-quote"
                className="btn !px-6 !py-3 border border-espresso text-espresso hover:bg-espresso hover:text-cream"
              >
                Request Wholesale Pricing
              </Link>
            </div>
            <form
              className="mt-8 flex flex-col sm:flex-row gap-2 max-w-xl"
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                const query = q.trim();
                router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
              }}
            >
              <label htmlFor="hero-search" className="sr-only">
                Search the catalogue
              </label>
              <input
                id="hero-search"
                className="input !py-3 flex-1 !bg-white"
                placeholder='Try "brass urli" or "copper diya"…'
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button type="submit" className="btn btn-clay !py-3">
                Search catalogue
              </button>
            </form>
          </div>
          <div className="lg:col-span-2 hidden lg:block" aria-hidden={!heroBanner}>
            {heroBanner ? (
              <div className="relative overflow-hidden min-h-96 shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaUrl(heroBanner.image_url)}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-espresso/85 px-5 py-4 text-left">
                  <p className="font-serif font-semibold text-cream text-lg">{heroBanner.title}</p>
                  {heroBanner.subtitle && (
                    <p className="text-xs text-cream/70 mt-1">{heroBanner.subtitle}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    {banners.length > 1 &&
                      banners.map((b, i) => (
                        <button
                          key={b.id}
                          type="button"
                          aria-label={`Show banner ${i + 1}`}
                          onClick={() => setBannerIdx(i)}
                          className={`h-1.5 rounded-full transition-all ${i === bannerIdx % banners.length ? "w-6 bg-gold-light" : "w-3 bg-cream/40"}`}
                        />
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-espresso p-10 text-center shadow-lg">
                <p className="font-serif text-8xl font-bold text-gold-light">N</p>
                <p className="mt-4 text-xs uppercase tracking-widest text-cream/60">
                  Brass · Copper · Handcrafted
                </p>
              </div>
            )}
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

        {/* Craftsmanship storytelling */}
        <section className="section !pt-0" aria-labelledby="craft-story">
          <div className="grid md:grid-cols-2 gap-0 bg-white border border-clay/15">
            <div className="relative min-h-72 bg-espresso overflow-hidden">
              {storyImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaUrl(storyImage)}
                  alt="Handcrafted metal décor"
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <span
                  className="absolute inset-0 flex items-center justify-center font-serif text-8xl font-bold text-gold-light"
                  aria-hidden="true"
                >
                  N
                </span>
              )}
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
          <div className="text-center mb-8">
            <h2 id="shop-by-purpose" className="font-serif italic font-bold text-espresso text-2xl md:text-3xl">
              Shop by Purpose
            </h2>
            <p className="text-gray mt-1 text-sm">Start from how you buy</p>
          </div>
          <PurposeBanners purposes={PURPOSES} categories={categories || []} />
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
