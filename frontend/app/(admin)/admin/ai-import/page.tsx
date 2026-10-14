"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, apiUpload, mediaUrl } from "@/lib/api";
import type {
  AIPreviewResponse,
  AISuggestion,
  Category,
  MediaFile,
  ProductImport,
} from "@/lib/types";
import { RIGHTS_SOURCES } from "@/lib/types";
import { Loading, ErrorBox, EmptyState, StatusBadge } from "@/components/public/States";

type Tab = "image" | "csv" | "library" | "url" | "concept";

const TABS: { id: Tab; label: string }[] = [
  { id: "image", label: "Image upload" },
  { id: "csv", label: "CSV upload" },
  { id: "library", label: "Authorised file catalogue" },
  { id: "url", label: "URL import" },
  { id: "concept", label: "Concept image" },
];

const EDITABLE_FIELDS: { key: keyof AISuggestion; label: string; multiline?: boolean }[] = [
  { key: "name", label: "Name" },
  { key: "slug", label: "Slug" },
  { key: "description", label: "Description", multiline: true },
  { key: "material", label: "Material" },
  { key: "finish", label: "Finish" },
  { key: "color", label: "Colour" },
  { key: "dimensions", label: "Dimensions" },
  { key: "alt_text", label: "Alt text" },
  { key: "seo_title", label: "SEO title" },
  { key: "seo_description", label: "SEO description", multiline: true },
];

function NeedsBadge({ field, needs }: { field: string; needs: string[] }) {
  if (!needs.includes(field)) return null;
  return <span className="badge badge-brass ml-2">Needs verification</span>;
}

function SuggestionCard({
  item,
  index,
  importId,
  onChange,
  onRegenerated,
}: {
  item: AISuggestion;
  index: number;
  importId: string;
  onChange: (index: number, patch: Partial<AISuggestion>) => void;
  onRegenerated: (index: number, next: AISuggestion) => void;
}) {
  const [regenField, setRegenField] = useState<string | null>(null);
  const [regenErr, setRegenErr] = useState("");

  const regen = async (field: string) => {
    setRegenField(field);
    setRegenErr("");
    try {
      const res = await api<{ item: AISuggestion }>("/api/products/ai-regenerate", {
        method: "POST",
        body: JSON.stringify({ import_id: importId, index, fields: [field] }),
      });
      onRegenerated(index, res.item);
    } catch (e) {
      setRegenErr(String(e));
    } finally {
      setRegenField(null);
    }
  };

  const str = (v: unknown): string => (typeof v === "string" ? v : "");
  const list = (v: unknown): string => (Array.isArray(v) ? v.join(", ") : "");

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-semibold">Suggestion {index + 1}</h3>
        {(item.needs_verification || []).length > 0 && (
          <p className="text-xs text-gray">{item.needs_verification.length} field(s) need verification</p>
        )}
      </div>
      {regenErr && <p className="text-xs text-red-700">{regenErr}</p>}
      {EDITABLE_FIELDS.map(({ key, label, multiline }) => {
        const needs = item.needs_verification || [];
        const value = str(item[key]);
        const isNull = item[key] == null;
        return (
          <div key={key}>
            <span className="label">
              {label}
              {isNull && <span className="text-gray"> (not suggested)</span>}
              <NeedsBadge field={key} needs={needs} />
            </span>
            <div className="flex gap-2 items-start">
              {multiline ? (
                <textarea
                  rows={2}
                  className="input"
                  value={value}
                  onChange={(e) => onChange(index, { [key]: e.target.value } as Partial<AISuggestion>)}
                  aria-label={label}
                />
              ) : (
                <input
                  className="input"
                  value={value}
                  onChange={(e) => onChange(index, { [key]: e.target.value } as Partial<AISuggestion>)}
                  aria-label={label}
                />
              )}
              <button
                type="button"
                className="btn btn-ghost btn-sm shrink-0"
                disabled={regenField === key}
                onClick={() => void regen(key)}
                title={`Regenerate ${label} with AI`}
              >
                {regenField === key ? "…" : "AI ↻"}
              </button>
            </div>
          </div>
        );
      })}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <span className="label">
            Tags<NeedsBadge field="tags" needs={item.needs_verification || []} />
          </span>
          <input
            className="input"
            value={list(item.tags)}
            onChange={(e) =>
              onChange(index, { tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })
            }
            aria-label="Tags"
          />
        </div>
        <div>
          <span className="label">
            Keywords<NeedsBadge field="keywords" needs={item.needs_verification || []} />
          </span>
          <input
            className="input"
            value={list(item.keywords)}
            onChange={(e) =>
              onChange(index, { keywords: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })
            }
            aria-label="Keywords"
          />
        </div>
      </div>
      {(item.media_filenames || []).length > 0 && (
        <p className="text-xs text-gray">Media: {(item.media_filenames || []).join(", ")}</p>
      )}
    </div>
  );
}

