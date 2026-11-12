import type { Metadata } from "next";

const TITLE = "NLI Collections | Premium Brass, Copper & Home Décor";
const DESCRIPTION =
  "Discover handcrafted brass and copper home décor by NLI Collections. Elegant metal tableware, copper bottles and brass serveware from Moradabad, India.";
const URL = "https://www.newlookimpex.store/nli-collections";

export const metadata: Metadata = {
  // absolute — bypasses the site-wide "| New Look Impex" title template so the
  // B2C brand page keeps its own identity (no doubled brand)
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    "handcrafted brass home décor",
    "copper home décor",
    "brass decorative items",
    "brass tableware",
    "copper bottles",
    "brass serveware",
    "handmade brass gifts",
    "brass pooja items",
    "luxury metal home décor",
    "Moradabad brass handicrafts",
  ],
  alternates: { canonical: "/nli-collections" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: URL,
    siteName: "NLI Collections",
    type: "website",
    images: [{ url: "/hero-brass-kitchen.jpg", width: 1024, height: 1024, alt: "Handcrafted brass and copper homeware by NLI Collections" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/hero-brass-kitchen.jpg"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
