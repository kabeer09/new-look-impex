"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loading, ErrorBox } from "@/components/public/States";

type Coupon = { id?: number; code: string; description: string; type: string; value: number; min_order_qty: number; max_uses: number; used_count: number; is_active: boolean; starts_at: string; ends_at: string; source?: string };
const blank = (): Coupon => ({ code: "", description: "", type: "percent", value: 10, min_order_qty: 0, max_uses: 0, used_count: 0, is_active: true, starts_at: "", ends_at: "" });
const toLocal = (v?: string) => v ? v.slice(0, 16) : "";

export default function CouponManager() {
  const [items, setItems] = useState<Coupon[]>([]);
  const [form, setForm] = useState<Coupon>(blank());
  const [editing, setEditing] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    setLoading(true); setErr("");
    api<{ items: Coupon[] }>("/api/discounts").then((d) => setItems(d.items || []))
      .catch((e) => setErr(String(e))).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k: keyof Coupon, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const edit = (c: Coupon) => { setEditing(c.id || null); setForm({ ...c, starts_at: toLocal(c.starts_at), ends_at: toLocal(c.ends_at) }); };
  const cancel = () => { setEditing(null); setForm(blank()); };
  const save = async () => {
    setMsg("");
    if (!form.code.trim()) { setMsg("Code is required."); return; }
    const payload = { ...form, starts_at: form.starts_at || null, ends_at: form.ends_at || null };
    try {
      if (editing) await api(`/api/discounts/${editing}`, { method: "PUT", body: JSON.stringify(payload) });
      else await api("/api/discounts", { method: "POST", body: JSON.stringify(payload) });
      setMsg(editing ? "Coupon updated." : "Coupon created."); cancel(); load();
    } catch (e) { setMsg(String(e)); }
  };
  const remove = async (c: Coupon) => {
    if (!window.confirm(`Delete coupon ${c.code}?`)) return;
    try { await api(`/api/discounts/${c.id}`, { method: "DELETE" }); setMsg("Deleted."); load(); }
    catch (e) { setMsg(String(e)); }
  };
  const toggle = async (c: Coupon) => {
    try { await api(`/api/discounts/${c.id}`, { method: "PUT", body: JSON.stringify({ is_active: !c.is_active }) }); load(); }
    catch (e) { setMsg(String(e)); }
  };

  const input = (label: string, k: keyof Coupon, type = "text") => (
    <label className="block"><span className="text-xs font-semibold text-navy">{label}</span>
      <input className="input mt-1" type={type} value={String(form[k] ?? "")} onChange={(e) => set(k, e.target.value)} /></label>
  );

  return (
    <div className="space-y-5 max-w-6xl">
      <div><Link href="/admin/site-control" className="link text-sm">← Site Control</Link>
        <h1 className="text-2xl font-bold mt-1">Coupons &amp; Discounts</h1>
        <p className="text-sm text-gray mt-1">Codes your buyers can use. Set validity dates and usage limits.</p></div>
      {msg && <p className="text-sm">{msg}</p>}
      {err && <ErrorBox error={err} retry={load} />}
      {loading && <Loading label="Loading coupons…" />}

      <section className="card">
        <h2 className="font-semibold text-navy mb-4">{editing ? "Edit coupon" : "New coupon"}</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {input("Code *", "code")}
          <label className="block"><span className="text-xs font-semibold text-navy">Type</span>
            <select className="input mt-1" value={form.type} onChange={(e) => set("type", e.target.value)}><option value="percent">Percent %</option><option value="fixed">Fixed amount</option></select></label>
          {input("Value", "value", "number")}
          <label className="block sm:col-span-2"><span className="text-xs font-semibold text-navy">Description</span>
            <input className="input mt-1" value={form.description} onChange={(e) => set("description", e.target.value)} /></label>
          {input("Min order qty", "min_order_qty", "number")}
          {input("Max uses (0 = unlimited)", "max_uses", "number")}
          <label className="block"><span className="text-xs font-semibold text-navy">Valid from</span>
            <input type="datetime-local" className="input mt-1" value={form.starts_at} onChange={(e) => set("starts_at", e.target.value)} /></label>
          <label className="block"><span className="text-xs font-semibold text-navy">Valid until</span>
            <input type="datetime-local" className="input mt-1" value={form.ends_at} onChange={(e) => set("ends_at", e.target.value)} /></label>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} /> Active</label>
        </div>
        <div className="flex gap-2 mt-4">
          <button className="btn btn-primary btn-sm" onClick={save}>{editing ? "Save changes" : "Create coupon"}</button>
          {editing && <button className="btn btn-ghost btn-sm" onClick={cancel}>Cancel</button>}
        </div>
      </section>

      {!loading && items.length > 0 && <div className="card !p-0 overflow-x-auto"><table className="data w-full"><thead><tr>
        <th>Code</th><th>Type</th><th>Value</th><th>Used</th><th>Valid from</th><th>Valid until</th><th>Active</th><th className="text-right">Actions</th>
      </tr></thead><tbody>{items.map((c) => (
        <tr key={c.id}>
          <td className="font-mono text-xs">{c.code}{c.source === "campaign" && <span className="text-xs text-gray"> (auto)</span>}</td>
          <td>{c.type}</td><td>{c.value}{c.type === "percent" ? "%" : ""}</td><td>{c.used_count}/{c.max_uses || "∞"}</td>
          <td className="text-xs text-gray">{c.starts_at ? c.starts_at.slice(0, 16).replace("T", " ") : "—"}</td>
          <td className="text-xs text-gray">{c.ends_at ? c.ends_at.slice(0, 16).replace("T", " ") : "—"}</td>
          <td><button className={`badge ${c.is_active ? "badge-green" : "badge-gray"}`} onClick={() => toggle(c)}>{c.is_active ? "on" : "off"}</button></td>
          <td className="text-right whitespace-nowrap">
            <button className="btn btn-ghost btn-sm" onClick={() => edit(c)}>Edit</button>
            <button className="btn btn-ghost btn-sm" onClick={() => remove(c)}>Delete</button>
          </td>
        </tr>
      ))}</tbody></table></div>}
    </div>
  );
}
