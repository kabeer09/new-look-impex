"use client";
import { useEffect } from "react";
import { gaEvent } from "@/lib/ga4";

/**
 * One delegated click listener for contact-intent links. This prevents double
 * counting: the same WhatsApp/email/phone links are rendered in the header,
 * footer, chat, RFQ drawer and many pages. No href or personal data is sent.
 */
export function Ga4EnquiryTracker() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      if (href.startsWith("https://wa.me/") || href.startsWith("https://api.whatsapp.com/")) {
        gaEvent("whatsapp_click", { source: "site_link" });
      } else if (href.startsWith("mailto:")) {
        gaEvent("contact_click", { channel: "email" });
      } else if (href.startsWith("tel:")) {
        gaEvent("contact_click", { channel: "phone" });
      } else if (href.startsWith("/api/public/catalogue.pdf")) {
        gaEvent("catalogue_download", { source: "catalogue_link" });
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
