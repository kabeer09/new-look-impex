"use client";
import { useEffect, useState } from "react";
import { api, apiUpload } from "@/lib/api";
import { Loading } from "@/components/public/States";

export default function CompanyProfilePage() {
  const [c, setC] = useState<any>(null);
  const [msg, setMsg] = useState("");
  useEffect(() => { api<any>("/api/company-profile").then(setC).catch((e) => setMsg(String(e))); }, []);
  if (!c) return <Loading label="Loading company profile…" />;
  const set = (k: string, v: string) => setC((x: any) => ({ ...x, [k]: v }));
  const save = async () => { setMsg(""); try { await api("/api/company-profile", { method: "PUT", body: JSON.stringify(c) }); setMsg("Company profile saved."); } catch (e) { setMsg(String(e)); } };
  const uploadLogo = async (f: FileList | null) => {
    if (!f?.length) return;
    const fd = new FormData(); fd.append("file", f[0]);
    try { const r = await apiUpload<{ url: string }>("/api/company-profile/logo", fd); setC((x: any) => ({ ...x, logo_url: r.url })); setMsg("Logo saved."); } catch (e) { setMsg(String(e)); }
  };
  const field = (k: string) => ({ label: k.replace(/_/g, " ").replace(/^./, (x) => x.toUpperCase()),
    input: <input className="input mt-1" value={c[k] || ""} onChange={(e) => set(k, e.target.value)} /> });
  const fields = ["name", "contact_person", "address", "city", "state", "country", "postal_code", "email", "phone", "whatsapp", "website", "gstin", "iec", "bank_name", "account_holder", "account_number", "ifsc", "swift", "bank_address"];
  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Company Profile</h1>
        <p className="text-sm text-gray mt-1">Saved once, pre-filled into every quotation and invoice.</p></div>
        <button className="btn btn-primary btn-sm" onClick={save}>Save</button></div>
      {msg && <p className="text-sm">{msg}</p>}
      <div className="card flex items-end gap-4">
        {c.logo_url && <img src={c.logo_url} alt="Company logo" className="h-20 w-20 rounded border border-sand object-contain" />}
        <label className="block"><span className="text-xs font-semibold">Company logo (appears on PDFs)</span><input type="file" accept="image/*" className="block mt-1 text-xs" onChange={(e) => uploadLogo(e.target.files)} /></label>
      </div>
      <div className="card grid sm:grid-cols-2 gap-4">
        {fields.map((k) => { const f = field(k); return <label key={k} className="block"><span className="text-xs font-semibold">{f.label}</span>{f.input}</label>; })}
      </div>
    </div>
  );
}
