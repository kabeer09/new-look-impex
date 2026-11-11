"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

type CollectionCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  image: string;
  badge?: string;
};

export function CollectionDiscovery() {
  const collections: CollectionCard[] = [
    {
      id: "1",
      title: "Copper Collection",
      description:
        "Hand-hammered copper kitchenware, drinkware, and home décor. Each piece is crafted by artisans in Moradabad using traditional techniques passed down through generations.",
      href: "/copper-collection",
      image: "/copper-hero.jpg",
      badge: "New",
    },
    {
      id: "2",
      title: "Brass Collection",
      description:
        "Solid brass cookware, serveware, and decorative pieces. Timeless finish that develops a beautiful patina over time, perfect for hospitality and gifting.",
      href: "/brass-collection",
      image: "/brass-hero.jpg",
    },
    {
      id: "3",
      title: "Home Décor",
      description:
        "Brass urlis, diyas, lanterns, and decorative accents. Perfect for festive styling and adding artisanal charm to any interior space.",
      href: "/home-decor",
      image: "/home-decor-hero.jpg",
    },
    {
      id: "4",
      title: "Festive & Gifting",
      description:
        "Special occasion sets, gift boxes, and curated collections for weddings, festivals, and corporate gifting. Personalisation available.",
      href: "/gifting",
      image: "/festive-hero.jpg",
      badge: "Popular",
    },
  ];

  return (
    <section className="py-24 md:py-32 lg:py-40 bg-cream">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div>
            <p className="text-clay text-sm font-medium mb-4 tracking-wider">
              Collection Discovery
            </p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-charcoal leading-tight">
              Handcrafted Collections
            </h2>
            <p className="mt-6 text-charcoal/70 leading-relaxed">
              Explore our curated collections of handcrafted copper and brass homeware. Each piece is created by master artisans in Moradabad using traditional techniques combined with contemporary design.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4">
              <Link href="/collections" className="bg-charcoal text-white px-5 py-2 rounded text-sm font-medium">
                View All Collections
              </Link>
              <Link href="/copper-collection" className="border-2 border-charcoal text-charcoal px-5 py-2 rounded text-sm font-medium hover:bg-charcoal/10 transition-colors">
                Copper Collection
              </Link>
            </div>
          </div>

          {/* Image Grid */}
          <div>
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              {collections.map((card) => (
                <div
                  key={card.id}
                  className="group relative rounded-2xl overflow-hidden border border-cream/30 hover:shadow-xl hover:shadow-charcoal/10 transition-shadow cursor-pointer"
                >
                  <Image
                    src={card.image}
                    alt={card.title}
                    fill
                    className="aspect-[4/3] object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                    <div>
                      <p className="text-clay font-medium text-sm uppercase tracking-wider mb-2">{card.badge || ""}</p>
                      <h3 className="text-lg font-serif font-bold text-white">{card.title}</h3>
                      <p className="text-charcoal/90 text-sm line-clamp-2">{card.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}