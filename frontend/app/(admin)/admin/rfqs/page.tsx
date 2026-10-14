"use client";
import { useCallback, useEffect, useState } from "react";
import { api, downloadFile } from "@/lib/api";
import type { Rfq, RfqItem } from "@/lib/types";
import { Loading, ErrorBox, EmptyState, StatusBadge } from "@/components/public/States";

const STATUSES = ["new", "contacted", "quoted", "won", "lost"] as const;

interface RfqDetail extends Rfq {
  items?: RfqItem[];
}

export default function AdminRfqs() {
  const [items, setItems] = useState<Rfq[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [msg, setMsg] = useState("");
  const [detail, setDetail] = useState<RfqDetail | null>(null);
  const [detailErr, setDetailErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setErr("");
    const params = new URLSearchParams({ page_size: "50" });
    if (statusFilter) params.set("status", statusFilter);
    api<Rfq[]>(`/api/rfqs?${params.toString()}`)
      .then((d) => setItems(Array.isArray(d) ? d : (d as any).items || []))
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (id: number) => {
    setDetail(null);
    setDetailErr("");
    try {
      const d = await api<RfqDetail>(`/api/rfqs/${id}`);
      setDetail(d);
    } catch (e: any) {
      setDetailErr(String(e));
    }
  };

  const changeStatus = async (id: number, status: string) => {
    setBusy(true);
    setMsg("");
    try {
      await api(`/api/rfqs/${id}/status`, { method: "POST", body: JSON.stringify({ status }) });
      setMsg(`RFQ #${id} marked as ${status}.`);
      load();
      if (detail && detail.id === id) openDetail(id);
    } catch (e: any) {
      setMsg(String(e));
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = async () => {
    setMsg("");
    try {
      await downloadFile("/api/rfqs/export", "rfqs-export.csv");
    } catch (e: any) {
      setMsg(String(e));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">RFQs</h1>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={exportCsv}>Export CSV</button>
        </div>
      </div>

      <div className="card flex gap-2 flex-wrap items-end">
        <div>
          <label className="label" htmlFor="rfq-status">Status</label>
          <select id="rfq-status" className="input max-w-[160px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setStatusFilter("")}>Reset</button>
      </div>

      {msg && <p className="text-sm">{msg}</p>}
      {loading && <Loading label="Loading RFQs…" />}
      {err && <ErrorBox error={err} retry={load} />}
      {!loading && !err && items.length === 0 && <EmptyState title="No RFQs" hint="Quote requests submitted through the public form appear here." />}
      {!loading && !err && items.length > 0 && (
        <div className="card !p-0 overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th>Reference</th><th>Name</th><th>Company</th><th>Country</th><th>Items</th><th>Status</th><th>Date</th><th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono text-xs">{r.reference_number}</td>
                  <td>{r.full_name}</td>
                  <td>{r.company_name}</td>
                  <td>{r.country}</td>
                  <td>{r.item_count ?? "—"}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="text-gray text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="text-right whitespace-nowrap">
                    <button className="btn btn-ghost btn-sm" onClick={() => void openDetail(r.id)}>View</button>{" "}
                    <select
                      className="input !w-[110px] !py-1 !px-2 text-xs"
                      value={r.status}
                      disabled={busy}
                      onChange={(e) => void changeStatus(r.id, e.target.value)}
                      aria-label={`Change status for ${r.reference_number}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`RFQ ${detail.reference_number}`}>
          <div className="absolute inset-0 bg-navy/40" onClick={() => setDetail(null)} />
          <div className="relative bg-white rounded-xl border border-sand shadow-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-lg font-mono">{detail.reference_number}</h2>
                <p className="text-sm text-gray mt-0.5">
                  {detail.full_name} · {detail.company_name} · {detail.country}
                </p>
              </div>
              <StatusBadge status={detail.status} />
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
              <div><span className="text-gray">Email:</span> <a className="link" href={`mailto:${detail.business_email}`}>{detail.business_email}</a></div>
              <div><span className="text-gray">Phone:</span> {detail.phone || "—"}</div>
              <div><span className="text-gray">Target price:</span> {detail.target_price || "—"}</div>
              <div><span className="text-gray">Delivery timeframe:</span> {detail.delivery_timeframe || "—"}</div>
              <div><span className="text-gray">Submitted:</span> {new Date(detail.created_at).toLocaleString()}</div>
              <div><span className="text-gray">Total quantity:</span> {detail.total_quantity ?? "—"}</div>
            </div>

            {detail.additional_requirements && (
              <div className="mt-4">
                <h3 className="font-semibold text-sm">Additional requirements</h3>
                <p className="text-sm text-gray mt-1 whitespace-pre-wrap">{detail.additional_requirements}</p>
              </div>
            )}

            <h3 className="font-semibold mt-5 mb-2">Items ({detail.items?.length ?? detail.item_count ?? 0})</h3>
            {detailErr && <ErrorBox error={detailErr} />}
            {detail.items && detail.items.length > 0 ? (
              <table className="data">
                <thead>
                  <tr><th>Product</th><th>Qty</th><th>Unit</th><th>Notes</th></tr>
                </thead>
                <tbody>
                  {detail.items.map((it) => (
                    <tr key={it.id}>
                      <td>{it.product_name}</td>
                      <td>{it.quantity}</td>
                      <td>{it.unit || "—"}</td>
                      <td className="text-gray">{it.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray">Item details unavailable.</p>
            )}

            <div className="flex gap-2 mt-6">
              <button className="btn btn-ghost btn-sm" onClick={() => setDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
