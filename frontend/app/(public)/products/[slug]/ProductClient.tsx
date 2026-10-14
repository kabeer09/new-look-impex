"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, mediaUrl, trackEvent, whatsappLink } from "@/lib/api";
import type { ProductDetail } from "@/lib/types";
import { useRfqCart } from "@/lib/rfq";
import { Loading, ErrorBox, EmptyState, formatPrice } from "@/components/public/States";
import { ProductGrid } from "@/components/public/Shared";

function GalleryImage({ url, alt }: { url: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={mediaUrl(url)} alt={alt} className="object-cover w-full h-full" loading="lazy" />
  );
}

export default function ProductClient({ slug }: { slug: string }) {
  const router = useRouter();
  const cart = useRfqCart();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [err, setErr] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!slug) return;
    setProduct(null);
    setErr("");
    setNotFound(false);
    setImgIdx(0);
    api<ProductDetail>(`/api/public/products/${encodeURIComponent(slug)}`)
      .then((p) => {
        setProduct(p);
        const parsed = parseInt(String(p.moq ?? ""), 10);
        setQty(Number.isFinite(parsed) && parsed > 0 ? parsed : 1);
        trackEvent({ event_type: "product_view", product_id: p.id });
      })
      .catch((e) => {
        if (String(e).startsWith("404")) setNotFound(true);
        else setErr(String(e));
      });
  }, [slug]);

  const addToEnquiry = () => {
    if (!product) return;
    cart.add({ product_id: product.id, product_name: product.name, quantity: qty });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  };

  if (notFound) {
    return (
      <div className="container-x section">
        <EmptyState
          title="Product not found"
          hint="This product may have been removed or the link is incorrect."
          action={<Link className="btn btn-primary btn-sm" href="/products">Back to catalogue</Link>}
        />
      </div>
    );
  }
  if (err) return <div className="container-x section"><ErrorBox error={err} retry={() => router.refresh()} /></div>;
  if (!product) return <div className="container-x section"><Loading label="Loading product…" /></div>;

  const images = [product.image, ...product.images.filter((im) => im.url !== product.image?.url)].filter(
    Boolean
  ) as { url: string; alt_text: string | null; is_concept?: boolean | null }[];
  const main = images[imgIdx] || null;
  const mainIsConcept = Boolean(main?.is_concept);
  const priceLine =
    product.price_on_request || product.price == null ? null : formatPrice(product.price, product.currency);

  // Only verified attributes — skip anything unset.
  const specs: [string, string][] = ([
    ["Material", product.material],
    ["Finish", product.finish],
    ["Colour", product.color],
    ["Dimensions", product.dimensions],
    ["Weight", product.weight],
    ["SKU", product.sku],
    ["MOQ", product.moq != null ? String(product.moq) : null],
    ["Lead time", product.lead_time],
    ["Packaging", product.packaging_info],
  ] as [string, string | null][]).flatMap(([k, v]) => (v ? [[k, v] as [string, string]] : []));

  const canonical = `https://newlookimpex.store/products/${product.slug}`;
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url: canonical,
  };
  if (product.description || product.short_description) {
    jsonLd.description = product.description || product.short_description;
  }
  if (product.sku) jsonLd.sku = product.sku;
  if (product.material) jsonLd.material = product.material;
  if (main?.url && !mainIsConcept) jsonLd.image = [mediaUrl(main.url)];
  if (product.category) {
    jsonLd.category = product.category.name;
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://newlookimpex.store/" },
      { "@type": "ListItem", position: 2, name: "Products", item: "https://newlookimpex.store/products" },
      { "@type": "ListItem", position: 3, name: product.name, item: canonical },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <section className="bg-sand/60 border-b border-sand">
        <div className="container-x py-6">
          <nav className="text-xs text-gray" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-navy">Home</Link>
            <span className="mx-1">/</span>
            <Link href="/products" className="hover:text-navy">Products</Link>
            {product.category && (
              <>
                <span className="mx-1">/</span>
                <Link
                  href={`/products?category=${encodeURIComponent(product.category.slug)}`}
                  className="hover:text-navy"
                >
                  {product.category.name}
                </Link>
              </>
            )}
            <span className="mx-1">/</span>
            <span className="text-charcoal">{product.name}</span>
          </nav>
        </div>
      </section>

      <div className="container-x section">
        <div className="grid lg:grid-cols-2 gap-10">
          {/* Gallery */}
          <div>
            <div className="relative aspect-square bg-sand overflow-hidden">
              {main?.url ? (
                <GalleryImage url={main.url} alt={main.alt_text || product.name} />
              ) : (
                <span
                  className="absolute inset-0 flex items-center justify-center bg-navy font-serif text-8xl font-bold text-gold-light"
                  aria-hidden="true"
                >
                  {product.name.charAt(0)}
                </span>
              )}
              {mainIsConcept && (
                <span className="absolute bottom-3 left-3 badge !bg-navy/90 !text-ivory !px-3 !py-1">
                  Concept imagery — not a product photograph
                </span>
              )}
              {product.featured && <span className="absolute top-3 left-3 badge badge-brass bg-white/90">Featured</span>}
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex gap-2 flex-wrap">
                {images.map((g, i) => (
                  <button
                    key={g.url + i}
                    onClick={() => setImgIdx(i)}
                    className={`relative w-20 h-20 overflow-hidden border-2 ${i === imgIdx ? "border-brass" : "border-transparent"}`}
                    aria-label={`View image ${i + 1}${g.is_concept ? " (concept imagery)" : ""}`}
                  >
                    <GalleryImage url={g.url} alt={g.alt_text || product.name} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            {product.sku && <p className="text-xs uppercase tracking-widest text-gray">SKU {product.sku}</p>}
            <h1 className="font-serif font-bold text-navy text-3xl md:text-4xl mt-1">{product.name}</h1>
            <p className="text-sm text-gray mt-1">
              {[product.category?.name, product.material, product.finish].filter(Boolean).join(" · ")}
            </p>

            <div className="mt-4">
              {priceLine ? (
                <p className="text-3xl font-bold text-navy">{priceLine}</p>
              ) : (
                <div className="card-flat !bg-ivory !border-brass/40">
                  <p className="font-semibold text-navy">Pricing on request — enquire for a wholesale quote</p>
                  <p className="text-xs text-gray mt-1">Prices are quoted per order based on quantity, finish and destination.</p>
                </div>
              )}
              {product.moq != null && (
                <p className="text-sm text-gray mt-2">Minimum order quantity: <b>{product.moq}</b></p>
              )}
              {product.lead_time && (
                <p className="text-sm text-gray mt-1">Lead time: <b>{product.lead_time}</b></p>
              )}
            </div>

            {product.short_description && <p className="text-charcoal mt-4">{product.short_description}</p>}
            {product.description && (
              <div className="text-sm text-gray mt-4 space-y-2">
                {product.description.split(/\n+/).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            )}
            <p className="text-xs text-gray mt-4 italic">
              Finishes, sizes and packaging can be discussed as part of your enquiry — send your
              requirements and we will confirm what is possible in writing.
            </p>

            {/* CTAs */}
            <div className="mt-6 flex flex-wrap gap-2 items-center">
              <div className="flex items-center gap-2">
                <label htmlFor="pd-qty" className="text-xs text-gray">Qty</label>
                <input
                  id="pd-qty"
                  type="number"
                  min={1}
                  className="input !w-28"
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                />
              </div>
              <button className="btn btn-brass" onClick={addToEnquiry} disabled={added}>
                {added ? "Added to Enquiry List ✓" : "Add to Enquiry List"}
              </button>
              <Link href="/request-quote" className="btn btn-primary">Request Pricing</Link>
              <a
                className="btn btn-ghost"
                href={whatsappLink(
                  `Hi, I'm interested in "${product.name}" (SKU ${product.sku || "n/a"}). Please quote wholesale pricing for a bulk order.`
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
            </div>

            {/* Specifications */}
            {specs.length > 0 && (
              <div className="mt-8">
                <h2 className="font-serif font-bold text-navy text-xl mb-3">Specifications</h2>
                <table className="data card !p-0 overflow-hidden">
                  <tbody>
                    {specs.map(([k, v]) => (
                      <tr key={k}>
                        <th className="w-40 !uppercase">{k}</th>
                        <td>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Variants */}
            {product.variants.length > 0 && (
              <div className="mt-8">
                <h2 className="font-serif font-bold text-navy text-xl mb-3">Variants</h2>
                <table className="data card !p-0 overflow-hidden">
                  <thead>
                    <tr><th>Variant</th><th>SKU</th><th>Price</th><th>MOQ</th></tr>
                  </thead>
                  <tbody>
                    {product.variants.map((v, i) => (
                      <tr key={i}>
                        <td>{v.name}</td>
                        <td>{v.sku || "—"}</td>
                        <td>{product.price_on_request || v.price == null ? "On request" : formatPrice(v.price, product.currency)}</td>
                        <td>{v.moq ?? product.moq ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Collections */}
            {product.collections.length > 0 && (
              <div className="mt-8">
                <h2 className="font-serif font-bold text-navy text-xl mb-3">Collections</h2>
                <div className="flex flex-wrap gap-2">
                  {product.collections.map((c) => (
                    <Link key={c.slug} href={`/collections/${c.slug}`} className="badge !px-3 !py-1.5 hover:bg-brass/25">
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {product.tags.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {product.tags.map((t) => (
                  <Link key={t} href={`/products?q=${encodeURIComponent(t)}`} className="badge badge-gray">
                    {t}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Related */}
        {product.related.length > 0 && (
          <div className="mt-16">
            <h2 className="font-serif font-bold text-navy text-2xl md:text-3xl mb-6">Related products</h2>
            <ProductGrid products={product.related} />
          </div>
        )}
      </div>
    </>
  );
}
