"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loading } from "@/components/public/States";

export default function QuotationSettingsPage() {
  const [form, setForm] = useState<any>(null);
  const [msg, setMsg] = useState("");
  useEffect(() => { api<any>("/api/quotation-settings").then(setForm).catch((e) => setMsg(String(e))); }, []);
  const save = async () => {
    setMsg("");
    try { await api("/api/quotation-settings", { method: "PUT", body: JSON.stringify(form) }); setMsg("Settings saved."); }
    catch (e) { setMsg(String(e)); }
  };
  if (!form) return <Loading label="Loading settings…" />;
  const f = (k: string, label: string, area = false) => (
    <label className="block"><span className="text-xs font-semibold capitalize">{label}</span>
      {area ? <textarea rows={8} className="input mt-1" value={form[k] || ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
             : <input className="input mt-1" value={form[k] || ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />}</label>
  );
  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Quotation Settings</h1>
        <p className="text-sm text-gray mt-1">Exporter defaults and default Terms & Conditions pre-filled into new quotations.</p></div>
        <button className="btn btn-primary btn-sm" onClick={save}>Save</button></div>
      {msg && <p className="text-sm">{msg}</p>}
      <div className="card grid sm:grid-cols-2 gap-4">
        {f("company_name", "Company name")}{f("contact_person", "Contact person")}
        {f("email", "Email")}{f("phone", "Phone")}
        {f("whatsapp", "WhatsApp")}{f("website", "Website")}
        {f("gstin", "GSTIN")}{f("iec", "IEC number")}
        {f("address", "Address", true)}
        <label className="block"><span className="text-xs font-semibold">Default currency</span>
          <select className="input mt-1" value={form.default_currency || "USD"} onChange={(e) => setForm({ ...form, default_currency: e.target.value })}>
            {["USD", "EUR", "GBP", "AED", "SAR", "INR"].map((c) => <option key={c}>{c}</option>)}
          </select></label>
        <label className="block"><span className="text-xs font-semibold">Validity (days)</span>
          <input className="input mt-1" type="number" value={form.validity_days || 30} onChange={(e) => setForm({ ...form, validity_days: e.target.value })} /></label>
        <div className="sm:col-span-2">{f("default_terms", "Default Terms & Conditions", true)}</div>
      </div>
    </div>
  );
}
