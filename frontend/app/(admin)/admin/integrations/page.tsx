"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function Integ() {
  const [s, setS] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { api("/api/integrations/status").then(setS).catch((e) => setMsg(String(e))); }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Google Integrations</h1>
      {msg && <p className="text-sm">{msg}</p>}
      <div className="card">
        <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(s, null, 2) || "Loading…"}</pre>
        <button className="btn mt-2" disabled={busy} onClick={async () => {
          setBusy(true);
          try { const r = await api<any>("/api/integrations/google/search-console/connect", { method: "POST" }); window.open(r.auth_url, "_blank"); }
          catch (e: any) { setMsg(String(e)); }
          finally { setBusy(false); }
        }}>Connect Search Console</button>
        <p className="text-xs text-gray mt-2">Setup: Google Cloud → enable Search Console API → OAuth consent → redirect URI → verified property. Full guide in docs/google-setup.md. Analytics Data API note: GA cannot reveal every visitor keyword.</p>
      </div>
    </div>
  );
}
