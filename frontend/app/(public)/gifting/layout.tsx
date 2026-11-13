import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Corporate & Festival Gifting — Brass & Copper",
  description:
    "Brass and copper gifting for corporate and festival programmes — diyas, lanterns, urlis and homeware with gift-ready packaging. Bulk enquiries.",
  alternates: { canonical: "/gifting" },
  openGraph: {
    title: "Corporate & Festival Gifting — Brass & Copper | New Look Impex",
    description:
      "Brass and copper gifting for corporate and festival programmes — diyas, lanterns, urlis and homeware with gift-ready packaging. Bulk enquiries.",
    type: "website",
    url: "https://www.newlookimpex.store/gifting",
    siteName: "New Look Impex",
  },
  twitter: {
    card: "summary_large_image",
    title: "Corporate & Festival Gifting — Brass & Copper | New Look Impex",
    description:
      "Brass and copper gifting for corporate and festival programmes — diyas, lanterns, urlis and homeware with gift-ready packaging. Bulk enquiries.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
