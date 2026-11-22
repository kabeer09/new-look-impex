"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, getToken } from "@/lib/api";
import { Loading, ErrorBox, EmptyState } from "@/components/public/States";

const STATUSES = ["", "draft", "sent", "accepted", "rejected", "expired"];
export default function QuotationHistory() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [status, setStatus] = useState("");
  const [buyer, setBuyer] = useState("");

  const load = useCallback(() => {
    setLoading(true); setErr("");
    const p = new URLSearchParams({ page_size: "100" });
    if (status) p.set("status", status);
    if (buyer) p.set("buyer", buyer);
    api<{ items: any[]; total: number }>(`/api/quotations?${p}`)
      .then((d) => { setItems(d.items || []); setTotal(d.total || 0); })
      .catch((e) => setErr(String(e))).finally(() => setLoading(false));
  }, [status, buyer]);
  useEffect(() => { load(); }, [load]);

  const pdf = async (id: number, number: string) => {
    const token = getToken();
    const r = await fetch(`/api/quotations/${id}/pdf`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!r.ok) { setMsg(`PDF failed (${r.status})`); return; }
    const b = await r.blob(); const u = URL.createObjectURL(b); const a = document.createElement("a");
    a.href = u; a.download = `${number}.pdf`; a.click(); URL.revokeObjectURL(u);
  };
  const duplicate = async (id: number) => { try { const d = await api<any>(`/api/quotations/${id}/duplicate`, { method: "POST" }); setMsg(`Duplicated: ${d.number}`); load(); } catch (e) { setMsg(String(e)); } };
  const convert = async (id: number) => { try { const d = await api<any>(`/api/documents/quote-to-invoice/${id}`, { method: "POST" }); setMsg(`Converted to ${d.number} — opening editor…`); window.location.href = `/admin/documents/invoices/${d.id}`; } catch (e) { setMsg(String(e)); } };
  const remove = async (id: number, number: string) => { if (!window.confirm(`Delete ${number}?`)) return; try { await api(`/api/quotations/${id}`, { method: "DELETE" }); setMsg("Deleted."); load(); } catch (e) { setMsg(String(e)); } };
  const updateStatus = async (id: number, st: string) => { try { await api(`/api/quotations/${id}/status`, { method: "POST", body: JSON.stringify({ status: st }) }); load(); } catch (e) { setMsg(String(e)); } };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold">Quotation History</h1><p className="text-sm text-gray mt-1">{total} quotations</p></div>
        <Link href="/admin/documents/quotation/new" className="btn btn-primary btn-sm">+ Create Quotation</Link>
      </div>
      <div className="card flex gap-2 flex-wrap items-end">
        <label><span className="text-xs">Status</span><select className="input max-w-[150px] mt-1" value={status} onChange={(e) => setStatus(e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{s || "All"}</option>)}</select></label>
        <label><span className="text-xs">Buyer</span><input className="input max-w-[220px] mt-1" value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder="company" /></label>
      </div>
      {msg && <p className="text-sm">{msg}</p>}
      {loading && <Loading label="Loading quotations…" />}
      {err && <ErrorBox error={err} retry={load} />}
      {!loading && !err && items.length === 0 && <EmptyState title="No quotations" hint="Create a quotation manually." />}
      {!loading && items.length > 0 && <div className="card !p-0 overflow-x-auto"><table className="data w-full"><thead><tr>
        <th>Number</th><th>Buyer</th><th>Country</th><th>Issue</th><th>Valid until</th><th>Total</th><th>Status</th><th className="text-right">Actions</th>
      </tr></thead><tbody>{items.map((q) => (
        <tr key={q.id}>
          <td className="font-mono text-xs">{q.number}</td><td>{q.buyer_company || "—"}</td><td>{q.buyer_country || "—"}</td>
          <td className="text-xs text-gray">{q.quote_date || "—"}</td><td className="text-xs text-gray">{q.expiry_date || "—"}</td>
          <td>{q.currency} {Number(q.grand_total).toLocaleString()}</td>
          <td><select className="input !w-[100px] !py-1 text-xs" value={q.status} onChange={(e) => updateStatus(q.id, e.target.value)}>{STATUSES.filter(Boolean).map((s) => <option key={s}>{s}</option>)}</select></td>
          <td className="text-right whitespace-nowrap">
            <Link className="btn btn-ghost btn-sm" href={`/admin/documents/quotations/${q.id}`}>Edit</Link>{" "}
            <button className="btn btn-ghost btn-sm" onClick={() => pdf(q.id, q.number)}>PDF</button>{" "}
            <button className="btn btn-ghost btn-sm" onClick={() => convert(q.id)}>Convert to Invoice</button>{" "}
            <button className="btn btn-ghost btn-sm" onClick={() => duplicate(q.id)}>Duplicate</button>{" "}
            <button className="btn btn-ghost btn-sm" onClick={() => remove(q.id, q.number)}>Delete</button>
          </td>
        </tr>
      ))}</tbody></table></div>}
    </div>
  );
}
