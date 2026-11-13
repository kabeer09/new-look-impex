import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brass & Copper Product Categories — Wholesale",
  description:
    "Browse New Look Impex wholesale categories — brass urlis, diyas, lanterns, copper bottles, kitchenware, home décor and gifting from Moradabad, India.",
  alternates: { canonical: "/categories" },
  openGraph: {
    title: "Brass & Copper Product Categories — Wholesale | New Look Impex",
    description:
      "Browse New Look Impex wholesale categories — brass urlis, diyas, lanterns, copper bottles, kitchenware, home décor and gifting from Moradabad, India.",
    type: "website",
    url: "https://www.newlookimpex.store/categories",
    siteName: "New Look Impex",
  },
  twitter: {
    card: "summary_large_image",
    title: "Brass & Copper Product Categories — Wholesale | New Look Impex",
    description:
      "Browse New Look Impex wholesale categories — brass urlis, diyas, lanterns, copper bottles, kitchenware, home décor and gifting from Moradabad, India.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
