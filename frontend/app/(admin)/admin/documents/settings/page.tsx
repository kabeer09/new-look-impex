"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loading } from "@/components/public/States";

export default function DocumentSettingsPage() {
  const [c, setC] = useState<any>(null);
  const [msg, setMsg] = useState("");
  useEffect(() => { api<any>("/api/company-profile").then(setC).catch((e) => setMsg(String(e))); }, []);
  if (!c) return <Loading label="Loading settings…" />;
  const set = (k: string, v: string) => setC((x: any) => ({ ...x, [k]: v }));
  const save = async () => { setMsg(""); try { await api("/api/company-profile", { method: "PUT", body: JSON.stringify(c) }); setMsg("Settings saved."); } catch (e) { setMsg(String(e)); } };
  const prefixFields = [["prefix_quotation", "Quotation (NLI-QTN-YYYY-####)"], ["prefix_pi", "Proforma Invoice"], ["prefix_ci", "Commercial Invoice"], ["prefix_invoice", "Sales Invoice"]];
  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Document Settings</h1>
        <p className="text-sm text-gray mt-1">Numbering prefixes, default currency, validity and default terms.</p></div>
        <button className="btn btn-primary btn-sm" onClick={save}>Save</button></div>
      {msg && <p className="text-sm">{msg}</p>}
      <div className="card grid sm:grid-cols-2 gap-4">
        {prefixFields.map(([k, label]) => <label key={k} className="block"><span className="text-xs font-semibold">{label}</span><input className="input mt-1" value={c[k] || ""} onChange={(e) => set(k, e.target.value)} /></label>)}
        <label className="block"><span className="text-xs font-semibold">Default currency</span><select className="input mt-1" value={c.default_currency || "USD"} onChange={(e) => set("default_currency", e.target.value)}>{["USD", "EUR", "GBP", "AED", "SAR", "INR", "AUD", "CAD"].map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="block"><span className="text-xs font-semibold">Default validity (days)</span><input className="input mt-1" type="number" value={c.validity_days || 30} onChange={(e) => set("validity_days", e.target.value)} /></label>
        <label className="block sm:col-span-2"><span className="text-xs font-semibold">Default quotation terms</span><textarea rows={7} className="input mt-1" value={c.default_quote_terms || ""} onChange={(e) => set("default_quote_terms", e.target.value)} /></label>
        <label className="block sm:col-span-2"><span className="text-xs font-semibold">Default invoice terms</span><textarea rows={7} className="input mt-1" value={c.default_invoice_terms || ""} onChange={(e) => set("default_invoice_terms", e.target.value)} /></label>
      </div>
    </div>
  );
}
