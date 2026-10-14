"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function Opps() {
  const [items, setItems] = useState<any[]>([]);
  const [err, setErr] = useState("");
  useEffect(() => {
    api<any>("/api/keywords?page_size=100")
      .then((d) => setItems([...(d.items || d)].sort((a, b) => b.opportunity_score - a.opportunity_score)))
      .catch((e) => setErr(String(e)));
  }, []);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Keyword Opportunities</h1>
        <a className="btn btn-ghost btn-sm" href="/admin/keywords">Keywords →</a>
      </div>
      <p className="text-sm text-gray">Transparent scoring — open a row to see factors. Nulls mean unavailable, never invented.</p>
      {err && <p className="text-sm text-red-700">{err}</p>}
      <div className="space-y-2">
        {items.map((k: any) => (
          <details key={k.id} className="card">
            <summary className="cursor-pointer"><b>{k.opportunity_score}</b> — {k.keyword} <span className="badge">{k.intent}</span> <span className="badge">{k.country || "global"}</span></summary>
            <pre className="text-xs mt-2 whitespace-pre-wrap">{JSON.stringify(k.opportunity_factors, null, 2)}</pre>
          </details>
        ))}
        {items.length === 0 && <div className="card text-sm">No keywords yet.</div>}
      </div>
    </div>
  );
}
