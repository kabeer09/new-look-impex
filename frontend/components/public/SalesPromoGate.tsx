"use client";
import { usePathname } from "next/navigation";
import { SaleBar, SalePopup } from "./SalesPromo";

/**
 * Seasonal discount surfaces are consumer-brand (NLI Collections) only.
 * The main site is a B2B manufacturer/exporter channel — no "X% off"
 * announcement bar or email-capture discount popup belongs there.
 */
export function SalesPromoGate() {
  const path = usePathname() || "";
  const consumerPath = path === "/nli-collections" || path.startsWith("/collections");
  if (!consumerPath) return null;
  return (
    <>
      <SaleBar />
      <SalePopup />
    </>
  );
}
