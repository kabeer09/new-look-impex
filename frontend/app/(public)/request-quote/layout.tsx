import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Request a Wholesale Quote — Brass & Copper RFQ",
  description:
    "Request a written quotation for brass and copper products — price, MOQ, lead time and packaging confirmed per order. B2B RFQ for buyers worldwide.",
  alternates: { canonical: "/request-quote" },
  openGraph: {
    title: "Request a Wholesale Quote — Brass & Copper RFQ | New Look Impex",
    description:
      "Request a written quotation for brass and copper products — price, MOQ, lead time and packaging confirmed per order. B2B RFQ for buyers worldwide.",
    type: "website",
    url: "https://www.newlookimpex.store/request-quote",
    siteName: "New Look Impex",
  },
  twitter: {
    card: "summary_large_image",
    title: "Request a Wholesale Quote — Brass & Copper RFQ | New Look Impex",
    description:
      "Request a written quotation for brass and copper products — price, MOQ, lead time and packaging confirmed per order. B2B RFQ for buyers worldwide.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
