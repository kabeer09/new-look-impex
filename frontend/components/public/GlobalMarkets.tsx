"use client";

import Image from "next/image";
import Link from "next/link";

type Market = {
  id: string;
  title: string;
  description: string;
  image: string;
  href: string;
  badge?: string;
};

export function GlobalMarkets() {
  const markets: Market[] = [
    {
      id: "1",
      title: "USA",
      description:
        "Serving retailers, importers, and distributors across the United States with warehouse stock and expedited shipping.",
      image: "/usa-map.jpg",
      href: "/usa",
      badge: "New",
    },
    {
      id: "2",
      title: "UK",
      description:
        "Serving the United Kingdom with efficient export logistics and trade compliance support.",
      image: "/uk-map.jpg",
      href: "/uk",
    },
    {
      id: "3",
      title: "UAE",
      description:
        "Serving Dubai, Abu Dhabi, and across the GCC with premium copper and brass homeware collections.",
      image: "/uae-map.jpg",
      href: "/uae",
    },
    {
      id: "4",
      title: "Australia",
      description:
        "Serving Australian retailers and gift companies with our full range of copper and brass home décor.",
      image: "/au-map.jpg",
      href: "/au",
    },
    {
      id: "5",
      title: "Canada",
      description:
        "Serving Canadian importers and corporate gifting clients with our complete collection range.",
      image: "/canada-map.jpg",
      href: "/canada",
    },
    {
      id: "6",
      title: "Europe",
      description:
        "Serving European interior designers, retailers, and corporate clients with our premium collections.",
      image: "/europe-map.jpg",
      href: "/europe",
    },
  ];

  return (
    <section className="py-24 md:py-32 lg:py-40 bg-cream">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          {/* Text Content */}
          <div>
            <p className="text-clay text-sm font-medium mb-4 tracking-wider">
              Global Markets
            </p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-charcoal leading-tight">
              Worldwide Reach
            </h2>
            <p className="mt-6 text-charcoal/70 leading-relaxed">
              New Look Impex exports handcrafted copper and brass products to over 60 countries worldwide. Our established logistics network ensures timely delivery and compliant customs clearance for every international order.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4">
              <Link href="/distribution" className="bg-charcoal text-white px-5 py-2 rounded text-sm font-medium">
                Distribution Network
              </Link>
              <Link href="/contact" className="border-2 border-charcoal text-charcoal px-5 py-2 rounded text-sm font-medium hover:bg-charcoal/10 transition-colors">
                Get a Quote
              </Link>
            </div>
          </div>

          {/* Market Cards */}
          <div>
            <div className="grid grid-cols-3 gap-4">
              {markets.map((market) => (
                <div
                  key={market.id}
                  className="group rounded-xl overflow-hidden border border-cream/30 hover:shadow-xl hover:shadow-charcoal/10 transition-shadow aspect-[4/3] cursor-pointer"
                >
                  <Image
                    src={market.image}
                    alt={market.title}
                    fill
                    className="aspect-[4/3] object-cover transition-transform duration-500 group-hover:scale-105"
                    placeholder="blur"
                    blurDataURL="data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='200' height='200' fill='%23cream'/%3E%3C/text '/%3E"
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-charcoal/80 via-charcoal/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div>
                      <p className="text-clay font-medium text-sm uppercase tracking-wider mb-1">{market.badge || ""}</p>
                      <h3 className="text-xl font-serif font-bold text-white line-clamp-2">{market.title}</h3>
                      <p className="text-charcoal/90 text-sm line-clamp-2">{market.description}</p>
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