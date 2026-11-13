import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Diyas & Lanterns — Wholesale Manufacturer India",
  description:
    "Wholesale brass diyas and metal lanterns for festivals, gifting and retail — handcrafted in Moradabad, India. Bulk and export supply.",
  alternates: { canonical: "/diyas-lanterns" },
  openGraph: {
    title: "Diyas & Lanterns — Wholesale Manufacturer India | New Look Impex",
    description:
      "Wholesale brass diyas and metal lanterns for festivals, gifting and retail — handcrafted in Moradabad, India. Bulk and export supply.",
    type: "website",
    url: "https://www.newlookimpex.store/diyas-lanterns",
    siteName: "New Look Impex",
  },
  twitter: {
    card: "summary_large_image",
    title: "Diyas & Lanterns — Wholesale Manufacturer India | New Look Impex",
    description:
      "Wholesale brass diyas and metal lanterns for festivals, gifting and retail — handcrafted in Moradabad, India. Bulk and export supply.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
