"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, mediaUrl, variantUrl } from "@/lib/api";
import type {
  CatalogueItem,
  CatalogueListResponse,
  CatalogueScanResult,
  CatalogueStats,
  CatalogueStatus,
  PipelineStatus,
} from "@/lib/types";
import { Loading, ErrorBox, EmptyState } from "@/components/public/States";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  analyzing: "Analyzing",
  ai_generated: "AI Generated",
  needs_review: "Needs Review",
  approved: "Approved",
  published: "Published",
  failed: "Failed",
  missing: "No profile",
};

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  analyzing: "bg-blue-100 text-blue-700",
  ai_generated: "bg-indigo-100 text-indigo-700",
  needs_review: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  published: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-700",
  missing: "bg-gray-100 text-gray-500",
};

/** Filter values for the status dropdown (pipeline status + content gaps). */
const FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All products" },
  { value: "pending", label: "Pending" },
  { value: "analyzing", label: "Analyzing" },
  { value: "ai_generated", label: "AI Generated" },
  { value: "needs_review", label: "Needs Review" },
  { value: "approved", label: "Approved" },
  { value: "published", label: "Published" },
  { value: "failed", label: "Failed" },
  { value: "no_description", label: "Missing description" },
  { value: "no_image", label: "Missing image" },
  { value: "no_metadata", label: "Missing SEO metadata" },
];

const BULK_ACTIONS: { value: string; label: string }[] = [
  { value: "", label: "Bulk action…" },
  { value: "analyze", label: "Analyze with AI" },
  { value: "mark_review", label: "Mark for review" },
  { value: "approve", label: "Approve" },
  { value: "publish", label: "Publish" },
  { value: "unpublish", label: "Unpublish" },
  { value: "delete", label: "Delete" },
];

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_CLASS[status] || STATUS_CLASS.missing}`}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

function StatCard({ label, value, hint, tone }: { label: string; value: number | string; hint?: string; tone?: string }) {
  return (
    <div className="card !py-3">
      <p className="text-xs text-gray uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold ${tone || ""}`}>{value}</p>
      {hint && <p className="text-[11px] text-gray">{hint}</p>}
    </div>
  );
}

