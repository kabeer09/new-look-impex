"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export function HeroSection() {
  const [showPopup, setShowPopup] = useState(false);

  return (
    <section className="bg-cream min-h-[60vh] md:min-h-[70vh] lg:min-h-[80vh] relative overflow-hidden">
      {/* Background accent band */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-antiqueGold/10" aria-hidden="true" />

      {/* Lifestyle imagery - full width */}
      <div className="absolute inset-0">
        <Image
          src="/hero-lifestyle.jpg"
          alt="Handcrafted copper and brass kitchenware and home décor from New Look Impex Moradabad"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Content overlay - left side */}
      <div className="relative z-10 flex flex-col min-w-0">
        <div className="absolute top-6 left-6 md:top-12 md:left-8 flex flex-col">
          {/* Announcement Bar */}
          <div className="bg-antiqueGold text-charcoal px-4 py-2 text-sm font-medium tracking-wider">
            {" "}
            <span className="font-medium" style={{ color: "#29251F" }}>
              SEASONAL CAMPAIGN: GET 20% OFF ON ALL COPPER COLLECTION - ENDS SOON
            </span>
            {" "}
          </div>

          {/* Main Heading */}
          <h1 className="mt-6 text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-charcoal leading-tight tracking-tight">
            The Art of Indian Metalcraft
          </h1>

          {/* Subheading */}
          <p className="mt-6 text-xl md:text-lg text-charcoal/70 leading-relaxed">
            Rooted in Moradabad. Crafted for the World.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
            <Link
              href="/collections"
              className="bg-charcoal text-white px-6 py-3 rounded text-playfair font-medium hover:bg-charcoal/90 transition-colors inline-block">
              Explore Collections
            </Link>
            <Link
              href="/request-quote"
              className="bg-antiqueGold text-charcoal px-6 py-3 rounded text-playfair font-medium hover:bg-antiqueGold/90 transition-colors inline-block">
              Partner With Us
            </Link>
            <Link
              href="/catalogue"
              className="border-2 border-charcoal text-charcoal px-6 py-3 rounded text-playfair font-medium hover:bg-charcoal/10 transition-colors inline-block">
              Browse Catalogue
            </Link>
          </div>
        </div>

        {/* Subtle decorative elements on right */}
        <div className="absolute right-0 bottom-0 opacity-5">
          <svg width="300" height="300" viewBox="0 0 24 24" fill="none" stroke="#A7834E" strokeWidth="1.5" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-4z" />
          </svg>
        </div>
      </div>
    </section>
  );
}