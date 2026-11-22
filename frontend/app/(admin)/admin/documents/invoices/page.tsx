"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, getToken } from "@/lib/api";
import { Loading, ErrorBox, EmptyState } from "@/components/public/States";

const TYPES = ["", "proforma", "commercial", "sales", "custom"];
const STATUSES = ["", "unpaid", "partial", "paid", "overdue"];

export default function InvoiceHistory() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    setLoading(true); setErr("");
    const p = new URLSearchParams({ page_size: "100" });
    if (type) p.set("doc_type", type);
    if (status) p.set("status", status);
    if (search) p.set("search", search);
    api<{ items: any[]; total: number }>(`/api/invoices?${p}`)
      .then((d) => { setItems(d.items || []); setTotal(d.total || 0); })
      .catch((e) => setErr(String(e))).finally(() => setLoading(false));
  }, [type, status, search]);
  useEffect(() => { load(); }, [load]);

  const pdf = async (id: number, number: string) => {
    const token = getToken();
    const r = await fetch(`/api/invoices/${id}/pdf`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!r.ok) { setMsg(`PDF failed (${r.status})`); return; }
    const b = await r.blob(); const u = URL.createObjectURL(b); const a = document.createElement("a");
    a.href = u; a.download = `${number}.pdf`; a.click(); URL.revokeObjectURL(u);
  };
  const duplicate = async (id: number) => { try { const d = await api<any>(`/api/invoices/${id}/duplicate`, { method: "POST" }); setMsg(`Duplicated: ${d.number}`); load(); } catch (e) { setMsg(String(e)); } };
  const remove = async (id: number, number: string) => { if (!window.confirm(`Delete ${number}?`)) return; try { await api(`/api/invoices/${id}`, { method: "DELETE" }); setMsg("Deleted."); load(); } catch (e) { setMsg(String(e)); } };
  const setInvStatus = async (id: number, st: string) => { try { await api(`/api/invoices/${id}/status`, { method: "POST", body: JSON.stringify({ status: st }) }); load(); } catch (e) { setMsg(String(e)); } };
  const recordPayment = async (id: number) => {
    const amount = window.prompt("Payment amount received:");
    if (!amount) return;
    try { await api(`/api/invoices/${id}/payment`, { method: "POST", body: JSON.stringify({ amount }) }); setMsg("Payment recorded."); load(); } catch (e) { setMsg(String(e)); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold">Invoice History</h1><p className="text-sm text-gray mt-1">{total} invoices</p></div>
        <Link href="/admin/documents/invoice/new" className="btn btn-primary btn-sm">+ Create Invoice</Link>
      </div>
      <div className="card flex gap-2 flex-wrap items-end">
        <label><span className="text-xs">Type</span><select className="input max-w-[150px] mt-1" value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((t) => <option key={t} value={t}>{t || "All"}</option>)}</select></label>
        <label><span className="text-xs">Status</span><select className="input max-w-[150px] mt-1" value={status} onChange={(e) => setStatus(e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{s || "All"}</option>)}</select></label>
        <label><span className="text-xs">Search</span><input className="input max-w-[220px] mt-1" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="number / PO" /></label>
      </div>
      {msg && <p className="text-sm">{msg}</p>}
      {loading && <Loading label="Loading invoices…" />}
      {err && <ErrorBox error={err} retry={load} />}
      {!loading && !err && items.length === 0 && <EmptyState title="No invoices" hint="Create your first invoice manually." />}
      {!loading && items.length > 0 && <div className="card !p-0 overflow-x-auto"><table className="data w-full"><thead><tr>
        <th>Number</th><th>Type</th><th>Buyer</th><th>Country</th><th>Date</th><th>Due</th><th>Total</th><th>Balance</th><th>Payment</th><th className="text-right">Actions</th>
      </tr></thead><tbody>{items.map((d) => (
        <tr key={d.id}>
          <td className="font-mono text-xs">{d.number}</td><td>{d.doc_type}</td><td>{d.buyer_company || "—"}</td><td>{d.buyer_country || "—"}</td>
          <td className="text-xs text-gray">{d.invoice_date || "—"}</td><td className="text-xs text-gray">{d.due_date || "—"}</td>
          <td>{d.currency} {Number(d.grand_total).toLocaleString()}</td><td>{d.currency} {Number(d.balance_due).toLocaleString()}</td>
          <td><select className="input !w-[100px] !py-1 text-xs" value={d.payment_status} onChange={(e) => setInvStatus(d.id, e.target.value)}>{STATUSES.filter(Boolean).map((s) => <option key={s}>{s}</option>)}</select></td>
          <td className="text-right whitespace-nowrap">
            <Link className="btn btn-ghost btn-sm" href={`/admin/documents/invoices/${d.id}`}>Edit</Link>{" "}
            <button className="btn btn-ghost btn-sm" onClick={() => pdf(d.id, d.number)}>PDF</button>{" "}
            <button className="btn btn-ghost btn-sm" onClick={() => recordPayment(d.id)}>Record payment</button>{" "}
            <button className="btn btn-ghost btn-sm" onClick={() => duplicate(d.id)}>Duplicate</button>{" "}
            <button className="btn btn-ghost btn-sm" onClick={() => remove(d.id, d.number)}>Delete</button>
          </td>
        </tr>
      ))}</tbody></table></div>}
    </div>
  );
}
