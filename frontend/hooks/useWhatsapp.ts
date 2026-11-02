"use client";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { api, getWhatsappNumber, setWhatsappNumber, subscribeWhatsapp } from "@/lib/api";

/** Subscribe to the configured WhatsApp number (admin setting). Falls back to the
 *  bundled default until public settings load. Re-renders when it changes. */
export function useWhatsappNumber(): string {
  return useSyncExternalStore(subscribeWhatsapp, getWhatsappNumber, getWhatsappNumber);
}

/** Fetch public settings once (per mount) and push the configured WhatsApp number
 *  into the shared cache so all whatsappLink() consumers use the live value. */
export function useBootstrapWhatsapp(): void {
  const load = useCallback(() => {
    api<{ whatsapp_number?: string }>("/api/public/settings")
      .then((s) => {
        if (s?.whatsapp_number) setWhatsappNumber(s.whatsapp_number);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
  }, [load]);
}
