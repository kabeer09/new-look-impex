"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function Audits() {
  const [items, setItems] = useState<any[]>([]);
  const [url, setUrl] = useState("https://newlookimpex.example/");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => api<any>("/api/seo/audits").then((d) => setItems(d.items || [])).catch((e) => setMsg(String(e)));
  useEffect(() => { load(); }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">SEO Audits</h1>
      <div className="card flex gap-2">
        <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button className="btn" disabled={busy} onClick={async () => {
          setBusy(true); setMsg("");
          try { await api("/api/seo/audits/run", { method: "POST", body: JSON.stringify({ url }) }); load(); }
          catch (e: any) { setMsg(String(e)); }
          finally { setBusy(false); }
        }}>{busy ? "Running…" : "Run audit"}</button>
      </div>
      {msg && <p className="text-sm">{msg}</p>}
      {items.map((a: any) => (
        <div key={a.id} className="card">
          <b>Audit #{a.id}</b> — {a.url} — score {a.score ?? "unavailable"}
          <ul className="text-sm list-disc ml-5">{a.issues.map((i: any, j: number) => <li key={j}>[{i.severity}] {i.message}</li>)}</ul>
        </div>
      ))}
      {items.length === 0 && <div className="card text-sm">No audits yet.</div>}
    </div>
  );
}
