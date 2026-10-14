"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import type { SeoGenerateResponse } from "@/lib/types";

export type AiFillField =
  | "name"
  | "description"
  | "seo_title"
  | "seo_description"
  | "slug"
  | "keywords";

const FIELD_NOUNS: Record<AiFillField, string> = {
  name: "title",
  description: "description",
  seo_title: "SEO title",
  seo_description: "SEO description",
  slug: "slug",
  keywords: "keywords",
};

/**
 * Inline per-field AI button. Renders below a single input and fills just that
 * field from POST /api/seo/ai-generate. Always sends the live form facts
 * (works for unsaved drafts and dirty forms); the value lands in the field
 * for review and is only saved when the form is saved.
 */
export function AiFieldButton({
  field,
  entityType,
  facts,
  onValue,
  onKeywords,
}: {
  field: AiFillField;
  entityType: "product" | "collection" | "category";
  facts: Record<string, string | null | undefined>;
  onValue?: (value: string) => void;
  onKeywords?: (keywords: string[]) => void;
}) {
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  const run = async () => {
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(facts)) {
      if (typeof v === "string" && v.trim()) clean[k] = v.trim().slice(0, 2000);
    }
    if (Object.keys(clean).length === 0) {
      setState("error");
      setMsg("Enter some product details first (description, material…).");
      return;
    }
    setState("working");
    setMsg("");
    try {
      const wanted = field === "keywords" ? ["primary_keyword", "related_keywords"] : [field];
      const res = await api<SeoGenerateResponse>("/api/seo/ai-generate", {
        method: "POST",
        body: JSON.stringify({ entity_type: entityType, entity_id: 0, fields: wanted, facts: clean }),
      });
      const s = res.suggestions || {};
      if (field === "keywords") {
        const kw: string[] = [];
        if (typeof s.primary_keyword === "string" && s.primary_keyword.trim()) kw.push(s.primary_keyword.trim());
        if (Array.isArray(s.related_keywords)) {
          for (const k of s.related_keywords) {
            if (typeof k === "string" && k.trim()) kw.push(k.trim());
          }
        }
        if (kw.length === 0) throw new Error("empty");
        onKeywords?.(kw);
      } else {
        const v = (s as Record<string, unknown>)[field];
        if (typeof v !== "string" || !v.trim()) throw new Error("empty");
        onValue?.(v.trim());
      }
      setState("done");
      setMsg(`✓ AI ${FIELD_NOUNS[field]} filled — review & save.`);
    } catch (e) {
      setState("error");
      const raw = String(e);
      setMsg(
        raw === "Error: empty"
          ? "No suggestion returned — add more details or configure an LLM provider."
          : raw
      );
    }
  };

  return (
    <span className="inline-flex items-center gap-2 mt-1">
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => void run()}
        disabled={state === "working"}
        title={`Generate ${FIELD_NOUNS[field]} with AI`}
      >
        {state === "working" ? "Generating…" : `✨ AI ${FIELD_NOUNS[field]}`}
      </button>
      {state === "done" && (
        <span className="text-xs text-green-700" role="status">{msg}</span>
      )}
      {state === "error" && (
        <span className="text-xs text-red-700" role="alert">{msg}</span>
      )}
    </span>
  );
}
