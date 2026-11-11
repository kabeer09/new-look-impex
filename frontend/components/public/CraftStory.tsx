"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export function CraftStory() {
  const [expanded, setExpanded] = useState("overview");

  return (
    <section className="py-24 md:py-32 lg:py-40 bg-cream">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          {/* Image Side */}
          <div className="relative">
            <Image
              src="/artisan-workshop.jpg"
              alt="Artisan hand-hammering copper in Moradabad workshop"
              fill
              className="rounded-2xl object-cover aspect-[4/3] shadow-2xl shadow-charcoal/20"
              loading="lazy"
            />
            <div className="absolute bottom-6 right-6 bg-antiqueGold px-6 py-3 rounded text-charcoal text-sm font-medium">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A7834E" strokeWidth="1.5" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-4z" />
              </svg>
              15+ Artisans
            </div>
          </div>

          {/* Story Content */}
          <div>
            <p className="text-clay text-sm font-medium mb-4 tracking-wider">
              Moradabad Craft Story
            </p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-charcoal leading-tight mb-6">
              Five Generations of Mastery
            </h2>
            <p className="mb-6 text-charcoal/70 leading-relaxed">
              New Look Impex stands at the heart of Moradabad's centuries-old metalcraft tradition. Our artisans inherit techniques passed down through five generations — from father to son, master to disciple. Each copper piece is hand-hammered on traditional anvils, each brass urli is cast using ancestral molds, and every engraving tells a story of place and purpose.
            </p>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="p-4 rounded-xl bg-charcoal/5">
                <div className="text-2xl text-antiqueGold font-serif mb-2">⚒️</div>
                <h4 className="font-medium text-charcoal">Hand-Hammering</h4>
                <p className="text-charcoal/70 text-sm">
                  Shaping copper on traditional anvils, each piece unique.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-charcoal/5">
                <div className="text-2xl text-antiqueGold font-serif mb-2">🔨</div>
                <h4 className="font-medium text-charcoal">Engraving</h4>
                <p className="text-charcoal/70 text-sm">
                  Custom patterns and motifs for B2B clients.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-charcoal/5">
                <div className="text-2xl text-antiqueGold font-serif mb-2">🏭</div>
                <h4 className="font-medium text-charcoal">Quality Inspection</h4>
                <p className="text-charcoal/70 text-sm">
                  Multi-stage checks before export.
                </p>
              </div>
            </div>
            <Link
              href="/about"
              className="bg-antiqueGold text-charcoal px-6 py-3 rounded text-playfair font-medium hover:bg-antiqueGold/90 transition-colors"
            >
              Read Full Story
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}