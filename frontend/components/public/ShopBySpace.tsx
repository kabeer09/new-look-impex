"use client";

import Image from "next/image";
import Link from "next/link";

type Space = {
  id: string;
  title: string;
  description: string;
  image: string;
  href: string;
};

export function ShopBySpace() {
  const spaces: Space[] = [
    {
      id: "1",
      title: "Living Room",
      description:
        "Elegant brass and copper accents that bring warmth and artisanal character to your living space.",
      image: "/living-room.jpg",
      href: "/shop/living-room",
    },
    {
      id: "2",
      title: "Kitchen",
      description:
        "Hand-hammered copper cookware and brass serveware for the heart of the home — functional art for everyday use.",
      image: "/kitchen.jpg",
      href: "/shop/kitchen",
    },
    {
      id: "3",
      title: "Dining",
      description:
        "Refined brass urlis, diyas, and decorative pieces for memorable dining experiences and festive gatherings.",
      image: "/dining.jpg",
      href: "/shop/dining",
    },
    {
      id: "4",
      title: "Festive Home",
      description:
        "Special occasion collections, gift sets, and curated displays for celebrations and corporate gifting.",
      image: "/festive-home.jpg",
      href: "/shop/festive",
    },
  ];

  return (
    <section className="py-24 md:py-32 lg:py-40 bg-cream">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-clay text-sm font-medium mb-4 tracking-wider">
            Shop by Space
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-charcoal leading-tight">
            For Your Home
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {spaces.map((space) => (
            <div
              key={space.id}
              className="group rounded-2xl overflow-hidden border border-cream/30 hover:shadow-xl hover:shadow-charcoal/10 transition-shadow cursor-pointer"
            >
              <Image
                src={space.image}
                alt={space.title}
                fill
                className="aspect-[4/3] object-cover transition-transform duration-500 group-hover:scale-105"
                placeholder="blur"
                blurDataURL="data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='200' height='200' fill='%23cream'/%3E%3C/text '/%3E"
              />
              <div className="p-5">
                <h3 className="text-lg font-serif font-bold text-charcoal line-clamp-2">{space.title}</h3>
                <p className="mt-2 text-charcoal/70 text-sm line-clamp-2">{space.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}