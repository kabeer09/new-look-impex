"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loading, ErrorBox, EmptyState } from "@/components/public/States";

type Approval = { id: string; task_id: string; agent: string; kind: string; title: string; summary: string;
  previous: Record<string, unknown>; proposed: Record<string, unknown>; status: string; requested_by: string; created_at: string };

export default function ApprovalsPage() {
  const [items, setItems] = useState<Approval[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const load = useCallback(() => {
    api<{ items: Approval[] }>("/api/approvals?status=pending").then(d => setItems(d.items || []))
      .catch(e => setErr(String(e))).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function decide(id: string, action: "approve" | "reject") {
    setBusy(id); setErr("");
    try {
      await api(`/api/approvals/${id}/${action}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notes: action === "approve" ? "Approved in Approval Centre" : "Rejected" }) });
      load();
    } catch (e) { setErr(String(e)); }
    finally { setBusy(""); }
  }

  if (loading) return <Loading label="Loading approvals…" />;
  if (err) return <ErrorBox error={err} retry={load} />;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">New Look Impex · Governance</p>
        <h1 className="page-title mt-1">Approval Centre</h1>
        <p className="page-subtitle">One queue for every pending agent change. Nothing is published before you approve it.</p>
      </div>
      {!items.length && <EmptyState title="Nothing awaiting approval" hint="Ask an agent to make a change; it will appear here." />}
      <div className="grid gap-4 xl:grid-cols-2">
        {items.map(a => (
          <article key={a.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-clay">{a.kind} · {a.agent}</p>
                <h2 className="mt-1 font-serif text-lg text-espresso">{a.title}</h2>
              </div>
              <span className="badge badge-gray">{a.status}</span>
            </div>
            {a.summary && <p className="mt-2 text-sm text-gray">{a.summary}</p>}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wide text-gray">Before</p>
                <pre className="max-h-48 overflow-auto rounded bg-ivory p-2 text-[11px] text-gray">{JSON.stringify(a.previous, null, 2)}</pre>
              </div>
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wide text-clay">Proposed</p>
                <pre className="max-h-48 overflow-auto rounded bg-ivory p-2 text-[11px] text-espresso">{JSON.stringify(a.proposed, null, 2)}</pre>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-clay/15 pt-4">
              <span className="text-xs text-gray">{a.requested_by} · {a.created_at}</span>
              <div className="flex gap-2">
                <button onClick={() => decide(a.id, "reject")} disabled={busy === a.id} className="btn btn-ghost btn-sm">Reject</button>
                <button onClick={() => decide(a.id, "approve")} disabled={busy === a.id} className="btn btn-primary btn-sm">Approve & publish</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
