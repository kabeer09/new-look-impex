"use client";
import { useState } from "react";
import Link from "next/link";
import { mediaUrl, cardSrcSet, whatsappLink } from "@/lib/api";
import type { ProductCard as ProductCardType } from "@/lib/types";
import { useRfqCart } from "@/lib/rfq";
import { useWishlist } from "@/hooks/useWishlist";
import { useCompare } from "@/hooks/useCompare";
import { useMarket } from "@/lib/market";

function Monogram({ name }: { name: string }) {
  const letter = name.trim().charAt(0).toUpperCase() || "N";
  return (
    <span
      className="absolute inset-0 flex items-center justify-center bg-navy font-serif text-6xl font-bold text-gold-light"
      aria-hidden="true"
    >
      {letter}
    </span>
  );
}

export function ProductCard({ product }: { product: ProductCardType }) {
  const cart = useRfqCart();
  const wishlist = useWishlist();
  const compare = useCompare();
  const { money, quoteIn } = useMarket();
  const [added, setAdded] = useState(false);
  const [compareHint, setCompareHint] = useState(false);
  const img = product.image;
  const isConcept = Boolean(img?.is_concept);

  const add = () => {
    // MOQ is free text ("100 pcs") — use its leading number as the default qty.
    const parsed = parseInt(String(product.moq ?? ""), 10);
    cart.add({
      product_id: product.id,
      product_name: product.name,
      quantity: Number.isFinite(parsed) && parsed > 0 ? parsed : 1,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  };

  const meta = [product.category?.name, product.material, product.finish].filter(Boolean).join(" · ");
  const showPrice = !product.price_on_request && product.price != null;
  const priced = showPrice ? money(product.price, product.currency) : null;
  const moqText = product.moq ? `MOQ: ${product.moq}` : null;

  return (
    <article className="product-card !rounded-none border-clay/15">
      <Link
        href={`/products/${product.slug}`}
        className="relative block aspect-[4/3] bg-cream overflow-hidden"
        tabIndex={-1}
      >
        {img?.url ? (
          // Plain <img> keeps the card working with any API image host (no remote-pattern config needed).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaUrl(img.url)}
            srcSet={cardSrcSet(img.url)}
            sizes="(max-width: 640px) 100vw, 400px"
            alt={img.alt_text || `${product.name} — wholesale by New Look Impex, Moradabad`}
            width={800}
            height={600}
            className="object-cover w-full h-full hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <Monogram name={product.name} />
        )}
        {isConcept && (
          <span className="absolute bottom-2 left-2 badge !bg-navy/90 !text-ivory">Concept imagery</span>
        )}
        {product.featured && <span className="absolute top-2 left-2 badge !bg-clay-dark !text-cream">Featured</span>}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); wishlist.toggle(product.id); }}
          aria-label={wishlist.has(product.id) ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-sm hover:bg-white transition-colors"
        >
          <span className={wishlist.has(product.id) ? "text-red-500" : "text-gray"}>♥</span>
        </button>
      </Link>
      <div className="p-4 flex flex-col gap-1.5 flex-1">
        {product.sku && <p className="text-[11px] uppercase tracking-[0.14em] text-gray">SKU {product.sku}</p>}
        <h3 className="font-serif font-semibold text-espresso leading-snug">
          <Link href={`/products/${product.slug}`} className="hover:text-clay">
            {product.name}
          </Link>
        </h3>
        {meta && <p className="text-xs text-gray">{meta}</p>}
        {product.short_description && <p className="text-sm text-gray line-clamp-2">{product.short_description}</p>}
        <div className="mt-auto pt-2">
          {priced && priced.ok ? (
            <>
              <p className="text-lg font-bold text-espresso">{priced.text}</p>
              {priced.converted && priced.date && (
                <p className="text-[10px] leading-snug text-gray">
                  Indicative conversion · rate date {priced.date}
                </p>
              )}
            </>
          ) : (
            <p className="text-xs font-semibold tracking-wide text-clay-dark uppercase">{quoteIn}</p>
          )}
          {moqText && (
            <p className="text-[10px] uppercase tracking-wider text-navy/60 font-bold mb-1">{moqText}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href={`/products/${product.slug}`} className="btn btn-ghost btn-sm flex-1">
              Details
            </Link>
            <button type="button" className="btn btn-clay btn-sm flex-1" onClick={add} disabled={added}>
              {added ? "Added ✓" : "Add to Enquiry"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              const ok = compare.toggle({ id: product.id, slug: product.slug, name: product.name });
              if (!ok) {
                setCompareHint(true);
                window.setTimeout(() => setCompareHint(false), 2200);
              }
            }}
            aria-pressed={compare.has(product.id)}
            aria-label={compare.has(product.id) ? "In compare — remove from comparison" : "Compare — add to comparison"}
            className={`mt-2 flex w-full items-center justify-center gap-1.5 border px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors ${
              compare.has(product.id)
                ? "border-navy bg-navy text-cream"
                : "border-navy/25 text-navy hover:border-navy hover:bg-navy/5"
            }`}
          >
            <span aria-hidden="true">{compare.has(product.id) ? "✓" : "⊞"}</span>
            {compare.has(product.id) ? "In compare" : "Compare"}
          </button>
          {compareHint && (
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-clay">
              Compare holds up to 4 products — remove one first.
            </p>
          )}
          <a
            href={whatsappLink(
              `Hi, I'm interested in "${product.name}"${product.sku ? ` (SKU ${product.sku})` : ""}. Please share wholesale pricing and MOQ details.`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block w-full text-center text-[11px] font-bold uppercase tracking-wider text-gold-ink underline underline-offset-4 hover:text-clay-dark"
          >
            💬 WhatsApp Enquiry
          </a>
        </div>
      </div>
    </article>
  );
}
