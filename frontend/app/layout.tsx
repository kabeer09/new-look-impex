import "./globals.css";
import type { Metadata } from "next";
import { SessionProviderWrapper } from "@/components/providers/SessionProvider";

export const metadata: Metadata = {
  metadataBase: new URL("https://newlookimpex.store"),
  verification: {
    google: "TEfYClAKNA6ckET-Smb56-eka2ydnJ1BW3s0On4X6EI",
  },
  title: "New Look Impex — Brass & Copper Products Manufacturer, Exporter & Wholesale B2B Supplier | Moradabad, India",
  description:
    "New Look Impex (NLI Collections) is a brass and copper products manufacturer, exporter and wholesale B2B supplier based in Moradabad, Uttar Pradesh, India. Brass utensils & kitchenware, copper cookware & bottles, handcrafted urlis, diyas, lanterns, decorative home accents and festival gifting at factory-direct bulk prices. Trusted by global retailers, importers, distributors, hardline/HORECA buyers. GSTIN 09AFKPA4462R1ZW — request your written quotation.",
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
};

import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${playfair.variable}`}>
      <body className="font-sans">
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
      </body>
    </html>
  );
}
