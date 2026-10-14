"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function Content() {
  const [kind, setKind] = useState("product_description");
  const [keyword, setKeyword] = useState("Brass urli wholesale");
  const [out, setOut] = useState<any>(null);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api<any>("/api/content/drafts").then(setDrafts).catch(() => {}); }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Content Studio</h1>
      <p className="text-sm text-gray">Drafts only — never auto-published. Edit before use; no fabricated claims.</p>
      <div className="card flex gap-2 flex-wrap">
        <input className="input max-w-[200px]" value={kind} onChange={(e) => setKind(e.target.value)} />
        <input className="input max-w-xs" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        <button className="btn" disabled={busy} onClick={async () => {
          setBusy(true);
          try { setOut(await api("/api/content/generate", { method: "POST", body: JSON.stringify({ kind, keyword, product: keyword }) })); }
          finally { setBusy(false); }
        }}>{busy ? "Generating…" : "Generate draft"}</button>
      </div>
      {out && <div className="card"><p className="text-xs">Source: {out.source}</p><pre className="text-sm whitespace-pre-wrap mt-2">{out.draft}</pre></div>}
      <div className="card">
        <h2 className="font-semibold">Drafts</h2>
        {drafts.map((d: any) => <div key={d.id} className="text-sm py-1">#{d.id} {d.title} <span className="badge">{d.status}</span></div>)}
        {drafts.length === 0 && <p className="text-sm">No drafts.</p>}
      </div>
    </div>
  );
}
