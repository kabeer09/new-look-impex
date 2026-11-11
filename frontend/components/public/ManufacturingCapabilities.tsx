"use client";

import Image from "next/image";
import Link from "next/link";

type Capability = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
};

export function ManufacturingCapabilities() {
  const capabilities: Capability[] = [
    {
      id: "1",
      title: "Precision Manufacturing",
      description:
        "State-of-the-art facilities in Moradabad with skilled artisans and modern equipment producing consistent quality at scale.",
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#A7834E" strokeWidth="1.5" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
        </svg>
      ),
      href: "/manufacturing",
    },
    {
      id: "2",
      title: "Custom Manufacturing",
      description:
        "Bespoke designs, custom sizes, finishes, engravings, and private labelling. OEM/ODM solutions tailored to your brand requirements.",
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#A7834E" strokeWidth="1.5" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
      href: "/custom-manufacturing",
    },
    {
      id: "3",
      title: "OEM / Private Label",
      description:
        "Full private label and OEM manufacturing services. Develop your own brass and copper product line with New Look Impex as your manufacturing partner.",
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#A7834E" strokeWidth="1.5" aria-hidden="true">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        </svg>
      ),
      href: "/private-label",
    },
    {
      id: "4",
      title: "Wholesale Supply",
      description:
        "Reliable bulk supply for retailers, importers, and distributors. Container-level ordering, consistent quality, and competitive wholesale pricing.",
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#A7834E" strokeWidth="1.5" aria-hidden="true">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        </svg>
      ),
      href: "/wholesale",
    },
    {
      id: "5",
      title: "Export Support",
      description:
        "Export-ready packaging, documentation support, and worldwide shipping coordination. Serving USA, UK, UAE, Australia, Canada, Europe, and Middle East markets.",
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#A7834E" strokeWidth="1.5" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      ),
      href: "/export",
    },
    {
      id: "6",
      title: "Quality Inspection",
      description:
        "Multi-stage quality checks covering material, dimensions, finish, and packaging. Every order receives a written specification and confirmation before production.",
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#A7834E" strokeWidth="1.5" aria-hidden="true">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <line x1="12" y1="22" x2="12" y2="14" />
          <path d="M9 10l2 2l2-2" />
          <path d="M15 10l-2 2l-2-2" />
        </svg>
      ),
      href: "/quality",
    },
  ];

  return (
    <section className="py-24 md:py-32 lg:py-40 bg-charcoal">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-clay text-sm font-medium mb-4 tracking-wider">
            Manufacturing Capabilities
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white leading-tight">
            Made in Moradabad
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
          {capabilities.map((cap) => (
            <div
              key={cap.id}
              className="group rounded-xl overflow-hidden border border-cream/20 hover:shadow-xl hover:shadow-charcoal/10 transition-shadow p-6"
            >
              <div className="w-12 h-12 rounded-lg bg-antiqueGold/10 mb-6 flex items-center justify-center group-hover:bg-antiqueGold/20 transition-colors">
                {cap.icon}
              </div>
              <h3 className="text-xl font-serif font-bold text-charcoal mb-3">
                {cap.title}
              </h3>
              <p className="text-charcoal/70 text-leading-relaxed">{cap.description}</p>
              <Link
                href={cap.href}
                className="mt-4 inline-flex items-center text-clay text-sm font-medium hover:underline">
                Learn More
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}