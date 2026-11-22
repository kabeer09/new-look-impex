"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useCompare } from "@/hooks/useCompare";

/**
 * Floating "compare tray" — appears once a buyer ticks Compare on any product.
 * Shows the shortlisted slugs and a single call-to-action to open the
 * side-by-side table at /compare. Client-only (reads localStorage).
 *
 * Publishes its own height as --nli-compare-h so the chat bubble stacks
 * above it instead of covering its buttons.
 */
export function CompareBar() {
  const { items, remove, clear, count } = useCompare();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (count === 0 || !el) return;
    const apply = () =>
      document.documentElement.style.setProperty("--nli-compare-h", `${el.offsetHeight}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.setProperty("--nli-compare-h", "0px");
    };
  }, [count]);

  if (count === 0) return null;

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Product comparison"
      className="fixed inset-x-0 bottom-[var(--nli-bottom-h,0px)] z-40 border-t border-gold/40 bg-espresso text-cream shadow-[0_-6px_24px_rgba(33,27,23,0.25)]"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">
          Compare · {count}/4
        </p>
        <ul className="flex flex-1 flex-wrap gap-2">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex items-center gap-1.5 border border-cream/25 px-2 py-1 text-[11px]"
            >
              <span className="max-w-[10rem] truncate">{it.name}</span>
              <button
                type="button"
                onClick={() => remove(it.id)}
                aria-label={`Remove ${it.name} from comparison`}
                className="text-cream/60 hover:text-gold"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={clear}
            className="text-[10px] font-bold uppercase tracking-[0.14em] text-cream/60 hover:text-cream"
          >
            Clear
          </button>
          <Link
            href="/compare"
            className="btn btn-brass btn-sm"
          >
            Compare {count > 1 ? `${count} products` : "product"}
          </Link>
        </div>
      </div>
    </div>
  );
}
