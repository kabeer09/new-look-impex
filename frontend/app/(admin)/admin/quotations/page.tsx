"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, getToken } from "@/lib/api";
import { Loading, ErrorBox, EmptyState, StatusBadge } from "@/components/public/States";

type Quote = {
  id: number; number: string; status: string; buyer_company: string; buyer_country: string;
  currency: string; grand_total: number; quote_date: string | null; expiry_date: string | null;
  item_count: number; created_at: string;
};
const STATUSES = ["draft", "sent", "accepted", "rejected", "expired"];

export default function QuotationHistory() {
  const [items, setItems] = useState<Quote[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [status, setStatus] = useState("");
  const [buyer, setBuyer] = useState("");
  const [country, setCountry] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    setLoading(true); setErr("");
    const p = new URLSearchParams({ page_size: "100" });
    if (status) p.set("status", status);
    if (buyer) p.set("buyer", buyer);
    if (country) p.set("country", country);
    api<{ items: Quote[]; total: number }>(`/api/quotations?${p.toString()}`)
      .then((d) => { setItems(d.items || []); setTotal(d.total || 0); })
      .catch((e) => setErr(String(e))).finally(() => setLoading(false));
  }, [status, buyer, country]);
  useEffect(() => { load(); }, [load]);

  const setQuoteStatus = async (id: number, st: string) => {
    setMsg("");
    try { await api(`/api/quotations/${id}/status`, { method: "POST", body: JSON.stringify({ status: st }) }); load(); }
    catch (e) { setMsg(String(e)); }
  };
  const duplicate = async (id: number) => {
    setMsg("");
    try { const d = await api<any>(`/api/quotations/${id}/duplicate`, { method: "POST" }); setMsg(`Duplicated as ${d.number}.`); load(); }
    catch (e) { setMsg(String(e)); }
  };
  const remove = async (id: number, number: string) => {
    if (!window.confirm(`Delete quotation ${number}? This cannot be undone.`)) return;
    setMsg("");
    try { await api(`/api/quotations/${id}`, { method: "DELETE" }); setMsg(`Deleted ${number}.`); load(); }
    catch (e) { setMsg(String(e)); }
  };
  const downloadPdf = async (id: number, number: string) => {
    const token = getToken();
    try {
      const r = await fetch(`/api/quotations/${id}/pdf`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!r.ok) { setMsg(`PDF failed (${r.status}).`); return; }
      const b = await r.blob(); const u = URL.createObjectURL(b);
      const a = document.createElement("a"); a.href = u; a.download = `${number}.pdf`; a.click(); URL.revokeObjectURL(u);
    } catch (e) { setMsg(String(e)); }
  };
  const share = (q: Quote) => {
    const text = `Quotation ${q.number} from New Look Impex. Total: ${q.currency} ${q.grand_total}. Valid until ${q.expiry_date || "-"}. Please reply to this message to confirm.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold">Quotation Management</h1>
          <p className="text-sm text-gray mt-1">{total} quotations</p></div>
        <Link href="/admin/quotations/new" className="btn btn-primary btn-sm">+ Create Quotation</Link>
      </div>
      <div className="card flex gap-2 flex-wrap items-end">
        <label><span className="text-xs">Status</span><select className="input max-w-[140px] mt-1" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label><span className="text-xs">Buyer</span><input className="input max-w-[180px] mt-1" value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder="company" /></label>
        <label><span className="text-xs">Country</span><input className="input max-w-[160px] mt-1" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="country" /></label>
        <button className="btn btn-ghost btn-sm" onClick={() => { setStatus(""); setBuyer(""); setCountry(""); }}>Reset</button>
      </div>
      {msg && <p className="text-sm">{msg}</p>}
      {loading && <Loading label="Loading quotations…" />}
      {err && <ErrorBox error={err} retry={load} />}
      {!loading && !err && items.length === 0 && <EmptyState title="No quotations" hint="Create your first professional quotation." />}
      {!loading && !err && items.length > 0 && <div className="card !p-0 overflow-x-auto">
        <table className="data w-full"><thead><tr>
          <th>Number</th><th>Buyer</th><th>Country</th><th>Date</th><th>Amount</th><th>Items</th><th>Status</th><th>Valid until</th><th className="text-right">Actions</th>
        </tr></thead><tbody>
          {items.map((q) => <tr key={q.id}>
            <td className="font-mono text-xs">{q.number}</td>
            <td>{q.buyer_company || "—"}</td>
            <td>{q.buyer_country || "—"}</td>
            <td className="text-xs text-gray">{q.quote_date || "—"}</td>
            <td>{q.currency} {q.grand_total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            <td>{q.item_count}</td>
            <td><StatusBadge status={q.status} /></td>
            <td className="text-xs text-gray">{q.expiry_date || "—"}</td>
            <td className="text-right whitespace-nowrap">
              <Link className="btn btn-ghost btn-sm" href={`/admin/quotations/${q.id}`}>Edit</Link>{" "}
              <button className="btn btn-ghost btn-sm" onClick={() => downloadPdf(q.id, q.number)}>PDF</button>{" "}
              <button className="btn btn-ghost btn-sm" onClick={() => share(q)}>WhatsApp</button>{" "}
              <button className="btn btn-ghost btn-sm" onClick={() => duplicate(q.id)}>Duplicate</button>{" "}
              <select className="input !w-[100px] !py-1 !px-2 text-xs" value={q.status} onChange={(e) => setQuoteStatus(q.id, e.target.value)} aria-label="Status">
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>{" "}
              <button className="btn btn-ghost btn-sm" onClick={() => remove(q.id, q.number)}>Delete</button>
            </td>
          </tr>)}
        </tbody></table>
      </div>}
    </div>
  );
}
