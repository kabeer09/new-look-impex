"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, mediaUrl, whatsappLink } from "@/lib/api";
import type { Banner, Category, Collection, ProductCard } from "@/lib/types";
import { ProductGrid, SectionTitle } from "@/components/public/Shared";
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

function CategoryTile({ category }: { category: Category }) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group relative block aspect-[4/3] bg-navy overflow-hidden"
      aria-label={category.name}
    >
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
          className="absolute inset-0 flex items-center justify-center font-serif text-7xl font-bold text-gold-light"
          aria-hidden="true"
        >
          {category.name.trim().charAt(0).toUpperCase() || "N"}
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 bg-navy/85 px-4 py-3">
        <span className="block font-serif font-semibold text-ivory group-hover:underline underline-offset-2">
          {category.name}
        </span>
        <span className="block text-xs text-ivory/70 mt-0.5">
          {category.product_count != null ? `${category.product_count} products` : "Browse range"}
        </span>
      </span>
    </Link>
  );
}

export default function HomeClient() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [featured, setFeatured] = useState<ProductCard[] | null>(null);
  const [spotlight, setSpotlight] = useState<Collection | null>(null);
  const [spotlightProducts, setSpotlightProducts] = useState<ProductCard[]>([]);
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
        api<Collection & { items?: ProductCard[] }>(`/api/public/collections/${encodeURIComponent(col.slug)}`)
          .then((full) => ({ col: full as Collection, products: full.items || [] }))
          .catch(() => ({ col, products: [] as ProductCard[] }))
      );
    Promise.allSettled([
      api<{ items: Category[] }>("/api/public/categories"),
      api<{ items: ProductCard[] }>("/api/public/products?sort=featured&page_size=8"),
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
    api<{ items: ProductCard[] }>("/api/public/products?sort=featured&page_size=8")
      .then((d) => setFeatured(d.items || []))
      .catch((e) => setDataError(String(e)));
  };

  return (
    <>
      {/* Editorial hero */}
      <section className="bg-navy text-ivory">
        <div className="container-x py-16 md:py-24 grid lg:grid-cols-5 gap-10 items-center">
          <div className="lg:col-span-3">
            <p className="text-gold-light uppercase tracking-widest text-xs font-semibold">
              Moradabad · Uttar Pradesh · India
            </p>
            <h1 className="font-serif font-bold text-4xl md:text-6xl mt-4 leading-tight text-white">
              Timeless Craftsmanship. Made for Modern Living.
            </h1>
            <p className="mt-5 text-ivory/80 max-w-2xl text-lg">
              Handcrafted metal décor from Moradabad for retailers, importers, interior designers and
              gifting programmes — urlis, diyas, lanterns and statement homeware, quoted per order for
              wholesale and bulk enquiries.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products" className="btn btn-brass !px-6 !py-3">
                Explore Our Collection
              </Link>
              <Link
                href="/request-quote"
                className="btn !px-6 !py-3 bg-white text-navy hover:bg-ivory"
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
                className="input !py-3 flex-1"
                placeholder='Try "brass urli" or "copper diya"…'
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button type="submit" className="btn btn-brass !py-3">
                Search catalogue
              </button>
            </form>
          </div>
          <div className="lg:col-span-2 hidden lg:block" aria-hidden={!heroBanner}>
            {heroBanner ? (
              <div className="relative overflow-hidden border border-brass/50 min-h-96">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaUrl(heroBanner.image_url)}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-navy/85 px-5 py-4 text-left">
                  <p className="font-serif font-semibold text-ivory text-lg">{heroBanner.title}</p>
                  {heroBanner.subtitle && (
                    <p className="text-xs text-ivory/70 mt-1">{heroBanner.subtitle}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    {banners.length > 1 &&
                      banners.map((b, i) => (
                        <button
                          key={b.id}
                          type="button"
                          aria-label={`Show banner ${i + 1}`}
                          onClick={() => setBannerIdx(i)}
                          className={`h-1.5 rounded-full transition-all ${i === bannerIdx % banners.length ? "w-6 bg-gold-light" : "w-3 bg-ivory/40"}`}
                        />
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-brass/50 p-10 text-center">
                <p className="font-serif text-8xl font-bold text-gold-light">N</p>
                <p className="mt-4 text-xs uppercase tracking-widest text-ivory/60">
                  Brass · Copper · Handcrafted
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="container-x">
        {/* Shop by Category */}
        <section className="section" aria-labelledby="shop-by-category">
          <SectionTitle
            id="shop-by-category"
            title="Shop by Category"
            subtitle="Browse the catalogue by craft range"
            href="/categories"
          />
          {categories === null ? (
            <Loading label="Loading categories…" />
          ) : categories.length === 0 ? (
            <p className="text-sm text-gray">Categories will appear here once published.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {categories.slice(0, 6).map((c) => (
                <CategoryTile key={c.slug} category={c} />
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
          <SectionTitle
            id="featured-products"
            title="Featured Products"
            subtitle="Selected pieces from the current catalogue"
            href="/products"
          />
          {featured === null ? (
            <Loading label="Loading products…" />
          ) : (
            <ProductGrid products={featured} emptyHint="No featured products are published yet." />
          )}
        </section>

        {/* Craftsmanship storytelling */}
        <section className="section !pt-0" aria-labelledby="craft-story">
          <div className="bg-sand/60 border border-sand p-8 md:p-12 grid md:grid-cols-2 gap-8">
            <div>
              <p className="text-petrol uppercase tracking-widest text-xs font-semibold">Our Craft</p>
              <h2 id="craft-story" className="font-serif font-bold text-navy text-3xl md:text-4xl mt-2">
                Shaped by hand in a city known for metalwork
              </h2>
            </div>
            <div className="text-gray space-y-4">
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
              <Link href="/craft" className="btn btn-outline mt-2">
                Discover Our Craft
              </Link>
            </div>
          </div>
        </section>

        {/* Shop by Purpose */}
        <section className="section" aria-labelledby="shop-by-purpose">
          <SectionTitle id="shop-by-purpose" title="Shop by Purpose" subtitle="Start from how you buy" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PURPOSES.map((p) => (
              <Link key={p.title} href={p.href} className="card-flat hover:border-brass transition-colors group bg-white">
                <h3 className="font-serif font-semibold text-navy text-lg group-hover:underline underline-offset-2">
                  {p.title}
                </h3>
                <p className="text-sm text-gray mt-2">{p.text}</p>
                <p className="text-xs text-brass-dark mt-3 font-semibold">Explore →</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Wholesale CTA */}
        <section className="section !pt-0" aria-labelledby="wholesale-cta">
          <div className="bg-navy text-ivory p-8 md:p-12 grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 id="wholesale-cta" className="font-serif font-bold text-3xl md:text-4xl text-white">
                Building Your Next Collection?
              </h2>
              <p className="text-ivory/75 mt-4">
                Tell us what you are sourcing — products, quantities and destination — and we will
                confirm pricing, MOQ and lead time in writing before anything is committed.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row md:justify-end gap-3">
              <Link href="/wholesale" className="btn btn-brass !px-6 !py-3">
                Discuss Your Requirements
              </Link>
              <a
                href={whatsappLink("Hi New Look Impex, I would like to discuss wholesale requirements.")}
                target="_blank"
                rel="noopener noreferrer"
                className="btn !px-6 !py-3 border border-ivory/40 text-ivory hover:bg-ivory hover:text-navy"
              >
                WhatsApp Us
              </a>
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
