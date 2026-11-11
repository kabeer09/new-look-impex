"use client";

import Image from "next/image";
import Link from "next/link";

export function BrandStory() {
  return (
    <section className="py-24 md:py-32 lg:py-40 bg-charcoal">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          {/* Image Side */}
          <div className="relative">
            <Image
              src="/factory-exterior.jpg"
              alt="New Look Impex factory facade in Moradabad"
              fill
              className="rounded-2xl object-cover aspect-[4/3] shadow-2xl shadow-charcoal/20"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-charcoal/80 via-charcoal/50 to-transparent opacity-80"></div>
          </div>

          {/* Story Content */}
          <div>
            <p className="text-clay text-sm font-medium mb-4 tracking-wider">
              Brand Story
            </p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white leading-tight mb-6">
              Trusted Since 1995
            </h2>
            <p className="mb-6 text-charcoal/80 leading-relaxed">
              New Look Impex was founded in 1995 in Moradabad, Uttar Pradesh — India's premier centre for copper and brass metalcraft. What began as a small workshop has grown into a trusted manufacturer and exporter, serving retailers, importers, and distributors across six continents.
            </p>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="p-4 rounded-xl bg-charcoal/5">
                <div className="text-2xl text-antiqueGold font-serif mb-2">📅</div>
                <h4 className="font-medium text-charcoal">1995</h4>
                <p className="text-charcoal/70 text-sm">Founded in Moradabad</p>
              </div>
              <div className="p-4 rounded-xl bg-charcoal/5">
                <div className="text-2xl text-antiqueGold font-serif mb-2">🌍</div>
                <h4 className="font-medium text-charcoal">60+ Countries</h4>
                <p className="text-charcoal/70 text-sm">Export destinations</p>
              </div>
              <div className="p-4 rounded-xl bg-charcoal/5">
                <div className="text-2xl text-antiqueGold font-serif mb-2">👨‍🎨</div>
                <h4 className="font-medium text-charcoal">15+ Artisans</h4>
                <p className="text-charcoal/70 text-sm">Direct partner artisans</p>
              </div>
            </div>
            <blockquote className="mt-8 p-6 rounded-2xl bg-charcoal/5 border border-cream/20">
              <p className="text-charcoal/80 font-serif italic text-lg">
                "We don't just manufacture copper and brass — we preserve a legacy. Every piece that leaves our workshop carries the spirit of Moradabad's artisans and the trust of our global clients."
              </p>
              <cite className="text-right text-charcoal/60 font-medium mt-4">— New Look Impex</cite>
            </blockquote>
            <Link
              href="/about"
              className="bg-antiqueGold text-charcoal px-6 py-3 rounded text-playfair font-medium hover:bg-antiqueGold/90 transition-colors"
            >
              About Us
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}