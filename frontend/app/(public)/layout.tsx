import type { Metadata } from "next";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";

export const metadata: Metadata = {
  title: {
    default: "New Look Impex — Brass & Copper Handicrafts Wholesale | Moradabad",
    template: "%s | New Look Impex",
  },
  description:
    "New Look Impex is a Moradabad, Uttar Pradesh based wholesaler of brass and copper handicrafts — urlis, diyas, lanterns, metal home décor and gifting. Request wholesale quotes (RFQ) for bulk orders.",
  keywords:
    "brass handicrafts wholesale, copper handicrafts, Moradabad exporter, brass urli wholesale, diyas bulk, metal home decor wholesale, gifting India",
  alternates: { canonical: "https://newlookimpex.store/" },
  openGraph: {
    title: "New Look Impex — Brass & Copper Handicrafts Wholesale",
    description:
      "Wholesale brass & copper handicrafts from Moradabad. Urlis, diyas, lanterns, metal home décor and gifting. Request a wholesale quote today.",
    type: "website",
  },
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
