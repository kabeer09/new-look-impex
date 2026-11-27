import "./globals.css";
import type { Metadata } from "next";
import { SessionProviderWrapper } from "@/components/providers/SessionProvider";
import { ORG_JSONLD } from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.newlookimpex.store"),
  verification: {
    google: "TEfYClAKNA6ckET-Smb56-eka2ydnJ1BW3s0On4X6EI",
  },
  title: "New Look Impex | Brass & Copper Manufacturer in India",
  description:
    "New Look Impex is a Moradabad, India-based manufacturer and exporter of handcrafted brass and copper products, home décor, kitchenware and metal handicrafts. Wholesale, OEM and private label enquiries welcome.",
  keywords: [
    "brass products manufacturer in Moradabad",
    "copper products manufacturer in India",
    "brass utensils manufacturer Moradabad",
    "copper utensils exporter India",
    "brass kitchenware wholesale supplier",
    "copper cookware exporter India",
    "brass handicrafts exporter Moradabad Uttar Pradesh",
    "B2B metal handicrafts supplier India",
    "wholesale brass home decor manufacturer",
    "copper bottle manufacturer India bulk",
    "brass diya wholesale supplier",
    "brass urli manufacturer exporter",
    "brass lantern bulk exporter",
    "OEM brass products manufacturer India",
    "private label copper kitchenware",
    "Indian brass handicrafts for importers",
    "copper jug pitcher wholesale manufacturer",
    "brass planter exporter Moradabad",
    "festive gifting metal products wholesale",
    "New Look Impex NLI Collections",
  ].join(", "),
  openGraph: {
    title: "New Look Impex — Brass & Copper Manufacturer, Exporter & Wholesale B2B Supplier",
    description:
      "Brass & copper products from Moradabad, India — utensils, kitchenware, cookware, décor and festive gifting for global B2B buyers. Manufacturer, exporter and wholesale supplier with written quotations and export logistics.",
    type: "website",
    url: "https://www.newlookimpex.store",
    siteName: "New Look Impex",
  },
  twitter: {
    card: "summary_large_image",
    title: "New Look Impex — Brass & Copper Manufacturer & Exporter",
    description:
      "Moradabad-based brass & copper products manufacturer, exporter and wholesale B2B supplier. Bulk quotes for retailers, importers and distributors.",
  },
  robots: { index: true, follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  // No site-wide canonical or hreflang: canonicals are declared per page, and
  // hreflang is emitted only by the reciprocal regional clusters
  // (regional-meta.ts / europe-meta.ts / hidden-markets.ts). A global cluster
  // would put incorrect language alternates on unrelated pages.
};

import { Plus_Jakarta_Sans, Playfair_Display, Cormorant_Garamond, Inter } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
  // GA4 stream measurement ID. Override via NEXT_PUBLIC_GA4_MEASUREMENT_ID if needed.
  const ga4Id = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || "G-0DP6C543VP";
  return (
    <html lang="en-IN" className={`${jakarta.variable} ${playfair.variable} ${cormorant.variable} ${inter.variable}`}>
      <head>
        {/* Start connections to the API and media host early — cuts critical-path latency. */}
        <link rel="preconnect" href="https://api.newlookimpex.store" crossOrigin="" />
        <link rel="preconnect" href="https://luqgcacxkcrmhsdopjyl.supabase.co" crossOrigin="" />
        {/* GTM containers (GTM-PFWKB7XW / GTM-M4GDWFQT) were removed: both returned 404
            and loaded ~182 KB of unused JS. GA4 below is the working analytics setup. */}
        {/* Google Analytics 4 — direct gtag.js.
            The previous snippet only defined gtag() and never called
            gtag('config', ...), so no GA4 property received any data. */}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', ${JSON.stringify(ga4Id)}, { send_page_view: true });`,
          }}
        />
        {/* Organization Schema (JSON-LD) — one shared definition for every page. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSONLD) }}
        />
      </head>
      <body className="font-sans">
        {turnstileSiteKey && (
          <script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
            async
            defer
          />
        )}
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
      </body>
    </html>
  );
}
