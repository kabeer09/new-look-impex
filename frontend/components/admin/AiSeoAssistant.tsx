"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import type { SeoGenerateResponse, SeoSuggestionSet } from "@/lib/types";

const FIELD_LABELS: Record<string, string> = {
  seo_title: "SEO title",
  seo_description: "SEO description",
  slug: "Slug",
  primary_keyword: "Primary keyword",
  related_keywords: "Related keywords",
  description: "Description",
  alt_text: "Alt text",
  internal_links: "Internal links",
};

function displayValue(v: unknown): string {
  if (v == null) return "—";
  if (Array.isArray(v)) return v.length > 0 ? v.join(", ") : "—";
  return String(v);
}

/**
 * AI SEO assistant: generates suggestions via POST /api/seo/ai-generate and shows them
 * side-by-side with current values. Suggestions are NEVER auto-saved — each field has an
 * explicit Apply button that writes through the parent form's existing save path.
 */
export function AiSeoAssistant({
  entityType,
  entityId,
  current,
  onApply,
  onApplyKeywords,
}: {
  entityType: "product" | "collection" | "category";
  entityId: number | string | null;
  current: Record<string, string | null | undefined>;
  onApply: (patch: Record<string, string>) => void;
  /** Optional: receives primary + related keywords so parents can merge them into tags. */
  onApplyKeywords?: (keywords: string[]) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<SeoGenerateResponse | null>(null);
  const [applied, setApplied] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const generate = async () => {
    if (entityId == null || entityId === "") {
      setErr("Save this item first — AI suggestions need an existing record.");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const res = await api<SeoGenerateResponse>("/api/seo/ai-generate", {
        method: "POST",
        body: JSON.stringify({ entity_type: entityType, entity_id: entityId }),
      });
      setResult(res);
      setApplied({});
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  };

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setErr("Copy failed — clipboard unavailable.");
    }
  };

  const entries = result
    ? (Object.entries(result.suggestions || {}) as [keyof SeoSuggestionSet, unknown][]).filter(
        ([, v]) => v != null && !(Array.isArray(v) && v.length === 0) && v !== ""
      )
    : [];

  /** One-click auto-fill: applies every applicable text suggestion to the parent
   *  form (still editable + only saved when the form is saved) and merges
   *  suggested keywords via onApplyKeywords. */
  const autoFillAll = () => {
    if (!result) return;
    const patch: Record<string, string> = {};
    for (const [key, value] of entries) {
      if (typeof value === "string" && value && key in current) {
        patch[key as string] = value;
      }
    }
    if (Object.keys(patch).length > 0) {
      onApply(patch);
      setApplied((a) => {
        const next = { ...a };
        for (const k of Object.keys(patch)) next[k] = true;
        return next;
      });
    }
    if (onApplyKeywords) {
      const kw: string[] = [];
      const s = result.suggestions || {};
      if (typeof s.primary_keyword === "string" && s.primary_keyword.trim()) {
        kw.push(s.primary_keyword.trim());
      }
      if (Array.isArray(s.related_keywords)) {
        for (const k of s.related_keywords) {
          if (typeof k === "string" && k.trim()) kw.push(k.trim());
        }
      }
      if (kw.length > 0) {
        onApplyKeywords(kw);
        setApplied((a) => ({ ...a, __keywords: true }));
      }
    }
  };

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-semibold">AI SEO assistant</h2>
        <div className="flex gap-2">
          <button className="btn btn-outline btn-sm" onClick={() => void generate()} disabled={loading}>
            {loading ? "Generating…" : "Generate with AI"}
          </button>
          {result && entries.length > 0 && (
            <button className="btn btn-primary btn-sm" onClick={autoFillAll} title="Fill title, description, slug and keywords into the form (editable, saved only when you save)">
              Auto-fill all
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-gray">
        Suggestions are proposals only — nothing changes until you apply them and save the form.
        Auto-fill writes title, description, slug and keywords into the fields above for review.
      </p>
      {err && <p className="text-xs text-red-700" role="alert">{err}</p>}
      {result && (
        <>
          <p className="text-xs text-gray">Source: {result.source}</p>
          {(result.warnings.missing.length > 0 || result.warnings.duplicates.length > 0) && (
            <div className="text-xs space-y-1 border border-sand p-2 bg-ivory">
              {result.warnings.missing.length > 0 && (
                <p><b>Missing metadata:</b> {result.warnings.missing.join(", ")}</p>
              )}
              {result.warnings.duplicates.length > 0 && (
                <p><b>Possible duplicates:</b> {result.warnings.duplicates.join(", ")}</p>
              )}
            </div>
          )}
          {entries.length === 0 && <p className="text-xs text-gray">No suggestions returned.</p>}
          <div className="space-y-3">
            {entries.map(([key, value]) => {
              const text = displayValue(value);
              const currentValue = current[key];
              const applicable = key in current;
              const isKeyword = key === "primary_keyword" || key === "related_keywords";
              const showApplied = applied[key] || (isKeyword && applied.__keywords);
              return (
                <div key={key} className="border-t border-sand pt-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray">
                    {FIELD_LABELS[key] || key}
                    {showApplied && <span className="badge badge-green ml-2">Applied</span>}
                  </p>
                  {applicable && (
                    <p className="text-xs text-gray mt-1">
                      <b>Current:</b> {currentValue || "—"}
                    </p>
                  )}
                  <p className="text-sm mt-1"><b>Suggested:</b> {text}</p>
                  <div className="mt-1.5 flex gap-2">
                    {applicable ? (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          onApply({ [key]: text });
                          setApplied((a) => ({ ...a, [key]: true }));
                        }}
                      >
                        Apply
                      </button>
                    ) : (
                      <button className="btn btn-ghost btn-sm" onClick={() => void copy(key, text)}>
                        {copied === key ? "Copied ✓" : "Copy"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
