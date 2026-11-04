"use client";
import { useState } from "react";
import Link from "next/link";
import { mediaUrl, cardSrcSet, whatsappLink } from "@/lib/api";
import type { ProductCard as ProductCardType } from "@/lib/types";
import { useRfqCart } from "@/lib/rfq";
import { useWishlist } from "@/hooks/useWishlist";
import { formatPrice } from "./States";

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
  const [added, setAdded] = useState(false);
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
  const moqText = product.moq ? `MOQ: ${product.moq}` : null;

  return (
    <article className="product-card !rounded-none border-clay/15">
      <Link
        href={`/products/${product.slug}`}
        className="relative block aspect-[4/3] bg-cream overflow-hidden"
        aria-label={product.name}
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
        {product.featured && <span className="absolute top-2 left-2 badge !bg-clay !text-cream">Featured</span>}
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
          {showPrice ? (
            <p className="text-lg font-bold text-espresso">{formatPrice(product.price, product.currency)}</p>
          ) : (
            <p className="text-xs font-semibold tracking-wide text-clay uppercase">Price on request</p>
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
          <a
            href={whatsappLink(
              `Hi, I'm interested in "${product.name}"${product.sku ? ` (SKU ${product.sku})` : ""}. Please share wholesale pricing and MOQ details.`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block w-full text-center text-[11px] font-bold uppercase tracking-wider text-gold underline underline-offset-4 hover:text-clay"
          >
            💬 WhatsApp Enquiry
          </a>
        </div>
      </div>
    </article>
  );
}
