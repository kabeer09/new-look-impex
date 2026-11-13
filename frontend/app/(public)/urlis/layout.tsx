import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brass Urlis — Wholesale from Moradabad, India",
  description:
    "Wholesale brass and copper urlis — the traditional Moradabad water vessel in classic and contemporary finishes. Bulk and export supply.",
  alternates: { canonical: "/urlis" },
  openGraph: {
    title: "Brass Urlis — Wholesale from Moradabad, India | New Look Impex",
    description:
      "Wholesale brass and copper urlis — the traditional Moradabad water vessel in classic and contemporary finishes. Bulk and export supply.",
    type: "website",
    url: "https://www.newlookimpex.store/urlis",
    siteName: "New Look Impex",
  },
  twitter: {
    card: "summary_large_image",
    title: "Brass Urlis — Wholesale from Moradabad, India | New Look Impex",
    description:
      "Wholesale brass and copper urlis — the traditional Moradabad water vessel in classic and contemporary finishes. Bulk and export supply.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
