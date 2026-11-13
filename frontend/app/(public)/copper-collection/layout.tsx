import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Copper Collection — Wholesale Copper Products",
  description:
    "Explore our wholesale copper collection — bottles, jugs, kitchenware, drinkware and décor handcrafted in Moradabad, India. Bulk and export supply.",
  alternates: { canonical: "/copper-collection" },
  openGraph: {
    title: "Copper Collection — Wholesale Copper Products | New Look Impex",
    description:
      "Explore our wholesale copper collection — bottles, jugs, kitchenware, drinkware and décor handcrafted in Moradabad, India. Bulk and export supply.",
    type: "website",
    url: "https://www.newlookimpex.store/copper-collection",
    siteName: "New Look Impex",
  },
  twitter: {
    card: "summary_large_image",
    title: "Copper Collection — Wholesale Copper Products | New Look Impex",
    description:
      "Explore our wholesale copper collection — bottles, jugs, kitchenware, drinkware and décor handcrafted in Moradabad, India. Bulk and export supply.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
