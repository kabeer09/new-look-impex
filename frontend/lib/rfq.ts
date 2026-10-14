"use client";
import { useCallback, useEffect, useState } from "react";
import { trackEvent } from "./api";

export interface RfqCartItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit?: string;
  notes?: string;
}

const KEY = "nli_rfq";

export function loadRfqCart(): RfqCartItem[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (it): it is RfqCartItem =>
        it && typeof it.product_id === "number" && typeof it.product_name === "string" && typeof it.quantity === "number"
    );
  } catch {
    return [];
  }
}

function saveRfqCart(items: RfqCartItem[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable */
  }
}

export function addToRfqCart(item: Omit<RfqCartItem, "quantity"> & { quantity?: number }): RfqCartItem[] {
  const items = loadRfqCart();
  const qty = typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1;
  const existing = items.find((i) => i.product_id === item.product_id);
  let next: RfqCartItem[];
  if (existing) {
    next = items.map((i) => (i.product_id === item.product_id ? { ...i, quantity: i.quantity + qty, notes: i.notes ?? item.notes } : i));
  } else {
    next = [...items, { product_id: item.product_id, product_name: item.product_name, quantity: qty, unit: item.unit, notes: item.notes }];
  }
  saveRfqCart(next);
  // Non-blocking analytics beacon (consent-gated by caller policy; never throws).
  trackEvent({ event_type: "rfq_add", product_id: item.product_id });
  return next;
}

export function removeFromRfqCart(productId: number): RfqCartItem[] {
  const next = loadRfqCart().filter((i) => i.product_id !== productId);
  saveRfqCart(next);
  return next;
}

export function setRfqQuantity(productId: number, quantity: number): RfqCartItem[] {
  const next = loadRfqCart().map((i) => (i.product_id === productId ? { ...i, quantity: Math.max(1, quantity) } : i));
  saveRfqCart(next);
  return next;
}

export function setRfqNote(productId: number, notes: string): RfqCartItem[] {
  const next = loadRfqCart().map((i) => (i.product_id === productId ? { ...i, notes } : i));
  saveRfqCart(next);
  return next;
}

export function clearRfqCart(): void {
  saveRfqCart([]);
}

export function rfqCartCount(): number {
  return loadRfqCart().length;
}

export interface RfqCart {
  items: RfqCartItem[];
  count: number;
  add: (item: Omit<RfqCartItem, "quantity"> & { quantity?: number }) => void;
  remove: (productId: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  setNote: (productId: number, notes: string) => void;
  clear: () => void;
}

/** React hook over the localStorage RFQ cart. */
export function useRfqCart(): RfqCart {
  const [items, setItems] = useState<RfqCartItem[]>([]);
  useEffect(() => {
    setItems(loadRfqCart());
    const onStorage = () => setItems(loadRfqCart());
    window.addEventListener("storage", onStorage);
    // Keep multiple tabs / repeated mounts in sync with a custom event.
    const onLocal = () => setItems(loadRfqCart());
    window.addEventListener("nli_rfq_changed", onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("nli_rfq_changed", onLocal);
    };
  }, []);

  const update = useCallback((next: RfqCartItem[]) => {
    setItems(next);
    try {
      window.dispatchEvent(new Event("nli_rfq_changed"));
    } catch {
      /* older browsers */
    }
  }, []);

  const add = useCallback(
    (item: Omit<RfqCartItem, "quantity"> & { quantity?: number }) => update(addToRfqCart(item)),
    [update]
  );
  const remove = useCallback((productId: number) => update(removeFromRfqCart(productId)), [update]);
  const setQuantity = useCallback((productId: number, quantity: number) => update(setRfqQuantity(productId, quantity)), [update]);
  const setNote = useCallback((productId: number, notes: string) => update(setRfqNote(productId, notes)), [update]);
  const clear = useCallback(() => {
    clearRfqCart();
    update([]);
  }, [update]);

  return { items, count: items.length, add, remove, setQuantity, setNote, clear };
}
