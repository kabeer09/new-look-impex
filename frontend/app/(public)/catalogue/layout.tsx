import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Download Product Catalogue — Brass & Copper",
  description:
    "Browse the complete New Look Impex catalogue of brass and copper products — urlis, diyas, lanterns, bottles, kitchenware, décor and gifting.",
  alternates: { canonical: "/catalogue" },
  openGraph: {
    title: "Download Product Catalogue — Brass & Copper | New Look Impex",
    description:
      "Browse the complete New Look Impex catalogue of brass and copper products — urlis, diyas, lanterns, bottles, kitchenware, décor and gifting.",
    type: "website",
    url: "https://www.newlookimpex.store/catalogue",
    siteName: "New Look Impex",
  },
  twitter: {
    card: "summary_large_image",
    title: "Download Product Catalogue — Brass & Copper | New Look Impex",
    description:
      "Browse the complete New Look Impex catalogue of brass and copper products — urlis, diyas, lanterns, bottles, kitchenware, décor and gifting.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