export default function AiImportPage() {
  const [tab, setTab] = useState<Tab>("image");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [rightsSource, setRightsSource] = useState("");
  const [permission, setPermission] = useState("");
  const [url, setUrl] = useState("");
  const [confirmRights, setConfirmRights] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState("");
  const [preview, setPreview] = useState<AIPreviewResponse | null>(null);
  const [items, setItems] = useState<AISuggestion[]>([]);
  const [edits, setEdits] = useState<Record<number, Partial<AISuggestion>>>({});
  const [saveMsg, setSaveMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<ProductImport[]>([]);
  const [historyErr, setHistoryErr] = useState("");
  const [library, setLibrary] = useState<MediaFile[]>([]);
  const [libraryErr, setLibraryErr] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [conceptUrl, setConceptUrl] = useState("");
  const [conceptMsg, setConceptMsg] = useState("");

  useEffect(() => {
    api<Category[] | { items: Category[] }>("/api/categories")
      .then((d) => setCategories(Array.isArray(d) ? d : d.items || []))
      .catch(() => undefined);
    loadHistory();
    api<{ items: MediaFile[] }>("/api/media?page_size=100")
      .then((d) => setLibrary(d.items || []))
      .catch((e) => setLibraryErr(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadHistory = () => {
    api<{ items: ProductImport[] }>("/api/products/imports")
      .then((d) => setHistory(d.items || []))
      .catch((e) => setHistoryErr(String(e)));
  };

  const merged = (i: number): AISuggestion => ({ ...items[i], ...(edits[i] || {}) });

  const onChange = (index: number, patch: Partial<AISuggestion>) => {
    setEdits((e) => ({ ...e, [index]: { ...(e[index] || {}), ...patch } }));
  };

  const onRegenerated = (index: number, next: AISuggestion) => {
    setItems((arr) => arr.map((it, i) => (i === index ? { ...next, ...(edits[index] || {}) } : it)));
  };

  const requireRights = (): boolean => {
    if (!rightsSource) {
      setErr("Choose an image rights source — uploads and URL imports require one.");
      return false;
    }
    return true;
  };

  const baseFields = (fd: FormData) => {
    fd.append("rights_source", rightsSource);
    if (permission.trim()) fd.append("permission", permission.trim());
    if (categoryId) fd.append("category_id", categoryId);
  };

  const runPreviewFiles = async (mode: "image" | "csv", files: FileList | null) => {
    if (!files || files.length === 0) {
      setErr("Choose at least one file.");
      return;
    }
    if (!requireRights()) return;
    setWorking(true);
    setErr("");
    setSaveMsg("");
    try {
      const fd = new FormData();
      fd.append("mode", mode);
      Array.from(files).forEach((f) => fd.append("file", f));
      baseFields(fd);
      const res = await apiUpload<AIPreviewResponse>("/api/products/ai-preview", fd);
      setPreview(res);
      setItems(res.items || []);
      setEdits({});
      loadHistory();
    } catch (e) {
      setErr(String(e));
    } finally {
      setWorking(false);
    }
  };

  const runPreviewUrl = async (sourceUrl: string) => {
    if (!sourceUrl.trim()) {
      setErr("Enter a source URL.");
      return;
    }
    if (!requireRights()) return;
    if (!confirmRights) {
      setErr("Tick the rights confirmation — URL imports require you to confirm reuse permission.");
      return;
    }
    setWorking(true);
    setErr("");
    setSaveMsg("");
    try {
      const fd = new FormData();
      fd.append("mode", "url");
      fd.append("url", sourceUrl.trim());
      fd.append("confirm_rights", "true");
      baseFields(fd);
      const res = await apiUpload<AIPreviewResponse>("/api/products/ai-preview", fd);
      setPreview(res);
      setItems(res.items || []);
      setEdits({});
      loadHistory();
    } catch (e) {
      setErr(String(e));
    } finally {
      setWorking(false);
    }
  };

  const runConcept = async () => {
    if (!prompt.trim()) {
      setErr("Describe the concept image to generate.");
      return;
    }
    setWorking(true);
    setErr("");
    setConceptMsg("");
    setConceptUrl("");
    try {
      const res = await api<{ file: { filename: string; url: string } }>("/api/products/ai-generate-image", {
        method: "POST",
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      setConceptUrl(res.file.url);
      setConceptMsg(`Concept saved as ${res.file.filename}. Concept imagery is never a product photograph.`);
    } catch (e) {
      const msg = String(e);
      setConceptMsg(
        msg.includes("400")
          ? `Image provider not configured — concept generation is unavailable. (${msg})`
          : msg
      );
    } finally {
      setWorking(false);
    }
  };

  const save = async (status: "draft" | "published") => {
    if (!preview) return;
    setSaving(true);
    setSaveMsg("");
    setErr("");
    try {
      const res = await api<{ product_ids: number[]; status: string; errors: unknown[] }>(
        "/api/products/ai-save",
        {
          method: "POST",
          body: JSON.stringify({
            import_id: preview.import_id,
            index: null,
            overrides: edits,
            status,
            attach_media: items.flatMap((it) => it.media_filenames || []),
          }),
        }
      );
      const errCount = (res.errors || []).length;
      setSaveMsg(
        `Saved ${res.product_ids.length} product(s) as ${status}${errCount ? ` with ${errCount} error(s)` : ""}. ` +
          `Product IDs: ${res.product_ids.join(", ") || "—"}.`
      );
      loadHistory();
    } catch (e) {
      setErr(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Product Import</h1>
        <p className="text-sm text-gray mt-1">
          Upload images or a CSV, import from an authorised URL, or generate concept imagery — then review
          every AI-suggested field before saving. Nothing is published without your approval.
        </p>
      </div>

      {err && <ErrorBox error={err} />}
      {saveMsg && <p className="text-sm text-green-700" role="status">{saveMsg}</p>}

      {/* Shared controls */}
      <div className="card grid sm:grid-cols-3 gap-3">
        <div>
          <label className="label" htmlFor="ai-cat">Destination category</label>
          <select id="ai-cat" className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">— none / AI-suggested —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ai-rights">Rights source *</label>
          <select id="ai-rights" className="input" value={rightsSource} onChange={(e) => setRightsSource(e.target.value)}>
            <option value="">— select —</option>
            {RIGHTS_SOURCES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ai-perm">Permission note</label>
          <input
            id="ai-perm"
            className="input"
            value={permission}
            onChange={(e) => setPermission(e.target.value)}
            placeholder="e.g. supplier name / licence ref"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Import source">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`btn btn-sm ${tab === t.id ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "image" && (
        <div className="card space-y-3">
          <h2 className="font-semibold">Upload product images</h2>
          <p className="text-xs text-gray">JPEG/PNG/WebP. AI suggests catalogue fields from the imagery — verify every field before saving.</p>
          <label className="btn btn-outline btn-sm cursor-pointer w-fit">
            {working ? "Analysing…" : "Choose images & preview"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              disabled={working}
              onChange={(e) => {
                void runPreviewFiles("image", e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      )}

      {tab === "csv" && (
        <div className="card space-y-3">
          <h2 className="font-semibold">Upload a CSV catalogue</h2>
          <p className="text-xs text-gray">Previews are capped at 25 rows per run (the API reports <i>capped=true</i> when truncated).</p>
          <label className="btn btn-outline btn-sm cursor-pointer w-fit">
            {working ? "Analysing…" : "Choose CSV & preview"}
            <input
              type="file"
              accept="text/csv,.csv"
              className="hidden"
              disabled={working}
              onChange={(e) => {
                void runPreviewFiles("csv", e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      )}

      {tab === "library" && (
        <div className="card space-y-3">
          <h2 className="font-semibold">Authorised file catalogue</h2>
          <p className="text-xs text-gray">
            Import from files already in the media library. Only use files you own or are authorised to reuse —
            each import records its rights source and still requires the confirmation below.
          </p>
          {libraryErr && <p className="text-xs text-red-700">{libraryErr}</p>}
          {library.length === 0 && !libraryErr && <p className="text-xs text-gray">No library files yet.</p>}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            {library.filter((m) => m.content_type?.startsWith("image/")).map((m) => (
              <label key={m.id} className="border border-sand p-1.5 text-xs flex flex-col gap-1 cursor-pointer">
                <span className="relative block aspect-square bg-sand overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediaUrl(m.url)} alt={m.alt_text || m.filename} className="object-cover w-full h-full" loading="lazy" />
                </span>
                <span className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    className="accent-[#172A3A]"
                    checked={selectedFiles.includes(m.url)}
                    onChange={(e) =>
                      setSelectedFiles((s) =>
                        e.target.checked ? [...s, m.url] : s.filter((u) => u !== m.url)
                      )
                    }
                  />
                  <span className="truncate" title={m.filename}>{m.filename}</span>
                </span>
              </label>
            ))}
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="accent-[#172A3A] mt-1" checked={confirmRights} onChange={(e) => setConfirmRights(e.target.checked)} />
            I confirm these files are ours or we hold permission to reuse them.
          </label>
          <button
            className="btn btn-outline btn-sm w-fit"
            disabled={working || selectedFiles.length === 0}
            onClick={() => {
              const first = selectedFiles[0];
              if (first) void runPreviewUrl(first.startsWith("http") ? first : `${window.location.origin}${first}`);
            }}
          >
            {working ? "Analysing…" : `Preview ${selectedFiles.length} selected file(s)`}
          </button>
        </div>
      )}

      {tab === "url" && (
        <div className="card space-y-3">
          <h2 className="font-semibold">Import from URL</h2>
          <p className="text-xs text-gray">
            The URL must serve an <i>image/*</i> or CSV response (max 8 MB, 20 s timeout). Only import URLs you
            own or are explicitly authorised to reuse — we never scrape sites, bypass logins, or circumvent
            access controls.
          </p>
          <div>
            <label className="label" htmlFor="ai-url">Source URL</label>
            <input id="ai-url" className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" inputMode="url" />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="accent-[#172A3A] mt-1" checked={confirmRights} onChange={(e) => setConfirmRights(e.target.checked)} />
            I confirm we hold the rights or explicit permission to reuse this file. *
          </label>
          <button className="btn btn-outline btn-sm w-fit" disabled={working} onClick={() => void runPreviewUrl(url)}>
            {working ? "Analysing…" : "Preview URL"}
          </button>
        </div>
      )}

      {tab === "concept" && (
        <div className="card space-y-3">
          <h2 className="font-semibold">Concept image generation</h2>
          <p className="text-xs text-gray">
            Generates a <b>CONCEPT</b> visual for design exploration — concept imagery is labelled as such and
            must never be presented as a product photograph.
          </p>
          <div>
            <label className="label" htmlFor="ai-prompt">Prompt</label>
            <textarea id="ai-prompt" rows={3} className="input" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. Antique brass urli bowl with engraved floral pattern, studio product shot style" />
          </div>
          <button className="btn btn-outline btn-sm w-fit" disabled={working} onClick={() => void runConcept()}>
            {working ? "Generating…" : "Generate concept"}
          </button>
          {conceptMsg && <p className="text-xs" role="status">{conceptMsg}</p>}
          {conceptUrl && (
            <div className="relative max-w-sm aspect-square bg-sand overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(conceptUrl)} alt={prompt} className="object-cover w-full h-full" />
              <span className="absolute top-2 left-2 badge !bg-navy/90 !text-ivory">CONCEPT — not a product photograph</span>
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-xl font-bold">Review suggestions</h2>
              <p className="text-xs text-gray mt-1">
                Source: {preview.source}
                {preview.capped ? " · capped at 25 rows — upload the remainder separately" : ""}
                {(preview.warnings || []).length > 0 ? ` · warnings: ${preview.warnings.join("; ")}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-ghost btn-sm" disabled={saving} onClick={() => void save("draft")}>
                {saving ? "Saving…" : "Save as draft"}
              </button>
              <button className="btn btn-primary btn-sm" disabled={saving} onClick={() => void save("published")}>
                {saving ? "Saving…" : "Publish"}
              </button>
            </div>
          </div>
          {items.length === 0 && <EmptyState title="No suggestions returned" hint="Try a different file or URL." />}
          <div className="grid lg:grid-cols-2 gap-4 items-start">
            {items.map((_, i) => (
              <SuggestionCard
                key={`${preview.import_id}-${i}`}
                item={merged(i)}
                index={i}
                importId={preview.import_id}
                onChange={onChange}
                onRegenerated={onRegenerated}
              />
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Import history</h2>
          <button className="btn btn-ghost btn-sm" onClick={loadHistory}>Refresh</button>
        </div>
        {historyErr && <p className="text-xs text-red-700 mt-2">{historyErr}</p>}
        {!historyErr && history.length === 0 && (
          <p className="text-xs text-gray mt-2">No imports recorded yet.</p>
        )}
        {history.length > 0 && (
          <div className="overflow-x-auto mt-3">
            <table className="data">
              <thead>
                <tr><th>ID</th><th>Kind</th><th>File / URL</th><th>Rights</th><th>Status</th><th>Error</th><th>Created</th></tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={String(h.id)}>
                    <td>{String(h.id)}</td>
                    <td>{h.kind}</td>
                    <td className="max-w-48 truncate" title={h.filename || h.source_url || ""}>{h.filename || h.source_url || "—"}</td>
                    <td>{h.rights_source || "—"}</td>
                    <td><StatusBadge status={h.status} /></td>
                    <td className="max-w-64 truncate" title={h.error || ""}>{h.error || "—"}</td>
                    <td className="whitespace-nowrap">{h.created_at ? new Date(h.created_at).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-gray mt-3">
          Failed imports are not retried automatically — fix the cause (file type, size, rights fields) and
          re-upload to retry.
        </p>
        <Link href="/admin/products" className="btn btn-ghost btn-sm mt-3">← Back to products</Link>
      </div>
    </div>
  );
}
