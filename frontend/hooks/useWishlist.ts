"use client";
import { useCallback, useEffect, useState } from "react";

const KEY = "nli_wishlist";

export function useWishlist() {
  const [ids, setIds] = useState<number[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setIds(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const persist = (next: number[]) => {
    setIds(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const toggle = useCallback((id: number) => {
    setIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const has = useCallback((id: number) => ids.includes(id), [ids]);

  const clear = useCallback(() => persist([]), []);

  return { ids, toggle, has, clear, count: ids.length };
}