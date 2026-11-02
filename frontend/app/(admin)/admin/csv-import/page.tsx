"use client";
import { useState } from "react";
import { api, downloadFile } from "@/lib/api";
import { ErrorBox } from "@/components/public/States";

type Mode = "update_existing" | "create_new_only" | "update_only";

interface PreviewRow {
  row: number;
  action: "create" | "update" | "error";
  name: string;
  external_product_id: string;
  slug: string;
  existing_id: number | null;
  status: string;
  errors: string[];
}

interface PreviewResponse {
  preview_id: number | null;
  fieldnames: string[];
  unknown_columns: string[];
  total_rows: number;
  counts: { create: number; update: number; error: number };
  rows: PreviewRow[];
  note: string;
}

interface CommitResponse {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  mode: Mode;
  auto_publish: boolean;
}

const MODES: { value: Mode; label: string; hint: string }[] = [
  { value: "update_existing", label: "Update existing + create new", hint: "Default. Matches by external id, then slug. Updates matched products and creates the rest." },
  { value: "create_new_only", label: "Create new only", hint: "Only creates products that do not already exist. Matches are skipped." },
  { value: "update_only", label: "Update existing only", hint: "Only updates matched products. Rows that would create something new are skipped." },
];

function ActionBadge({ action }: { action: PreviewRow["action"] }) {
  if (action === "create") return <span className="badge badge-green">create</span>;
  if (action === "update") return <span className="badge badge-brass">update</span>;
  return <span className="badge badge-red">error</span>;
}

