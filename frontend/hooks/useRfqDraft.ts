"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

/**
 * Abandoned-RFQ recovery — Shopify-style abandoned-checkout follow-up, adapted
 * to B2B quotations.
 *
 * - The form state is kept in localStorage under an anonymous per-browser key
 *   (no account, no IP) and restored if the buyer comes back.
 * - Once the buyer has typed something worth following up (a name or an email),
 *   the state is also autosaved to the server (debounced) so the team sees the
 *   draft in /admin/rfqs and can send one gentle reminder.
 * - On successful submit the local draft is cleared and the draft_key travels
 *   with the RFQ so the server retires the draft automatically.
 */
const KEY = "nli_rfq_draft";
const DRAFT_KEY = "nli_rfq_draft_key";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // restore drafts up to 7 days old

export interface RfqDraftState {
  full_name: string;
  business_email: string;
  company_name: string;
  country: string;
  phone: string;
  target_price: string;
  delivery_timeframe: string;
  additional_requirements: string;
}

const EMPTY: RfqDraftState = {
  full_name: "",
  business_email: "",
  company_name: "",
  country: "",
  phone: "",
  target_price: "",
  delivery_timeframe: "",
  additional_requirements: "",
};

function readDraftKey(): string {
  try {
    let key = localStorage.getItem(DRAFT_KEY);
    if (!key) {
      key = `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
      localStorage.setItem(DRAFT_KEY, key);
    }
    return key;
  } catch {
    return `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
  }
}

/** True once the buyer typed something a human could follow up on. */
function worthSaving(s: RfqDraftState): boolean {
  return s.business_email.includes("@") || s.full_name.trim().length >= 2;
}

export function useRfqDraft() {
  const [draftKey, setDraftKey] = useState("");
  const [restored, setRestored] = useState<RfqDraftState | null>(null);
  const [dismissedRestore, setDismissedRestore] = useState(false);
  const serverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<{ form: RfqDraftState; items: unknown[] }>({ form: EMPTY, items: [] });
  const sentRef = useRef(false);

  // Resolve the anonymous key + restore a recent local draft (after mount, so
  // server and client render the same tree on the first pass).
  useEffect(() => {
    const key = readDraftKey();
    setDraftKey(key);
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const savedAt = typeof parsed?.savedAt === "number" ? parsed.savedAt : 0;
        const form = { ...EMPTY, ...(parsed.form || {}) };
        const hasContent = worthSaving(form) || Boolean(parsed?.items?.length);
        if (hasContent && Date.now() - savedAt < MAX_AGE_MS) {
          latest.current = { form, items: parsed.items || [] };
          setRestored(form);
        }
      }
    } catch { /* ignore */ }
  }, []);

  /** Persist locally (immediately) and to the server (debounced, meaningful data only). */
  const save = useCallback((form: RfqDraftState, items: unknown[]) => {
    latest.current = { form, items };
    try {
      localStorage.setItem(KEY, JSON.stringify({ savedAt: Date.now(), form, items }));
    } catch { /* storage unavailable */ }
    if (!worthSaving(form)) return; // don't upload half-empty forms
    if (serverTimer.current) clearTimeout(serverTimer.current);
    serverTimer.current = setTimeout(() => {
      const { form: f, items: it } = latest.current;
      if (!worthSaving(f)) return;
      api("/api/public/rfq-drafts", {
        method: "POST",
        body: JSON.stringify({ draft_key: readDraftKey(), ...f, items: it }),
      }).catch(() => undefined); // autosave is best-effort — never blocks the form
    }, 4000);
  }, []);

  /** Called after a successful RFQ submit — retire the draft everywhere. */
  const markSent = useCallback(() => {
    if (sentRef.current) return;
    sentRef.current = true;
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    if (serverTimer.current) clearTimeout(serverTimer.current);
  }, []);

  const discardRestored = useCallback(() => {
    setDismissedRestore(true);
    setRestored(null);
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  }, []);

  return {
    draftKey,
    /** Saved form state when a recent unfinished enquiry was found, else null. */
    restored: restored && !dismissedRestore ? restored : null,
    save,
    markSent,
    discardRestored,
  };
}
