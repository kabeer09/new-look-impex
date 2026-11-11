"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type Product = {
  id: string;
  name: string;
  slug: string;
  images: string[];
  price: number;
  sale_price?: number;
  material: string;
  finish: string;
  description: string;
};

export function FeaturedProducts() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [loading, setLoading] = useState(true);

  if (loading) return <p className="text-charcoal py-12">Loading products…</p>;
  if (!products) return <p className="text-charcoal py-12">No products found.</p>;

  return (
    <section className="py-24 md:py-32 lg:py-40 bg-charcoal">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-clay text-sm font-medium mb-4 tracking-wider">
            Featured Products
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white leading-tight">
            Our Selections
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products!.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className="group rounded-xl overflow-hidden border border-cream/20 hover:shadow-xl hover:shadow-charcoal/10 transition-shadow cursor-pointer"
            >
              <Image
                src={product.images?.[0] || "/placeholder-product.jpg"}
                alt={product.name}
                className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                placeholder="blur"
                blurDataURL="data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='200' height='200' fill='%23cream'/%3E%3C/text '/%3E"
              />

              <div className="p-5">
                <p className="text-clay text-xs font-medium uppercase tracking-wider mb-2">
                  {product.material}
                </p>
                <h3 className="text-xl font-serif font-bold text-charcoal line-clamp-2">
                  {product.name}
                </h3>
                <p className="mt-2 text-charcoal/70 text-sm line-clamp-2">
                  {product.finish}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}