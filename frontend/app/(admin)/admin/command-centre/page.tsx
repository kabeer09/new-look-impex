"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type Agent = { key: string; name: string; role: string; color: string; enabled: boolean; runs: number; tools: string[] };
type ActionItem = { tool: string; status: string; approval_id?: string; error?: string; preview?: boolean; message?: string };
type AgentResult = { agent: string; name: string; reply: string; actions: ActionItem[] };
type Task = { id: string; request: string; status: string; agents: string[]; created_at: string };
type Approval = { id: string; title: string; kind: string; agent: string; status: string; proposed: Record<string, unknown>; previous: Record<string, unknown>; created_at: string };
type Msg = { role: "user" | "assistant"; text: string; agents?: AgentResult[]; approvals?: string[] };

const KPI = (label: string, value: unknown, hint = "") => (
  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
    <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">{label}</p>
    <p className="mt-2 font-serif text-2xl text-white">{String(value ?? 0)}</p>
    {hint && <p className="mt-1 text-[10px] text-white/40">{hint}</p>}
  </div>
);

export default function CommandCentrePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [overview, setOverview] = useState<Record<string, any> | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    api<{ items: Agent[] }>("/api/agents").then(d => setAgents(d.items || [])).catch(() => undefined);
    api<{ items: Task[] }>("/api/ai/tasks?limit=20").then(d => setTasks(d.items || [])).catch(() => undefined);
    api<{ items: Approval[] }>("/api/approvals?status=pending").then(d => setApprovals(d.items || [])).catch(() => undefined);
    api<Record<string, any>>("/api/analytics/overview").then(setOverview).catch(() => undefined);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  async function send() {
    if (!input.trim() || busy) return;
    const text = input.trim();
    setBusy(true); setError(""); setInput("");
    setMessages(m => [...m, { role: "user", text }]);
    try {
      const r = await api<{ reply: string; agents: AgentResult[]; approvals: string[]; route: string[] }>("/api/ai/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, agents: selected.length ? selected : undefined }),
      });
      setMessages(m => [...m, { role: "assistant", text: r.reply, agents: r.agents, approvals: r.approvals }]);
      load();
    } catch (e) { setError(String(e)); }
    finally { setBusy(false); }
  }

  async function approve(id: string) {
    try {
      await api(`/api/approvals/${id}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      load();
      setMessages(m => m.map(x => ({ ...x, approvals: (x.approvals || []).filter(a => a !== id) })));
    } catch (e) { setError(String(e)); }
  }

  const site = overview?.site || {};
  const analytics = overview?.analytics || {};

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-[#0B192C] p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-inter text-[10px] uppercase tracking-[0.28em] text-[#B87333]">New Look Impex · Intelligence</p>
            <h1 className="mt-2 font-serif text-3xl text-white md:text-4xl">AI Command Centre</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/60">
              One chat to analyse, decide and improve the business. Agents use real data; consequential changes wait for your approval.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/agents" className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/80 hover:bg-white/10">All agents</Link>
            <Link href="/admin/approvals" className="rounded-lg border border-[#B87333]/40 px-3 py-2 text-xs text-[#E8C9A0] hover:bg-white/10">
              Approvals {approvals.length ? `(${approvals.length})` : ""}
            </Link>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {KPI("Products", site.published_products ?? 0, "published")}
          {KPI("Enquiries", site.enquiries ?? 0, "in CRM")}
          {KPI("RFQs", site.rfqs ?? 0)}
          {KPI("Search clicks", analytics.clicks ?? 0, "GSC, sample excluded")}
          {KPI("Impressions", analytics.impressions ?? 0)}
          {KPI("Pending approvals", approvals.length, "need your decision")}
        </div>
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        {/* Agent rail */}
        <aside className="rounded-xl border border-clay/20 bg-white p-4">
          <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-gray">Agents · click to scope chat</p>
          <div className="space-y-2">
            {agents.map(a => {
              const on = selected.includes(a.key);
              return (
                <button key={a.key} onClick={() => setSelected(s => on ? s.filter(k => k !== a.key) : [...s, a.key])}
                  className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${on ? "border-emerald bg-emerald/5" : "border-clay/15 hover:border-clay/40"}`}>
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: a.color }} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-espresso">{a.name}</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-gray">{a.role}</span>
                    <span className="mt-1 block text-[10px] text-clay">{a.runs} steps</span>
                  </span>
                </button>
              );
            })}
          </div>
          {selected.length > 0 && <button onClick={() => setSelected([])} className="mt-3 text-xs text-clay underline">Clear selection (auto-route)</button>}
        </aside>

        {/* Chat */}
        <section className="flex min-h-[560px] flex-col rounded-xl border border-clay/20 bg-white">
          <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
            {!messages.length && (
              <div className="rounded-xl border border-gold/25 bg-ivory p-5">
                <h2 className="font-serif text-xl text-espresso">What should we work on?</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    "Analyse my website SEO",
                    "Find copper bottle buyers in Australia",
                    "Prepare a landing page for brass handicrafts in Germany",
                    "Show all pending buyer enquiries",
                    "Give me a weekly business report",
                  ].map(s => <button key={s} onClick={() => setInput(s)} className="rounded-full border border-clay/25 px-3 py-1.5 text-xs text-gray hover:border-clay">{s}</button>)}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm ${m.role === "user" ? "bg-[#0B192C] text-white" : "border border-clay/15 bg-white text-charcoal"}`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                  {m.agents?.map((a, j) => (
                    <div key={j} className="mt-3 rounded-lg border border-gold/20 bg-ivory p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-clay">{a.name}</p>
                      {a.actions?.map((act, k) => (
                        <div key={k} className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono text-[11px]">{act.tool}</span>
                          <span className={act.status === "ok" ? "text-emerald-700" : "text-red-600"}>{act.status}</span>
                          {act.approval_id && !approvals.find(p => p.id === act.approval_id) && (
                            <button onClick={() => approve(act.approval_id!)} className="rounded bg-emerald px-2 py-1 text-[11px] font-semibold text-white">Approve & publish</button>
                          )}
                          {act.error && <span className="text-red-600">{act.error}</span>}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {busy && <p className="text-sm text-gray">Agents are working…</p>}
            <div ref={bottom} />
          </div>
          <div className="border-t border-clay/15 p-3">
            <div className="flex items-end gap-2">
              <textarea value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                rows={2} placeholder="Tell your AI team what to do…" className="input min-h-[48px] flex-1 resize-none" />
              <button onClick={send} disabled={busy || !input.trim()} className="btn btn-primary h-12 px-5 disabled:opacity-50">Send</button>
            </div>
          </div>
        </section>
      </div>

      {/* Activity */}
      <section className="rounded-xl border border-clay/20 bg-white p-5">
        <h2 className="font-serif text-lg text-espresso">Recent agent tasks</h2>
        {!tasks.length && <p className="mt-2 text-sm text-gray">No tasks yet.</p>}
        <div className="mt-3 overflow-x-auto">
          <table className="data w-full"><thead><tr><th>Request</th><th>Agents</th><th>Status</th><th>When</th></tr></thead>
            <tbody>{tasks.map(t => <tr key={t.id}>
              <td className="max-w-md truncate">{t.request}</td>
              <td>{t.agents.join(", ") || "—"}</td>
              <td><span className={`badge ${t.status === "done" ? "badge-green" : t.status === "failed" ? "badge-red" : "badge-gray"}`}>{t.status}</span></td>
              <td className="text-xs text-gray">{t.created_at}</td>
            </tr>)}</tbody></table>
        </div>
      </section>
    </div>
  );
}
