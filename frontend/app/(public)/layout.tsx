import type { Metadata } from "next";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { SettingsBootstrap } from "@/components/public/SettingsBootstrap";

export const metadata: Metadata = {
  title: {
    default: "New Look Impex — Brass & Copper Handicrafts Wholesale | Moradabad",
    template: "%s | New Look Impex",
  },
  description:
    "New Look Impex is a Moradabad, Uttar Pradesh based wholesaler of brass and copper handicrafts — urlis, diyas, lanterns, metal home décor and gifting. Request wholesale quotes (RFQ) for bulk orders.",
  keywords:
    "brass handicrafts wholesale, copper handicrafts, Moradabad exporter, brass urli wholesale, diyas bulk, metal home decor wholesale, gifting India",
  // No group-level canonical: pages below declare their own self-canonical.
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
      <SettingsBootstrap />
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