export default function CsvImportPage() {
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [commitResult, setCommitResult] = useState<CommitResponse | null>(null);
  const [mode, setMode] = useState<Mode>("update_existing");
  const [autoPublish, setAutoPublish] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const readFile = (f: File | undefined) => {
    if (!f) return;
    setFileName(f.name);
    setErr("");
    setPreview(null);
    setCommitResult(null);
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result || ""));
    reader.readAsText(f);
  };

  const runPreview = async () => {
    if (!csvText.trim()) {
      setErr("Choose a CSV file or paste CSV content first.");
      return;
    }
    setBusy(true);
    setErr("");
    setCommitResult(null);
    try {
      setPreview(await api<PreviewResponse>("/api/products/import/preview", {
        method: "POST",
        body: JSON.stringify({ csv: csvText }),
      }));
    } catch (e) {
      setErr(String(e));
      setPreview(null);
    } finally {
      setBusy(false);
    }
  };

  const runCommit = async () => {
    if (!csvText.trim()) {
      setErr("No CSV content to commit.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      setCommitResult(await api<CommitResponse>("/api/products/import/commit", {
        method: "POST",
        body: JSON.stringify({ csv: csvText, mode, auto_publish: autoPublish }),
      }));
      setPreview(null);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setCsvText("");
    setFileName("");
    setPreview(null);
    setCommitResult(null);
    setErr("");
  };

  const downloadTemplate = async () => {
    try {
      await downloadFile("/api/products/import/template", "newlookimpex-product-template.csv");
    } catch (e) {
      setErr(String(e));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">CSV Import</h1>
          <p className="text-sm text-gray mt-1">
            Upload a CSV catalogue, review the validation and duplicate detection, then commit with an explicit
            mode. Nothing is written until you commit, and nothing auto-publishes unless you enable it.
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => void downloadTemplate()}>
          Download CSV template
        </button>
      </div>

      {err && <ErrorBox error={err} />}

      {/* Source */}
      <div className="card space-y-3">
        <h2 className="font-semibold">1. Choose your CSV</h2>
        <p className="text-xs text-gray">
          Required column: <code>name</code>. Optional columns include external_product_id, slug, category,
          material, capacity, price, price_visibility, stock_status, status, SEO fields and more — see the
          template for the full list. Tags are semicolon-separated.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="btn btn-outline btn-sm cursor-pointer w-fit">
            Choose CSV file
            <input
              type="file"
              accept="text/csv,.csv"
              className="hidden"
              onChange={(e) => {
                readFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {fileName && <span className="text-xs text-gray">{fileName}</span>}
          {csvText && (
            <button className="btn btn-ghost btn-sm" onClick={reset}>Clear</button>
          )}
        </div>
        <details>
          <summary className="text-sm cursor-pointer text-gray">…or paste CSV content</summary>
          <textarea
            rows={6}
            className="input mt-2 font-mono text-xs"
            placeholder={"name,external_product_id,price,status\nHammered Copper Bottle,LS-1001,,on_request"}
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value);
              setPreview(null);
              setCommitResult(null);
            }}
            aria-label="CSV content"
          />
        </details>
        {csvText && (
          <button className="btn btn-primary btn-sm w-fit" disabled={busy} onClick={() => void runPreview()}>
            {busy ? "Working…" : "Preview import"}
          </button>
        )}
      </div>

      {/* Preview */}
      {preview && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-semibold">2. Review before committing</h2>
              <p className="text-xs text-gray mt-1">{preview.note}</p>
            </div>
            <div className="flex gap-2 text-sm">
              <span className="badge badge-green">{preview.counts.create} create</span>
              <span className="badge badge-brass">{preview.counts.update} update</span>
              <span className="badge badge-red">{preview.counts.error} error</span>
            </div>
          </div>

          {preview.unknown_columns.length > 0 && (
            <p className="text-xs text-amber-700">
              Ignored unknown columns: {preview.unknown_columns.join(", ")}
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="data">
              <thead>
                <tr>
                  <th>Row</th><th>Action</th><th>Name</th><th>External ID</th>
                  <th>Existing</th><th>Status</th><th>Errors</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.row}>
                    <td>{r.row}</td>
                    <td><ActionBadge action={r.action} /></td>
                    <td className="max-w-[200px] truncate">{r.name || "—"}</td>
                    <td className="font-mono text-xs">{r.external_product_id || "—"}</td>
                    <td>{r.existing_id ? `#${r.existing_id}` : "—"}</td>
                    <td>{r.status}</td>
                    <td className="max-w-[260px] text-xs text-red-700">
                      {r.errors.length ? r.errors.join("; ") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Commit controls */}
          <div className="border-t border-sand pt-4 space-y-3">
            <h3 className="font-semibold text-sm">3. Choose a commit mode</h3>
            <div className="space-y-2">
              {MODES.map((m) => (
                <label key={m.value} className="flex items-start gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="csv-mode"
                    className="mt-1 accent-[#172A3A]"
                    checked={mode === m.value}
                    onChange={() => setMode(m.value)}
                  />
                  <span>
                    <span className="font-medium">{m.label}</span>
                    <span className="block text-xs text-gray">{m.hint}</span>
                  </span>
                </label>
              ))}
            </div>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 accent-[#172A3A]"
                checked={autoPublish}
                onChange={(e) => setAutoPublish(e.target.checked)}
              />
              <span>
                Publish imported rows
                <span className="block text-xs text-gray">
                  Off by default. When off, imported products are always saved as draft even if the CSV marks
                  them published.
                </span>
              </span>
            </label>
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => void runCommit()}>
              {busy ? "Committing…" : `Commit ${preview.total_rows} row(s)`}
            </button>
          </div>
        </div>
      )}

      {/* Commit result */}
      {commitResult && (
        <div className="card space-y-3" role="status">
          <h2 className="font-semibold">Import complete</h2>
          <div className="flex gap-3 text-sm flex-wrap">
            <span className="badge badge-green">{commitResult.created} created</span>
            <span className="badge badge-brass">{commitResult.updated} updated</span>
            <span className="badge badge-gray">{commitResult.skipped} skipped</span>
            <span className="badge badge-red">{commitResult.errors.length} error</span>
          </div>
          <p className="text-xs text-gray">
            Mode: {commitResult.mode} · Auto-publish: {commitResult.auto_publish ? "on" : "off (draft)"}
          </p>
          {commitResult.errors.length > 0 && (
            <div className="text-xs text-red-700 space-y-1">
              {commitResult.errors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-sm" onClick={reset}>Start another import</button>
            <a href="/admin/products" className="btn btn-ghost btn-sm">View products</a>
          </div>
        </div>
      )}
    </div>
  );
}
