import "./globals.css";
import type { Metadata } from "next";
import { SessionProviderWrapper } from "@/components/providers/SessionProvider";

export const metadata: Metadata = {
  metadataBase: new URL("https://newlookimpex.store"),
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
      "Factory-direct brass & copper products from Moradabad, India — utensils, kitchenware, cookware, décor and festive gifting for global B2B buyers. Manufacturer, exporter and wholesale supplier with written quotations and export logistics.",
    type: "website",
    url: "https://newlookimpex.store",
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
  alternates: {
    canonical: "https://newlookimpex.store/",
    languages: {
      "en-IN": "https://newlookimpex.store/",
      "en-AU": "https://newlookimpex.store/au",
      "en-AE": "https://newlookimpex.store/uae",
      "en-GB": "https://newlookimpex.store/uk",
      "en-US": "https://newlookimpex.store/usa",
      "en-CA": "https://newlookimpex.store/canada",
      "en-EU": "https://newlookimpex.store/europe",
      "x-default": "https://newlookimpex.store/",
    },
  },
};

import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
  return (
    <html lang="en-IN" className={`${jakarta.variable} ${playfair.variable}`}>
      <head>
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','GTM-PFWKB7XW');`,
          }}
        />
        {/* Google Tag Manager - GTM-M4GDWFQT */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','GTM-M4GDWFQT');`,
          }}
        />
        {/* Google Tag Manager gtag.js */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());`,
          }}
        />
        {/* Organization Schema (JSON-LD) - Validated via Google Rich Results Test */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "New Look Impex",
              "description": "Manufacturer and Exporter of Handcrafted Brass and Copper Products",
              "url": "https://newlookimpex.store",
              "logo": "https://newlookimpex.store/logo.png",
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Moradabad",
                "addressRegion": "Uttar Pradesh",
                "addressCountry": "India",
                "postalCode": "244001"
              },
              "telephone": "+91 8218251238",
              "email": "newlookimpex130@gmail.com",
              "sameAs": [
                "https://facebook.com/newlookimpex",
                "https://instagram.com/newlookimpex_india"
              ]
            }, null, 2)
          }}
        />
      </head>
      <body className="font-sans">
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PFWKB7XW"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          ></iframe>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-M4GDWFQT"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          ></iframe>
        </noscript>
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
