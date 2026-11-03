import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://newlookimpex.store"),
  verification: {
    google: "TEfYClAKNA6ckET-Smb56-eka2ydnJ1BW3s0On4X6EI",
  },
  title: "New Look Impex — Brass & Copper Handicrafts Wholesale | Moradabad, India",
  description:
    "New Look Impex is a Moradabad, Uttar Pradesh based manufacturer and exporter of handcrafted brass and copper handicrafts — urlis, diyas, lanterns, bottles, cookware and metal home décor. Wholesale and bulk orders with written quotations.",
  keywords:
    "brass handicrafts wholesale, copper handicrafts, Moradabad exporter, brass urli wholesale, copper bottle wholesale, diyas bulk, metal home decor wholesale, gifting India, brass cookware",
  openGraph: {
    title: "New Look Impex — Brass & Copper Handicrafts Wholesale",
    description:
      "Handcrafted brass & copper décor from Moradabad for retailers, importers, interior designers and gifting programmes. Request a wholesale quote.",
    type: "website",
    url: "https://newlookimpex.store",
    siteName: "New Look Impex",
  },
  twitter: {
    card: "summary_large_image",
    title: "New Look Impex — Brass & Copper Handicrafts Wholesale",
    description:
      "Handcrafted brass & copper décor from Moradabad. Wholesale quotes for bulk orders.",
  },
  robots: { index: true, follow: true },
};

import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${playfair.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
