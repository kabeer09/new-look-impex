"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Loading, ErrorBox, EmptyState } from "@/components/public/States";

type View = "chat" | "agents" | "tasks" | "messages" | "reports" | "monitoring" | "knowledge" | "settings";
type Agent = { key: string; name: string; role: string; color: string; tools: string[]; restrictions: string[]; report_status: string };
type Task = { id: string; title: string; agent: string; status: string; priority: string; approval_required: boolean; error: string };
type Msg = { role: string; content: string; actions: any[]; created_at: string };
type AgentMsg = { id: string; from: string; to: string; kind: string; subject: string; body: string; created_at: string };
type Report = { id: string; week: string; title: string; summary: string; pdf_filename: string };
type Overview = Record<string, any>;

const NAV: { key: View; label: string }[] = [
  { key: "chat", label: "Help Desk Chat" }, { key: "agents", label: "Agents" },
  { key: "tasks", label: "Tasks" }, { key: "messages", label: "Agent Messages" },
  { key: "reports", label: "Weekly Reports" }, { key: "monitoring", label: "Website Health" },
  { key: "knowledge", label: "Shared Knowledge" }, { key: "settings", label: "Settings" },
];

export default function HelpDeskPage() {
  const [view, setView] = useState<View>("chat");
  const [overview, setOverview] = useState<Overview>({});
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [agentMsgs, setAgentMsgs] = useState<AgentMsg[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [monitoring, setMonitoring] = useState<any[]>([]);
  const [knowledge, setKnowledge] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    api<Overview>("/api/helpdesk/overview").then(setOverview).catch(() => undefined);
    api<{ items: Agent[] }>("/api/helpdesk/agents").then(d => setAgents(d.items || [])).catch(() => undefined);
    api<{ items: Task[] }>("/api/helpdesk/tasks?limit=50").then(d => setTasks(d.items || [])).catch(() => undefined);
    api<{ items: AgentMsg[] }>("/api/helpdesk/messages?limit=50").then(d => setAgentMsgs(d.items || [])).catch(() => undefined);
    api<{ items: Report[] }>("/api/helpdesk/reports").then(d => setReports(d.items || [])).catch(() => undefined);
    api<{ items: any[] }>("/api/helpdesk/monitoring").then(d => setMonitoring(d.items || [])).catch(() => undefined);
    api<{ items: any[] }>("/api/helpdesk/knowledge").then(d => setKnowledge(d.items || [])).catch(() => undefined);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  async function send() {
    if (!input.trim() || busy) return;
    const text = input.trim(); setInput(""); setBusy(true); setErr("");
    setMsgs(m => [...m, { role: "user", content: text, actions: [], created_at: "" }]);
    try {
      const r = await api<{ reply: string; actions: any[] }>("/api/helpdesk/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      setMsgs(m => [...m, { role: "assistant", content: r.reply, actions: r.actions || [], created_at: "" }]);
      load();
    } catch (e) { setErr(String(e)); }
    finally { setBusy(false); }
  }

  async function action(path: string, body: any = {}) {
    try { await api(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); load(); }
    catch (e) { setErr(String(e)); }
  }

  const KPI = ({ label, value }: { label: string; value: any }) => (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-[10px] uppercase tracking-widest text-white/50">{label}</p>
      <p className="mt-1 font-serif text-2xl text-white">{String(value ?? 0)}</p>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-[#0B192C] p-5 md:p-7">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#B87333]">New Look Impex · Operations</p>
        <h1 className="mt-2 font-serif text-3xl text-white">AI Help Desk Manager</h1>
        <p className="mt-1 max-w-2xl text-sm text-white/60">Chief coordinator for all eight AI agents. Real tasks, real messages, approval-gated publishing.</p>
        <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-8">
          <KPI label="Agents" value={overview.agents} /><KPI label="Active tasks" value={overview.active_tasks} />
          <KPI label="Completed" value={overview.completed_tasks} /><KPI label="Failed" value={overview.failed_tasks} />
          <KPI label="Approvals" value={overview.pending_approvals} /><KPI label="Agent messages" value={overview.agent_messages} />
          <KPI label="Collaborations" value={overview.collaborations} /><KPI label="Week" value={overview.week} />
        </div>
      </div>

      {err && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</p>}

      <div className="flex flex-wrap gap-2">
        {NAV.map(n => <button key={n.key} onClick={() => setView(n.key)}
          className={`rounded-lg px-3 py-2 text-xs font-semibold ${view === n.key ? "bg-navy text-white" : "border border-clay/25 text-gray hover:border-clay"}`}>{n.label}</button>)}
        <Link href="/admin/approvals" className="ml-auto rounded-lg border border-[#B87333]/40 px-3 py-2 text-xs text-clay">Open Approval Centre →</Link>
      </div>

      {view === "chat" && (
        <div className="rounded-xl border border-clay/20 bg-white">
          <div className="h-[460px] space-y-3 overflow-y-auto p-4 md:p-6">
            {!msgs.length && (
              <div className="rounded-xl border border-gold/25 bg-ivory p-5">
                <h2 className="font-serif text-xl text-espresso">What should the Help Desk coordinate?</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["Ask all agents to analyse my business", "Ask SEO and Export Intelligence to collaborate on Australia", "Give me this week's complete business report", "Ask Website Manager to check all website pages", "Which agents are waiting for my approval?"].map(s =>
                    <button key={s} onClick={() => setInput(s)} className="rounded-full border border-clay/25 px-3 py-1.5 text-xs text-gray hover:border-clay">{s}</button>)}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm ${m.role === "user" ? "bg-navy text-white" : "border border-clay/15 bg-white"}`}>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.actions?.length > 0 && <pre className="mt-2 max-h-40 overflow-auto rounded bg-ivory p-2 text-[11px]">{JSON.stringify(m.actions, null, 2)}</pre>}
                </div>
              </div>
            ))}
            {busy && <p className="text-sm text-gray">Help Desk is coordinating agents…</p>}
            <div ref={bottom} />
          </div>
          <div className="border-t border-clay/15 p-3 flex gap-2">
            <textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={2} placeholder="Give an instruction to the Help Desk…" className="input min-h-[44px] flex-1 resize-none" />
            <button onClick={send} disabled={busy || !input.trim()} className="btn btn-primary h-11 px-5 disabled:opacity-50">Send</button>
          </div>
        </div>
      )}

      {view === "agents" && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {agents.map(a => <article key={a.key} className="card">
            <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: a.color }} /><h2 className="font-serif text-base text-espresso">{a.name}</h2></div>
            <p className="mt-1 text-xs text-gray">{a.role}</p>
            <p className="mt-2 text-[11px] text-clay">This week's report: {a.report_status}</p>
          </article>)}
        </div>
      )}

      {view === "tasks" && (
        <div className="rounded-xl border border-clay/20 bg-white p-4">
          <div className="flex gap-2"><button onClick={() => action("/api/helpdesk/monitoring/run")} className="btn btn-ghost btn-sm">Run health check</button>
            <button onClick={() => action("/api/helpdesk/reports/generate", {})} className="btn btn-primary btn-sm">Generate weekly report</button></div>
          {!tasks.length ? <p className="mt-3 text-sm text-gray">No tasks yet.</p> : <table className="data mt-3 w-full"><thead><tr><th>Title</th><th>Agent</th><th>Status</th><th>Priority</th><th>Approval</th></tr></thead>
            <tbody>{tasks.map(t => <tr key={t.id}><td>{t.title}</td><td>{t.agent}</td><td><span className="badge badge-gray">{t.status}</span></td><td>{t.priority}</td><td>{t.approval_required ? "Yes" : "No"}</td></tr>)}</tbody></table>}
        </div>
      )}

      {view === "messages" && (
        <div className="rounded-xl border border-clay/20 bg-white p-4">
          {!agentMsgs.length ? <EmptyState title="No agent messages yet" hint="Ask agents to collaborate and messages will appear here." /> :
            <div className="space-y-2">{agentMsgs.map(m => <div key={m.id} className="rounded-lg border border-clay/15 p-3 text-sm">
              <p className="text-[10px] uppercase tracking-wide text-clay">{m.from} → {m.to} · {m.kind}</p>
              <p className="font-semibold">{m.subject}</p><p className="mt-1 text-xs text-gray">{m.body.slice(0, 400)}</p></div>)}</div>}
        </div>
      )}

      {view === "reports" && (
        <div className="rounded-xl border border-clay/20 bg-white p-4">
          <button onClick={() => action("/api/helpdesk/reports/generate", {})} className="btn btn-primary btn-sm">Generate this week's report</button>
          {!reports.length ? <p className="mt-3 text-sm text-gray">No reports stored yet.</p> : <div className="mt-3 space-y-2">{reports.map(r => <div key={r.id} className="flex items-center justify-between rounded-lg border border-clay/15 p-3">
            <div><p className="font-semibold">{r.title}</p><p className="text-xs text-gray">{r.summary?.slice(0, 160)}</p></div>
            <div className="flex gap-2">{r.pdf_filename && <a className="btn btn-ghost btn-sm" href={`/api/helpdesk/reports/${r.id}/download`}>Download PDF</a>}</div>
          </div>)}</div>}
        </div>
      )}

      {view === "monitoring" && (
        <div className="rounded-xl border border-clay/20 bg-white p-4">
          <button onClick={() => action("/api/helpdesk/monitoring/run")} className="btn btn-primary btn-sm">Run check now</button>
          {!monitoring.length ? <p className="mt-3 text-sm text-gray">No checks yet.</p> : <table className="data mt-3 w-full"><thead><tr><th>Day</th><th>Check</th><th>Status</th></tr></thead>
            <tbody>{monitoring.slice(0, 30).map((m, i) => <tr key={i}><td>{m.day}</td><td>{m.check}</td><td>{m.status}</td></tr>)}</tbody></table>}
        </div>
      )}

      {view === "knowledge" && (
        <div className="rounded-xl border border-clay/20 bg-white p-4">
          {!knowledge.length ? <EmptyState title="Shared knowledge is empty" hint="Add verified business facts through the API or admin." /> :
            <table className="data w-full"><thead><tr><th>Category</th><th>Key</th><th>Value</th><th>Verified</th></tr></thead>
            <tbody>{knowledge.map(k => <tr key={k.id}><td>{k.category}</td><td>{k.key}</td><td className="max-w-md truncate">{k.value}</td><td>{k.verified ? "Yes" : "No"}</td></tr>)}</tbody></table>}
        </div>
      )}

      {view === "settings" && (
        <div className="rounded-xl border border-clay/20 bg-white p-5">
          <h2 className="font-serif text-lg">Autonomy & permissions</h2>
          <ul className="mt-3 space-y-2 text-sm text-gray">
            <li><b>Level 1 (automatic):</b> research, SEO analysis, analytics, monitoring, drafts, internal messages.</li>
            <li><b>Level 2 (approval):</b> publishing, product changes, banners, campaigns, outbound email, pricing.</li>
            <li><b>Level 3 (restricted, always blocked):</b> deletions, financial/security/admin changes, destructive DB operations.</li>
          </ul>
          <Link href="/admin/integrations" className="link mt-4 inline-block">Manage integrations →</Link>
        </div>
      )}
    </div>
  );
}
