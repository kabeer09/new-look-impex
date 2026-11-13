import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brass Collection — Wholesale Handicrafts India",
  description:
    "Explore our wholesale brass collection — urlis, diyas, lanterns, kitchenware and home décor handcrafted in Moradabad, India. Bulk and export supply.",
  alternates: { canonical: "/brass-collection" },
  openGraph: {
    title: "Brass Collection — Wholesale Handicrafts India | New Look Impex",
    description:
      "Explore our wholesale brass collection — urlis, diyas, lanterns, kitchenware and home décor handcrafted in Moradabad, India. Bulk and export supply.",
    type: "website",
    url: "https://www.newlookimpex.store/brass-collection",
    siteName: "New Look Impex",
  },
  twitter: {
    card: "summary_large_image",
    title: "Brass Collection — Wholesale Handicrafts India | New Look Impex",
    description:
      "Explore our wholesale brass collection — urlis, diyas, lanterns, kitchenware and home décor handcrafted in Moradabad, India. Bulk and export supply.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
