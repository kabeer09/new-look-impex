import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Metal Home Décor — Wholesale Brass & Copper Decor",
  description:
    "Wholesale metal home décor — brass and copper vases, trays, bowls, planters and wall pieces for retail, hospitality and export buyers.",
  alternates: { canonical: "/metal-home-decor" },
  openGraph: {
    title: "Metal Home Décor — Wholesale Brass & Copper Decor | New Look Impex",
    description:
      "Wholesale metal home décor — brass and copper vases, trays, bowls, planters and wall pieces for retail, hospitality and export buyers.",
    type: "website",
    url: "https://www.newlookimpex.store/metal-home-decor",
    siteName: "New Look Impex",
  },
  twitter: {
    card: "summary_large_image",
    title: "Metal Home Décor — Wholesale Brass & Copper Decor | New Look Impex",
    description:
      "Wholesale metal home décor — brass and copper vases, trays, bowls, planters and wall pieces for retail, hospitality and export buyers.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
