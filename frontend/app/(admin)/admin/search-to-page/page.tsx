"use client";
import { useState } from "react";
import { api } from "@/lib/api";

export default function S2P() {
  const [kw, setKw] = useState("wholesale brass diya supplier Australia");
  const [out, setOut] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Search-to-Page</h1>
      <div className="card flex gap-2">
        <input className="input" value={kw} onChange={(e) => setKw(e.target.value)} />
        <button className="btn" onClick={async () => {
          setBusy(true);
          setMsg("");
          try { setOut(await api("/api/seo/search-to-page", { method: "POST", body: JSON.stringify({ keyword: kw }) })); }
          catch (e: any) { setMsg(String(e)); }
          finally { setBusy(false); }
        }} disabled={busy}>{busy ? "Analysing…" : "Analyse"}</button>
      </div>
      {msg && <p className="text-sm text-red-700">{msg}</p>}
      {out && <div className="card"><pre className="text-xs whitespace-pre-wrap">{JSON.stringify(out, null, 2)}</pre></div>}
    </div>
  );
}
