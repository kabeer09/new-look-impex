"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function Keywords() {
  const [items, setItems] = useState<any[]>([]);
  const [kw, setKw] = useState("");
  const [country, setCountry] = useState("");
  const [msg, setMsg] = useState("");
  const load = () =>
    api<any>("/api/keywords?page_size=50")
      .then((d) => setItems(d.items || (Array.isArray(d) ? d : [])))
      .catch((e) => setMsg(String(e)));
  useEffect(() => {
    load();
  }, []);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Keywords</h1>
        <a className="btn btn-ghost btn-sm" href="/admin/overview">← Overview</a>
      </div>
      <div className="card flex gap-2 flex-wrap">
        <input className="input max-w-xs" placeholder="New keyword e.g. Brass urli wholesale" value={kw} onChange={(e) => setKw(e.target.value)} />
        <input className="input max-w-[180px]" placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
        <button className="btn" onClick={async () => {
          try { await api("/api/keywords", { method: "POST", body: JSON.stringify({ keyword: kw, country }) }); setKw(""); load(); setMsg("Saved + scored + recommendation generated."); }
          catch (e: any) { setMsg(String(e)); }
        }}>Add &amp; score</button>
        <button className="btn-ghost" onClick={async () => {
          try { const r = await api<any>("/api/keywords/discover", { method: "POST", body: JSON.stringify({}) }); setMsg(JSON.stringify(r)); load(); }
          catch (e: any) { setMsg(String(e)); }
        }}>Load seed keywords</button>
      </div>
      {msg && <p className="text-sm">{msg}</p>}
      <div className="card">{items.length === 0 ? <p className="text-sm">No keywords yet.</p> :
        <table className="data"><thead><tr><th>Keyword</th><th>Country</th><th>Intent</th><th>Score</th><th>Clicks/Impr</th></tr></thead>
        <tbody>{items.map((k: any) => <tr key={k.id}><td>{k.keyword}</td><td>{k.country || "—"}</td><td>{k.intent}</td><td><b>{k.opportunity_score}</b></td><td>{k.clicks ?? "—"}/{k.impressions ?? "—"}</td></tr>)}</tbody></table>}</div>
    </div>
  );
}