export default function AiCataloguePage() {
  const [stats, setStats] = useState<CatalogueStats | null>(null);
  const [status, setStatus] = useState<CatalogueStatus | null>(null);
  const [list, setList] = useState<CatalogueListResponse | null>(null);
  const [filter, setFilter] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [flash, setFlash] = useState("");

  const loadAll = useCallback(async () => {
    setError("");
    try {
      const [st, sc, li] = await Promise.all([
        api<CatalogueStats>("/api/catalogue/stats"),
        api<CatalogueStatus>("/api/catalogue/status"),
        api<CatalogueListResponse>(
          `/api/catalogue/products?status=${encodeURIComponent(filter)}&q=${encodeURIComponent(q)}&page=${page}&page_size=24`,
        ),
      ]);
      setStats(st);
      setStatus(sc);
      setList(li);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [filter, q, page]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const runScan = async () => {
    setBusy("scan");
    setFlash("");
    try {
      const res = await api<CatalogueScanResult>("/api/catalogue/scan", { method: "POST" });
      const c = res.counts;
      setFlash(
        `Scan complete: ${c.created ?? 0} new, ${c.attached ?? 0} attached, ${c.duplicates ?? 0} duplicates, ${c.failed ?? 0} failed.`,
      );
      await loadAll();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy("");
    }
  };

  const runBulk = async () => {
    const action = (document.getElementById("bulk-action") as HTMLSelectElement | null)?.value;
    if (!action || selected.size === 0) {
      setFlash("Select products and a bulk action first.");
      return;
    }
    if (action === "delete" && !window.confirm(`Delete ${selected.size} product(s)? This cannot be undone.`)) return;
    setBusy("bulk");
    setFlash("");
    try {
      const res = await api<{ requested: number; done: number; errors: string[] }>(
        "/api/catalogue/bulk",
        { method: "POST", body: JSON.stringify({ action, ids: Array.from(selected) }) },
      );
      setFlash(`Bulk ${action}: ${res.done}/${res.requested} done.${res.errors.length ? ` Errors: ${res.errors.join("; ")}` : ""}`);
      setSelected(new Set());
      await loadAll();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy("");
    }
  };

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set((list?.items || []).map((i) => i.id)) : new Set());
  };

  const toggleOne = (id: number, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const totalPages = useMemo(() => {
    if (!list) return 1;
    return Math.max(1, Math.ceil(list.total / list.page_size));
  }, [list]);

  if (loading) return <Loading label="Loading AI catalogue…" />;
  if (error && !stats) return <ErrorBox error={error} retry={() => void loadAll()} />;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-serif font-bold">AI Catalogue</h1>
          <p className="text-sm text-gray">
            Scan product photos → AI analysis → review → approve → publish.
            Nothing goes public before you approve it.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <button className="btn btn-primary btn-sm" disabled={busy === "scan"} onClick={() => void runScan()}>
            {busy === "scan" ? "Scanning…" : "Scan folder now"}
          </button>
        </div>
      </div>

      {flash && <p className="text-sm bg-brass/10 border border-brass/30 rounded-lg px-3 py-2">{flash}</p>}
      {error && <ErrorBox error={error} />}

      {/* Scanner status */}
      {status && (
        <div className="card !py-3 text-xs text-gray flex flex-wrap gap-x-6 gap-y-1">
          <span>
            Folder: <code className="text-navy">{status.scan_dir}</code>
            {!status.scan_dir_exists && <span className="text-red-700"> (missing)</span>}
          </span>
          <span>Background scan: {status.enabled ? `on (every ${status.interval_seconds}s)` : "off"}</span>
          <span>AI vision: {status.llm_configured ? "configured" : "not configured — rule-based fallback"}</span>
          <span>
            Last scan:{" "}
            {status.last_run?.at
              ? `${new Date(status.last_run.at).toLocaleString()} (${status.last_run.created ?? 0} new)`
              : "never"}
          </span>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <StatCard label="Total products" value={stats.total_products} />
          <StatCard label="Pending" value={stats.pending} />
          <StatCard label="Needs review" value={stats.needs_review} tone="text-amber-700" />
          <StatCard label="Approved" value={stats.approved} tone="text-emerald-700" />
          <StatCard label="Published" value={stats.published_products} tone="text-green-700" />
          <StatCard label="Failed" value={stats.failed} tone="text-red-700" />
          <StatCard label="SEO complete" value={`${stats.seo_completion_pct}%`} hint="title + meta + description + keyword + image" />
          <StatCard label="Missing images" value={stats.missing_images} />
          <StatCard label="Missing descriptions" value={stats.missing_descriptions} />
          <StatCard label="Missing metadata" value={stats.missing_metadata} />
          <StatCard
            label="AI vision"
            value={stats.llm_configured ? "On" : "Off"}
            hint={stats.llm_configured ? "" : "rule-based content — verify fields"}
            tone={stats.llm_configured ? "text-emerald-700" : "text-amber-700"}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <select
          className="input !w-auto"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by status"
        >
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <input
          className="input !w-56"
          placeholder="Search product name…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          aria-label="Search products"
        />
        <span className="flex-1" />
        <select id="bulk-action" className="input !w-auto" defaultValue="" aria-label="Bulk action">
          {BULK_ACTIONS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
        <button className="btn btn-ghost btn-sm" disabled={busy === "bulk" || selected.size === 0} onClick={() => void runBulk()}>
          {busy === "bulk" ? "Working…" : `Apply (${selected.size})`}
        </button>
      </div>

      {/* Table */}
      {!list || list.items.length === 0 ? (
        <EmptyState
          title="No products match"
          hint="Drop images into the scan folder and press “Scan folder now”, or change the filter."
        />
      ) : (
        <div className="card !p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ivory text-left text-xs uppercase tracking-wide text-gray">
              <tr>
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={selected.size > 0 && selected.size === list.items.length}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                </th>
                <th className="px-3 py-2">Image</th>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">SEO</th>
                <th className="px-3 py-2">Pipeline</th>
                <th className="px-3 py-2">Site</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((p: CatalogueItem) => (
                <tr key={p.id} className="border-t border-ivory hover:bg-ivory/50">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label={`Select ${p.name}`}
                      checked={selected.has(p.id)}
                      onChange={(e) => toggleOne(p.id, e.target.checked)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={variantUrl(p.image.url, "thumb") || mediaUrl(p.image.url)}
                        alt={p.image.alt_text || p.name}
                        className="w-10 h-10 rounded object-cover border border-ivory"
                      />
                    ) : (
                      <span className="w-10 h-10 rounded border border-dashed border-gray/40 flex items-center justify-center text-[10px] text-gray">
                        none
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/ai-catalogue/${p.id}`} className="font-medium text-navy hover:underline">
                      {p.name}
                    </Link>
                    <span className="block text-[11px] text-gray">{p.image_count} image(s)</span>
                  </td>
                  <td className="px-3 py-2 text-gray">{p.category?.name || "—"}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-[11px] font-semibold ${p.seo_complete ? "text-emerald-700" : "text-amber-700"}`}
                      title={p.seo_title || "no SEO title"}
                    >
                      {p.seo_complete ? "Complete" : "Incomplete"}
                    </span>
                    {p.primary_keyword && <span className="block text-[11px] text-gray">{p.primary_keyword}</span>}
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill status={p.pipeline_status} />
                  </td>
                  <td className="px-3 py-2">
                    {p.status === "published" ? (
                      <span className="text-[11px] text-green-700 font-semibold">live</span>
                    ) : (
                      <span className="text-[11px] text-gray">draft</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <Link href={`/admin/ai-catalogue/${p.id}`} className="btn btn-ghost btn-sm">
                      Open
                    </Link>
                    <Link href={`/admin/ai-catalogue/${p.id}#preview`} className="btn btn-ghost btn-sm">
                      Preview
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray">
            {list?.total ?? 0} product(s) · page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ← Previous
            </button>
            <button
              className="btn btn-ghost btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      <p className="text-[11px] text-gray">
        AI content stays private until you approve and publish it. Re-running analysis never overwrites
        published copy — edits are applied only when you press Approve.
      </p>
    </div>
  );
}
