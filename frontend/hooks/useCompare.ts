"use client";
import { useCallback, useEffect, useState } from "react";

/**
 * Product comparison list — the B2B analogue of Shopify's "Compare" action.
 * Buyers tick Compare on cards; a floating bar offers a side-by-side table.
 * Stored locally (no account needed), capped at MAX items like Shopify.
 *
 * Every instance stays in sync through a custom window event (the same
 * pattern as the RFQ cart), so ticking a card updates the floating bar.
 */
const KEY = "nli_compare";
const EVENT = "nli_compare_changed";
export const MAX_COMPARE = 4;

export interface CompareEntry {
  id: number;
  slug: string;
  name: string;
}

function load(): CompareEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is CompareEntry =>
        x && typeof x.id === "number" && typeof x.slug === "string" && typeof x.name === "string"
    ).slice(0, MAX_COMPARE);
  } catch {
    return [];
  }
}

function save(next: CompareEntry[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  try { window.dispatchEvent(new Event(EVENT)); } catch { /* older browsers */ }
}

export function useCompare() {
  const [items, setItems] = useState<CompareEntry[]>([]);

  useEffect(() => {
    setItems(load());
    const sync = () => setItems(load());
    window.addEventListener("storage", sync);
    window.addEventListener(EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(EVENT, sync);
    };
  }, []);

  /** Returns false when the list is full (caller surfaces a hint). */
  const toggle = useCallback((entry: CompareEntry): boolean => {
    const current = load();
    if (current.some((x) => x.id === entry.id)) {
      save(current.filter((x) => x.id !== entry.id));
      return true;
    }
    if (current.length >= MAX_COMPARE) return false;
    save([...current, entry]);
    return true;
  }, []);

  const has = useCallback((id: number) => items.some((x) => x.id === id), [items]);

  const remove = useCallback((id: number) => {
    save(load().filter((x) => x.id !== id));
  }, []);

  const clear = useCallback(() => save([]), []);

  return { items, toggle, has, remove, clear, count: items.length, full: items.length >= MAX_COMPARE };
}
