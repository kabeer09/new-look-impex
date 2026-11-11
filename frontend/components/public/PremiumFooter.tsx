"use client";

import Link from "next/link";

export function PremiumFooter() {
  return (
    <footer className="bg-charcoal py-24 md:py-32 lg:py-40">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16 mb-16">
          {/* Column 1: Company */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="#A7834E" stroke="none" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <path d="M9 12l2 2 4-4m6 2a2 2 0 0 1-2 2 2 2 0 0 1 2-2 2 2 0 0 1 2 2z"/>
              </svg>
              <span className="text-playfair font-serif text-2xl font-bold tracking-tight">NLI Collections</span>
            </div>
            <p className="text-charcoal/60 text-sm leading-relaxed">
              Handcrafted copper and brass homeware from Moradabad, Uttar Pradesh, India. Exported globally since 1995.
            </p>
            <p className="text-charcoal/60 text-sm mt-2"><a href="/admin/signin" className="hover:text-antiqueGold transition-colours">Admin Login</a></p>
          </div>

          {/* Column 2: Collections */}
          <div>
            <h4 className="text-playfair font-serif text-lg font-bold text-charcoal mb-6">Collections</h4>
            <ul className="space-y-3 text-charcoal/70 text-sm">
              <li><Link href="/copper-collection" className="hover:text-charcoal transition-colours">Copper Collection</Link></li>
              <li><Link href="/brass-collection" className="hover:text-charcoal transition-colours">Brass Collection</Link></li>
              <li><Link href="/home-decor" className="hover:text-charcoal transition-colours">Home Décor</Link></li>
              <li><Link href="/gifting" className="hover:text-charcoal transition-colours">Festive & Gifting</Link></li>
            </ul>
          </div>

          {/* Column 3: Trade Services */}
          <div>
            <h4 className="text-playfair font-serif text-lg font-bold text-charcoal mb-6">Trade Services</h4>
            <ul className="space-y-3 text-charcoal/70 text-sm">
              <li><Link href="/manufacturing" className="hover:text-charcoal transition-colours">Manufacturing</Link></li>
              <li><Link href="/custom-manufacturing" className="hover:text-charcoal transition-colours">Custom Manufacturing</Link></li>
              <li><Link href="/private-label" className="hover:text-charcoal transition-colours">OEM / Private Label</Link></li>
              <li><Link href="/export" className="hover:text-charcoal transition-colours">Export Support</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-12 border-t border-cream/20 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-charcoal/60 text-sm">
            &copy; {new Date().getFullYear()} NLI Collections. All rights reserved.
          </div>

          <div className="flex gap-6">
            <Link href="https://wa.me/919690053913" target="_blank" rel="noopener noreferrer" className="text-charcoal/60 hover:text-antiqueGold transition-colours">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2" aria-hidden="true">
                <path d="M17 2a1 1 0 0 0-1 1v3.83l6.15 3.83a1 1 0 0 0 1.39-1.18l3.83-6.15A1 1 0 0 0 17 2zM7.91 17.91a1 1 0 0 1 0 1.41l-3.15 3.15a1 1 0 0 1-1.41 0l-1.99-1.99a1 1 0 0 1 0-1.41l3.15-3.15a1 1 0 0 1 1.41 0zM12 3l-3 9h6l-3 9" />
              </svg>
              WhatsApp
            </Link>
            <Link href="mailto:newlookimpex@gmail.com" className="text-charcoal/60 hover:text-antiqueGold transition-colours">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EA4335" strokeWidth="2" aria-hidden="true">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2zm2 2v12l8-8V4L6 4v12z" />
              </svg>
              Email
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}