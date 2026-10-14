import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "Handcrafted Brass & Copper Décor — Wholesale | New Look Impex",
  description:
    "New Look Impex (Moradabad, India) offers handcrafted brass and copper home décor for retailers, importers, interior designers and gifting programmes. Browse the wholesale catalogue and request pricing.",
  alternates: { canonical: "https://newlookimpex.store/" },
  openGraph: {
    title: "New Look Impex — Timeless Craftsmanship. Made for Modern Living.",
    description:
      "Handcrafted metal décor from Moradabad for retailers, importers, designers and gifting. Explore the wholesale collection.",
    type: "website",
    url: "https://newlookimpex.store/",
  },
};

export default function HomePage() {
  return <HomeClient />;
}
