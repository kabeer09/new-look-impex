import type { ProductCard as ProductCardType } from "@/lib/types";
import { ProductCard } from "./ProductCard";
import { EmptyState } from "./States";

export function ProductGrid({ products, emptyHint }: { products: ProductCardType[]; emptyHint?: string }) {
  if (products.length === 0) {
    return <EmptyState title="No products found" hint={emptyHint || "Try a different search or filter."} action={<a className="btn btn-outline btn-sm" href="/products">Browse all products</a>} />;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

export function PageHero({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <section className="bg-sand/60 border-b border-sand">
      <div className="container-x py-12 md:py-16">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </section>
  );
}

export function SectionTitle({ title, subtitle, href, id }: { title: string; subtitle?: string; href?: string; id?: string }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6">
      <div>
        <h2 id={id} className="font-serif font-bold text-navy text-2xl md:text-3xl">{title}</h2>
        {subtitle && <p className="text-gray mt-1">{subtitle}</p>}
      </div>
      {href && (
        <a href={href} className="btn btn-outline btn-sm shrink-0">
          View all
        </a>
      )}
    </div>
  );
}
