"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, downloadFile } from "@/lib/api";
import type { Paged, ProductCard, ImportResult } from "@/lib/types";
import { Loading, ErrorBox, EmptyState, StatusBadge } from "@/components/public/States";

export default function AdminProducts() {
  const [data, setData] = useState<Paged<ProductCard> | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const page = 1;

  const load = useCallback(() => {
    setLoading(true);
    setErr("");
    const params = new URLSearchParams({ page: String(page), page_size: "50" });
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    api<Paged<ProductCard>>(`/api/products?${params.toString()}`)
      .then(setData)
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, [q, status, page]);

  useEffect(() => { load(); }, [load]);

  const act = async (id: number, action: "publish" | "unpublish" | "archive", currentStatus: string) => {
    setBusyId(id);
    setMsg("");
    try {
      if (action === "archive" && currentStatus !== "archived") {
        // Archive directly (delete advised only when unreferenced).
        await api(`/api/products/${id}/archive`, { method: "POST" });
      } else {
        await api(`/api/products/${id}/${action}`, { method: "POST" });
      }
      load();
    } catch (e: any) {
      setMsg(String(e));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: number) => {
    setBusyId(id);
    setMsg("");
    try {
      await api(`/api/products/${id}`, { method: "DELETE" });
      setConfirmDelete(null);
      load();
    } catch (e: any) {
      setMsg(String(e));
    } finally {
      setBusyId(null);
    }
  };

  const onImportFile = async (file: File) => {
    setImporting(true);
    setMsg("");
    try {
      const csv = await file.text();
      const res = await api<ImportResult>("/api/products/import", {
        method: "POST",
        body: JSON.stringify({ csv }),
      });
      setMsg(`Import done — created: ${res.created ?? 0}, updated: ${res.updated ?? 0}, errors: ${(res.errors || []).length}`);
      load();
    } catch (e: any) {
      setMsg(String(e));
    } finally {
      setImporting(false);
    }
  };

  const onExport = async () => {
    setMsg("");
    try {
      await downloadFile("/api/products/export", "products-export.csv");
    } catch (e: any) {
      setMsg(String(e));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex gap-2 flex-wrap">
          <Link href="/admin/products/new" className="btn btn-primary btn-sm">+ New product</Link>
          <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={importing}>
            {importing ? "Importing…" : "Import CSV"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onImportFile(f);
              e.target.value = "";
            }}
          />
          <button className="btn btn-ghost btn-sm" onClick={onExport}>Export CSV</button>
        </div>
      </div>
      <p className="text-xs text-gray">DELETE is blocked by the API when an RFQ references the product — archive instead.</p>

      <div className="card flex gap-2 flex-wrap items-end">
        <div>
          <label className="label" htmlFor="p-q">Search</label>
          <input id="p-q" className="input max-w-xs" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, SKU…" />
        </div>
        <div>
          <label className="label" htmlFor="p-status">Status</label>
          <select id="p-status" className="input max-w-[160px]" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => { setQ(""); setStatus(""); }}>Reset</button>
      </div>

      {msg && <p className="text-sm">{msg}</p>}
      {loading && <Loading label="Loading products…" />}
      {err && <ErrorBox error={err} retry={load} />}

      {!loading && !err && data && (
        data.items.length === 0 ? (
          <EmptyState title="No products" hint="Import a CSV or create the first product." />
        ) : (
          <div className="card !p-0 overflow-x-auto">
            <table className="data">
              <thead>
                <tr>
                  <th>Product</th><th>Category</th><th>Material</th><th>Status</th><th>Featured</th><th>Price</th><th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link className="font-medium text-navy hover:underline" href={`/admin/products/${p.id}`}>{p.name}</Link>
                      {p.sku && <div className="text-xs text-gray">SKU {p.sku}</div>}
                    </td>
                    <td>{p.category?.name || "—"}</td>
                    <td>{p.material || "—"}</td>
                    <td><StatusBadge status={p.status || "draft"} /></td>
                    <td>{p.featured ? <span className="badge badge-brass">★</span> : <span className="text-gray">—</span>}</td>
                    <td>{p.price_on_request || p.price == null ? "On request" : `${p.currency || "USD"} ${p.price}`}</td>
                    <td className="text-right whitespace-nowrap">
                      <Link className="btn btn-ghost btn-sm" href={`/admin/products/${p.id}`}>Edit</Link>{" "}
                      {p.status !== "published" ? (
                        <button className="btn btn-ghost btn-sm" disabled={busyId === p.id} onClick={() => void act(p.id, "publish", p.status || "draft")}>Publish</button>
                      ) : (
                        <button className="btn btn-ghost btn-sm" disabled={busyId === p.id} onClick={() => void act(p.id, "unpublish", p.status || "draft")}>Unpublish</button>
                      )}
                      {p.status !== "archived" && (
                        <button className="btn btn-ghost btn-sm" disabled={busyId === p.id} onClick={() => void act(p.id, "archive", p.status || "draft")}>Archive</button>
                      )}
                      {confirmDelete === p.id ? (
                        <span className="inline-block ml-1">
                          <button className="btn btn-danger btn-sm" disabled={busyId === p.id} onClick={() => void remove(p.id)}>Confirm</button>{" "}
                          <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(null)}>Cancel</button>
                        </span>
                      ) : (
                        <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(p.id)}>Delete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {data && data.total > data.page_size && (
        <p className="text-xs text-gray">Showing {data.items.length} of {data.total} products (page {data.page}).</p>
      )}
    </div>
  );
}
