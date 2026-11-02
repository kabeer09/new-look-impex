"use client";
import { useBootstrapWhatsapp } from "@/hooks/useWhatsapp";

/** Invisible helper that fetches public settings once on mount and pushes the
 *  configured WhatsApp number into the shared cache. Rendered in the public
 *  layout so every whatsappLink()/WhatsAppLink consumer uses the live value. */
export function SettingsBootstrap() {
  useBootstrapWhatsapp();
  return null;
}
