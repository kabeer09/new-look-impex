import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact New Look Impex — Moradabad Manufacturer",
  description:
    "Contact New Look Impex for wholesale and export enquiries — email, phone and WhatsApp. Moradabad, Uttar Pradesh, India. GSTIN 09AFKPA4462R1ZW.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact New Look Impex — Moradabad Manufacturer | New Look Impex",
    description:
      "Contact New Look Impex for wholesale and export enquiries — email, phone and WhatsApp. Moradabad, Uttar Pradesh, India. GSTIN 09AFKPA4462R1ZW.",
    type: "website",
    url: "https://www.newlookimpex.store/contact",
    siteName: "New Look Impex",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact New Look Impex — Moradabad Manufacturer | New Look Impex",
    description:
      "Contact New Look Impex for wholesale and export enquiries — email, phone and WhatsApp. Moradabad, Uttar Pradesh, India. GSTIN 09AFKPA4462R1ZW.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
