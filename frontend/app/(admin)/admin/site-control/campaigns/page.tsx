"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loading, ErrorBox } from "@/components/public/States";

type Campaign = {
  id?: number; code: string; name: string; short: string; emoji: string; percent: number;
  tagline: string; blurb: string; cta: string; image_url: string; starts_at: string; ends_at: string;
  is_active: boolean; sort_order: number;
};
const blank = (): Campaign => ({ code: "", name: "", short: "", emoji: "", percent: 10, tagline: "", blurb: "", cta: "", image_url: "", starts_at: "", ends_at: "", is_active: true, sort_order: 0 });
const toLocal = (v?: string) => v ? v.slice(0, 16) : "";

export default function CampaignManager() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [form, setForm] = useState<Campaign>(blank());
  const [editing, setEditing] = useState<number | null>(null);
  const [live, setLive] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    setLoading(true); setErr("");
    Promise.all([
      api<{ items: Campaign[] }>("/api/campaigns"),
      api<any>("/api/public/active-campaign").catch(() => null),
    ]).then(([c, a]) => { setItems(c.items || []); setLive(a); })
      .catch((e) => setErr(String(e))).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k: keyof Campaign, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const edit = (c: Campaign) => {
    setEditing(c.id || null);
    setForm({ ...c, starts_at: toLocal(c.starts_at), ends_at: toLocal(c.ends_at) });
  };
  const cancel = () => { setEditing(null); setForm(blank()); };
  const save = async () => {
    setMsg("");
    if (!form.code.trim() || !form.name.trim()) { setMsg("Code and name are required."); return; }
    const payload = { ...form, starts_at: form.starts_at || null, ends_at: form.ends_at || null };
    try {
      if (editing) await api(`/api/campaigns/${editing}`, { method: "PUT", body: JSON.stringify(payload) });
      else await api("/api/campaigns", { method: "POST", body: JSON.stringify(payload) });
      setMsg(editing ? "Campaign updated — live site refreshed." : "Campaign created — live site refreshed.");
      cancel(); load();
    } catch (e) { setMsg(String(e)); }
  };
  const remove = async (c: Campaign) => {
    if (!window.confirm(`Delete campaign ${c.code}?`)) return;
    try { await api(`/api/campaigns/${c.id}`, { method: "DELETE" }); setMsg("Campaign deleted."); load(); }
    catch (e) { setMsg(String(e)); }
  };
  const toggle = async (c: Campaign) => {
    try { await api(`/api/campaigns/${c.id}`, { method: "PUT", body: JSON.stringify({ is_active: !c.is_active }) }); load(); }
    catch (e) { setMsg(String(e)); }
  };

  const input = (label: string, k: keyof Campaign, type = "text") => (
    <label className="block"><span className="text-xs font-semibold text-navy">{label}</span>
      <input className="input mt-1" type={type} value={String(form[k] ?? "")} onChange={(e) => set(k, e.target.value)} /></label>
  );

  return (
    <div className="space-y-5 max-w-6xl">
      <div><Link href="/admin/site-control" className="link text-sm">← Site Control</Link>
        <h1 className="text-2xl font-bold mt-1">Sales &amp; Campaigns</h1>
        <p className="text-sm text-gray mt-1">Set a start and end date once — the sale turns on and off on the live site automatically.</p></div>

      {live && <div className="card bg-ivory">
        <p className="text-xs text-gray mb-1">Live on website right now</p>
        {live.code ? <p className="text-sm text-navy"><b>{live.emoji} {live.name}</b> — flat {live.percent}% off · code <b>{live.code}</b> · ends {live.ends_label}</p>
          : <p className="text-sm text-navy">No sale active right now.</p>}
        {live.next && <p className="text-xs text-gray mt-1">Next: {live.next.name} ({live.next.percent}%) starting {live.next.starts_at?.slice(0, 10)}</p>}
      </div>}
      {msg && <p className="text-sm">{msg}</p>}
      {err && <ErrorBox error={err} retry={load} />}
      {loading && <Loading label="Loading campaigns…" />}

      <section className="card">
        <h2 className="font-semibold text-navy mb-4">{editing ? "Edit campaign" : "New campaign"}</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {input("Code *", "code")}
          {input("Name *", "name")}
          {input("Short name", "short")}
          {input("Emoji", "emoji")}
          {input("Discount %", "percent", "number")}
          {input("Sort order", "sort_order", "number")}
          <label className="block sm:col-span-3"><span className="text-xs font-semibold text-navy">Tagline</span>
            <input className="input mt-1" value={form.tagline} onChange={(e) => set("tagline", e.target.value)} /></label>
          <label className="block sm:col-span-3"><span className="text-xs font-semibold text-navy">Description</span>
            <textarea rows={2} className="input mt-1" value={form.blurb} onChange={(e) => set("blurb", e.target.value)} /></label>
          {input("Button text", "cta")}
          {input("Banner image URL (optional)", "image_url")}
          <label className="block"><span className="text-xs font-semibold text-navy">Starts at</span>
            <input type="datetime-local" className="input mt-1" value={form.starts_at} onChange={(e) => set("starts_at", e.target.value)} /></label>
          <label className="block"><span className="text-xs font-semibold text-navy">Ends at</span>
            <input type="datetime-local" className="input mt-1" value={form.ends_at} onChange={(e) => set("ends_at", e.target.value)} /></label>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} /> Active</label>
        </div>
        <p className="text-xs text-gray mt-2">Leave dates empty for an always-on campaign. Only one active campaign is shown at a time.</p>
        <div className="flex gap-2 mt-4">
          <button className="btn btn-primary btn-sm" onClick={save}>{editing ? "Save changes" : "Create campaign"}</button>
          {editing && <button className="btn btn-ghost btn-sm" onClick={cancel}>Cancel</button>}
        </div>
      </section>

      {!loading && items.length > 0 && <div className="card !p-0 overflow-x-auto"><table className="data w-full"><thead><tr>
        <th>Code</th><th>Name</th><th>Discount</th><th>Starts</th><th>Ends</th><th>Active</th><th className="text-right">Actions</th>
      </tr></thead><tbody>{items.map((c) => (
        <tr key={c.id}>
          <td className="font-mono text-xs">{c.code}</td><td>{c.name}</td><td>{c.percent}%</td>
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
