"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function Recs() {
  const [items, setItems] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const load = () => api<any>("/api/seo/recommendations?page_size=50").then((d) => setItems(d.items || [])).catch((e) => setMsg(String(e)));
  useEffect(() => { load(); }, []);
  const act = async (id: number, a: string) => {
    try { await api(`/api/seo/recommendations/${id}/${a}`, { method: "POST" }); setMsg(`${a} ok`); load(); }
    catch (e: any) { setMsg(String(e)); }
  };
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Recommendations</h1>
      <p className="text-sm text-gray">Approval required before publishing significant changes.</p>
      {msg && <p className="text-sm">{msg}</p>}
      {items.map((r: any) => (
        <div key={r.id} className="card">
          <div className="flex justify-between gap-2 flex-wrap"><b>{r.title}</b><span className="badge">{r.status}</span></div>
          <p className="text-sm mt-1">{r.explanation}</p>
          <p className="text-xs text-gray mt-1">Evidence: {r.evidence}</p>
          <p className="text-xs mt-1">Benefit: {r.expected_benefit} · Confidence {r.confidence} · Priority {r.priority} · Effort {r.effort}</p>
          <p className="text-xs text-gray">Risks: {r.risks}</p>
          <div className="flex gap-2 mt-2">
            <button className="btn btn-sm" onClick={() => act(r.id, "approve")}>Approve</button>
            <button className="btn btn-ghost btn-sm" onClick={() => act(r.id, "reject")}>Reject</button>
            <button className="btn btn-ghost btn-sm" onClick={() => act(r.id, "publish")}>Publish</button>
            <button className="btn btn-ghost btn-sm" onClick={() => act(r.id, "rollback")}>Rollback</button>
          </div>
        </div>
      ))}
      {items.length === 0 && <div className="card text-sm">No recommendations yet — add keywords or run an audit.</div>}
    </div>
  );
}
