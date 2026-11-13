import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Custom Manufacturing & OEM — Bespoke Metalware",
  description:
    "Custom sizes, finishes, engraving and private label for brass and copper products — OEM manufacturing from Moradabad, India, quoted per order.",
  alternates: { canonical: "/customisation" },
  openGraph: {
    title: "Custom Manufacturing & OEM — Bespoke Metalware | New Look Impex",
    description:
      "Custom sizes, finishes, engraving and private label for brass and copper products — OEM manufacturing from Moradabad, India, quoted per order.",
    type: "website",
    url: "https://www.newlookimpex.store/customisation",
    siteName: "New Look Impex",
  },
  twitter: {
    card: "summary_large_image",
    title: "Custom Manufacturing & OEM — Bespoke Metalware | New Look Impex",
    description:
      "Custom sizes, finishes, engraving and private label for brass and copper products — OEM manufacturing from Moradabad, India, quoted per order.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
