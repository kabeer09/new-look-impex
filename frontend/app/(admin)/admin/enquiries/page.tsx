"use client";
import { useCallback, useEffect, useState } from "react";
import { api, downloadFile } from "@/lib/api";
import { Loading, ErrorBox, EmptyState, StatusBadge } from "@/components/public/States";

const STATUSES = ["new", "contacted", "qualified", "quoted", "won", "lost", "spam"] as const;

interface Lead {
  id: number;
  reference?: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  country?: string;
  product_interest?: string;
  quantity?: string;
  status: string;
  score?: number;
  notes?: string;
  created_at: string;
}

interface LeadDetail extends Lead {
  message?: string;
  source?: string;
  campaign?: string;
  landing_page?: string;
  referrer?: string;
  consent?: boolean;
  product?: { id: number; name: string; slug: string } | null;
}

export default function AdminEnquiries() {
  const [items, setItems] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [msg, setMsg] = useState("");
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setErr("");
    const params = new URLSearchParams({ page: String(page), page_size: "25" });
    if (statusFilter) params.set("status", statusFilter);
    if (countryFilter) params.set("country", countryFilter);
    if (query) params.set("q", query);
    api<{ total: number; items: Lead[] }>(`/api/enquiries?${params.toString()}`)
      .then((d) => {
        setItems(d.items || []);
        setTotal(d.total || 0);
      })
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, [statusFilter, countryFilter, query, page]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (id: number) => {
    setDetail(null);
    try {
      setDetail(await api<LeadDetail>(`/api/enquiries/${id}`));
    } catch (e: any) {
      setMsg(String(e));
    }
  };

  const patch = async (id: number, payload: Record<string, unknown>) => {
    setBusy(true);
    setMsg("");
    try {
      await api(`/api/enquiries/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
      setMsg(`Lead #${id} updated.`);
      load();
    } catch (e: any) {
      setMsg(String(e));
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (countryFilter) params.set("country", countryFilter);
    if (query) params.set("q", query);
    try {
      await downloadFile(`/api/enquiries/export?${params.toString()}`, "enquiries.csv");
    } catch (e: any) {
      setMsg(String(e));
    }
  };

  const pages = Math.max(1, Math.ceil(total / 25));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Enquiries / Leads</h1>
        <button className="btn btn-ghost btn-sm" onClick={exportCsv}>Export CSV</button>
      </div>
      <p className="text-xs text-gray">
        Private lead data — never exposed publicly. Reference numbers are shown to buyers for support.
      </p>

      <div className="card flex gap-2 flex-wrap items-end">
        <div>
          <label className="label" htmlFor="lead-q">Search</label>
          <input id="lead-q" className="input max-w-[200px]" placeholder="Company, email, name…"
            value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
        </div>
        <div>
          <label className="label" htmlFor="lead-status">Status</label>
          <select id="lead-status" className="input max-w-[150px]" value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="lead-country">Country</label>
          <input id="lead-country" className="input max-w-[160px]" placeholder="e.g. Australia"
            value={countryFilter} onChange={(e) => { setCountryFilter(e.target.value); setPage(1); }} />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => { setQuery(""); setStatusFilter(""); setCountryFilter(""); setPage(1); }}>
          Reset
        </button>
      </div>

      {msg && <p className="text-sm">{msg}</p>}
      {loading && <Loading label="Loading leads…" />}
      {err && <ErrorBox error={err} retry={load} />}
      {!loading && !err && items.length === 0 && (
        <EmptyState title="No enquiries yet" hint="Wholesale enquiries submitted through the public forms appear here." />
      )}

      {!loading && !err && items.length > 0 && (
        <div className="card !p-0 overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th>Reference</th><th>Name</th><th>Company</th><th>Country</th>
                <th>Product</th><th>Status</th><th>Date</th><th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id}>
                  <td className="font-mono text-xs">{e.reference || `#${e.id}`}</td>
                  <td>{e.name}</td>
                  <td>{e.company || "—"}</td>
                  <td>{e.country || "—"}</td>
                  <td className="truncate max-w-[160px]">{e.product_interest || "—"}</td>
                  <td><StatusBadge status={e.status} /></td>
                  <td className="text-gray text-xs">{new Date(e.created_at).toLocaleDateString()}</td>
                  <td className="text-right whitespace-nowrap">
                    <button className="btn btn-ghost btn-sm" onClick={() => void openDetail(e.id)}>View</button>{" "}
                    <select
                      className="input !w-[110px] !py-1 !px-2 text-xs"
                      value={e.status}
                      disabled={busy}
                      onChange={(ev) => void patch(e.id, { status: ev.target.value })}
                      aria-label={`Change status for ${e.reference || e.id}`}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && pages > 1 && (
        <div className="flex items-center gap-3 text-sm">
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span className="text-gray">Page {page} of {pages} · {total} leads</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Lead ${detail.reference || detail.id}`}>
          <div className="absolute inset-0 bg-navy/40" onClick={() => setDetail(null)} />
          <div className="relative bg-white rounded-xl border border-sand shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-lg font-mono">{detail.reference || `#${detail.id}`}</h2>
                <p className="text-sm text-gray mt-0.5">{detail.name} · {detail.company || "—"} · {detail.country || "—"}</p>
              </div>
              <StatusBadge status={detail.status} />
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
              <div><span className="text-gray">Email:</span> <a className="link" href={`mailto:${detail.email}`}>{detail.email}</a></div>
              <div><span className="text-gray">Phone:</span> {detail.phone || "—"}</div>
              <div><span className="text-gray">Product:</span> {detail.product ? detail.product.name : (detail.product_interest || "—")}</div>
              <div><span className="text-gray">Quantity:</span> {detail.quantity || "—"}</div>
              <div><span className="text-gray">Source:</span> {detail.source || "website"}</div>
              <div><span className="text-gray">Campaign:</span> {detail.campaign || "—"}</div>
              <div><span className="text-gray">Landing page:</span> {detail.landing_page || "—"}</div>
              <div><span className="text-gray">Submitted:</span> {new Date(detail.created_at).toLocaleString()}</div>
            </div>

            {detail.message && (
              <div className="mt-4">
                <h3 className="font-semibold text-sm">Message</h3>
                <p className="text-sm text-gray mt-1 whitespace-pre-wrap">{detail.message}</p>
              </div>
            )}

            <div className="mt-5">
              <label className="label" htmlFor="lead-notes">Internal notes</label>
              <textarea id="lead-notes" className="input min-h-[90px]" defaultValue={detail.notes || ""}
                placeholder="Add private notes for your team…" />
              <div className="flex gap-2 mt-2">
                <button
                  className="btn btn-primary btn-sm"
                  disabled={busy}
                  onClick={() => {
                    const el = document.getElementById("lead-notes") as HTMLTextAreaElement | null;
                    void patch(detail.id, { notes: el?.value ?? "", status: detail.status });
                  }}
                >
                  Save notes
                </button>
                <select
                  className="input !w-[130px] !py-1 !px-2 text-xs"
                  value={detail.status}
                  disabled={busy}
                  onChange={(ev) => { setDetail({ ...detail, status: ev.target.value }); void patch(detail.id, { status: ev.target.value }); }}
                  aria-label="Lead status"
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button className="btn btn-ghost btn-sm" onClick={() => setDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
