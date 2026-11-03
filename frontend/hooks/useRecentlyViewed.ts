"use client";
import { useCallback, useEffect, useState } from "react";

const KEY = "nli_recently_viewed";
const MAX = 8;

export function useRecentlyViewed() {
  const [ids, setIds] = useState<number[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setIds(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const add = useCallback((id: number) => {
    setIds((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, MAX);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setIds([]);
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  }, []);

  return { ids, add, clear };
}