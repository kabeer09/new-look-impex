"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export function PremiumHeader() {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const handleSearch = async (q: string) => {
    if (!q.trim()) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowMobileMenu(false);
        setSearchOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="border-b border-cream/20 bg-cream/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 sm:py-6">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#A7834E" strokeWidth="1.5" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <path d="M9 12l2 2 4-4m6 2a2 2 0 0 1-2 2 2 2 0 0 1 2-2 2 2 0 0 1 2 2z"/>
            </svg>
            <span className="text-playfair font-serif text-2xl font-bold tracking-tight">NLI Collections</span>
          </Link>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setShowMobileMenu(true)}
            className="md:hidden p-2 rounded-full bg-clay/20 hover:bg-clay/30 transition-colors"
            aria-label="Open menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:block flex items-center gap-8">
            <Link href="/" className="text-playfair font-serif text-lg font-normal hover:text-charcoal transition-colors">Home</Link>
            <Link href="/collections" className="text-playfair font-serif text-lg font-normal hover:text-charcoal transition-colour">Collections</Link>
            <Link href="/copper-collection" className="text-playfair font-serif text-lg font-normal hover:text-charcoal transition-colour">Copper Collection</Link>
            <Link href="/brass-collection" className="text-playfair font-serif text-lg font-normal hover:text-charcoal transition-colour">Brass Collection</Link>
            <Link href="/request-quote" className="bg-charcoal text-white px-4 py-2 rounded text-playfair font-medium hover:bg-charcoal/90 transition-colors">
              Request a Quote
            </Link>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <button className="text-clay hover:text-charcoal transition-colors" aria-label="Search">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
            <button className="relative text-clay hover:text-charcoal transition-colors">
              Notification
              <span className="absolute -top-1.5 -right-1.5 bg-charcoal text-xs text-white rounded-full w-5 h-5 flex items-center justify-center">3</span>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="fixed inset-0 bg-cream/90 backdrop-blur-md z-40 flex flex-col min-h-screen p-6">
            <button
              onClick={() => setShowMobileMenu(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-clay/20 hover:bg-clay/30 transition-colors"
              aria-label="Close menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </button>
            <nav className="flex flex-col gap-6 mt-8">
              <Link href="/" className="text-playfair font-serif text-xl">Home</Link>
              <Link href="/collections" className="text-playfair font-serif text-xl">Collections</Link>
              <Link href="/copper-collection" className="text-playfair font-serif text-xl">Copper Collection</Link>
              <Link href="/brass-collection" className="text-playfair font-serif text-xl">Brass Collection</Link>
              <Link href="/request-quote" className="text-charcoal bg-clay px-4 py-3 rounded text-playfair font-medium w-full mb-4">Request a Quote</Link>
              <Link href="/contact" className="text-charcoal block py-3 border-t border-cream/20 w-full">Contact</Link>
            </nav>
            <div className="mt-8 pt-8 border-t border-cream/20">
              <h4 className="text-playfair font-serif text-sm mb-3">Quick Links</h4>
              <ul className="flex flex-col gap-2">
                <li><Link href="/about" className="text-sm text-clay hover:text-charcoal">About Us</Link></li>
                <li><Link href="/manufacturing" className="text-sm text-clay hover:text-charcoal">Manufacturing</Link></li>
                <li><Link href="/distribution" className="text-sm text-clay hover:text-charcoal">Distribution</Link></li>
                <li><Link href="/privacy" className="text-sm text-clay hover:text-charcoal">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-sm text-clay hover:text-charcoal">Terms & Conditions</Link></li>
              </ul>
            </div>
          </div>
        )}

        {/* Search Modal */}
        {searchOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl px-8 py-8">
              <h3 className="text-playfair font-serif text-2xl mb-6">Search</h3>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-clay/60" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch(searchQuery);
                  }}
                  placeholder="Search products, collections, or copper & brassware..."
                  className="w-full py-4 px-10 pr-12 font-medium text-gray-700 rounded border border-cream/20 focus:outline-none focus:ring-2 focus:ring-clay/30"
                />
                <button
                  type="submit"
                  onClick={() => handleSearch(searchQuery)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </button>
              </div>
              <p className="mt-6 text-sm text-gray-500">Best matches for "copper brass home décor"</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}