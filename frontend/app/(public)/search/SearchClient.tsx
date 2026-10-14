"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Paged, ProductCard } from "@/lib/types";
import { ProductGrid, PageHero } from "@/components/public/Shared";
import { Loading, ErrorBox, EmptyState } from "@/components/public/States";

export default function SearchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") || "";
  const [input, setInput] = useState(initialQ);
  const [q, setQ] = useState(initialQ);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [results, setResults] = useState<ProductCard[] | null>(null);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback((term: string) => {
    const query = term.trim();
    setQ(query);
    const qs = query ? `?q=${encodeURIComponent(query)}` : "";
    router.push(`/search${qs}`);
    if (!query) {
      setResults(null);
      setTotal(0);
      setErr("");
      return;
    }
    setLoading(true);
    setErr("");
    api<Paged<ProductCard>>(`/api/public/products?q=${encodeURIComponent(query)}&page=1&page_size=24`)
      .then((d) => {
        setResults(d.items || []);
        setTotal(d.total || 0);
      })
      .catch((e) => {
        setErr(String(e));
        setResults(null);
      })
      .finally(() => setLoading(false));
  }, [router]);

  // Run the URL's initial query on mount.
  useEffect(() => {
    if (initialQ) runSearch(initialQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced suggestions (best effort — hidden if the endpoint is unavailable).
  useEffect(() => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    const term = input.trim();
    if (term.length < 2) {
      setSuggestions([]);
      return;
    }
    suggestTimer.current = setTimeout(() => {
      api<{ suggestions: string[] }>(`/api/public/products/search/suggest?q=${encodeURIComponent(term)}`)
        .then((d) => setSuggestions(d.suggestions || []))
        .catch(() => setSuggestions([]));
    }, 250);
    return () => {
      if (suggestTimer.current) clearTimeout(suggestTimer.current);
    };
  }, [input]);

  return (
    <>
      <PageHero title="Search the Catalogue" subtitle="Search by product name, SKU, category, material or keyword." />
      <div className="container-x section">
        <form
          role="search"
          className="max-w-2xl"
          onSubmit={(e) => {
            e.preventDefault();
            setShowSuggest(false);
            runSearch(input);
          }}
        >
          <div className="relative">
            <label htmlFor="catalogue-search" className="sr-only">Search products</label>
            <input
              id="catalogue-search"
              className="input !py-3 !text-base"
              placeholder='Try "brass urli", "NLI-1024" or "copper"…'
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setShowSuggest(true);
              }}
              onFocus={() => setShowSuggest(true)}
              onBlur={() => window.setTimeout(() => setShowSuggest(false), 150)}
              autoComplete="off"
            />
            {showSuggest && suggestions.length > 0 && (
              <ul className="absolute z-10 inset-x-0 top-full mt-1 bg-white border border-sand shadow-lg" role="listbox" aria-label="Suggestions">
                {suggestions.slice(0, 8).map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      className="w-full text-left px-4 py-2 text-sm hover:bg-sand"
                      onMouseDown={() => {
                        setInput(s);
                        setShowSuggest(false);
                        runSearch(s);
                      }}
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <button type="submit" className="btn btn-primary">Search</button>
            <Link href="/products" className="btn btn-outline">Advanced filters</Link>
          </div>
        </form>

        <div className="mt-10">
          {loading && <Loading label={`Searching for “${q}”…`} />}
          {err && <ErrorBox error={err} retry={() => runSearch(q)} />}
          {!loading && !err && results !== null && (
            <>
              <p className="text-sm text-gray mb-4">
                {total} result{total === 1 ? "" : "s"} for “{q}”
              </p>
              {results.length === 0 ? (
                <EmptyState
                  title="No matches found"
                  hint="Check the spelling, try a shorter keyword (e.g. “urli” instead of “large brass urli”), or browse the full catalogue."
                  action={<Link className="btn btn-outline btn-sm" href="/products">Browse all products</Link>}
                />
              ) : (
                <ProductGrid products={results} />
              )}
            </>
          )}
          {!loading && !err && results === null && (
            <p className="text-sm text-gray">Type a keyword above to search published products.</p>
          )}
        </div>
      </div>
    </>
  );
}
