"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Loading, ErrorBox, EmptyState } from "@/components/public/States";

type View = "overview" | "seo" | "keywords" | "tasks" | "reports" | "changes" | "schedules" | "integrations";
type Status = {
  worker_id: string; running: boolean; heartbeat: string | null; heartbeat_age_seconds: number | null;
  emergency_stop: boolean; queued_tasks: number; running_tasks: number; gsc_configured: boolean;
  ga4_configured: boolean; open_issues: number;
  agents: { agent: string; paused: boolean; status: string; completed: number; failed: number }[];
};
type Keyword = { keyword: string; source: string; clicks: number; impressions: number; ctr: string; position: string; target_url: string; status: string; intent: string };
type Task = { id: string; title: string; agent: string; status: string; priority: string; approval_required: boolean };
type Report = { id: string; week: string; title: string; summary: string; pdf_filename: string };
type Change = { id: string; kind: string; target: string; status: string; verification: string };
type Issue = { id: string; kind: string; severity: string; subject: string; evidence: string; agent: string; task_id: string };
type Schedule = { key: string; cadence: string; description: string; enabled: boolean; day: string; time: string; timezone: string };
type Integration = { name: string; configured: boolean; status: string; property: string; note: string };
type Analysis = Record<string, any>;

const NAV: { key: View; label: string }[] = [
  { key: "overview", label: "Overview" }, { key: "seo", label: "SEO Growth" },
  { key: "keywords", label: "Keywords & Issues" }, { key: "tasks", label: "Task Queue" },
  { key: "reports", label: "Weekly Reports" }, { key: "changes", label: "Publishing & Rollback" },
  { key: "schedules", label: "Schedules" }, { key: "integrations", label: "Integrations" },
];

export default function GrowthPage() {
  const [view, setView] = useState<View>("overview");
  const [status, setStatus] = useState<Status>({} as Status);
  const [agents, setAgents] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [changes, setChanges] = useState<Change[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [analysis, setAnalysis] = useState<Analysis>({});
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    api<Status>("/api/growth/status").then(setStatus).catch((e) => setErr(String(e)));
    api<{ items: any[] }>("/api/helpdesk/agents").then((d) => setAgents(d.items || [])).catch(() => undefined);
    api<{ items: Keyword[] }>("/api/growth/keywords?limit=60").then((d) => setKeywords(d.items || [])).catch(() => undefined);
    api<{ items: Issue[] }>("/api/growth/issues").then((d) => setIssues(d.items || [])).catch(() => undefined);
    api<{ items: Task[] }>("/api/growth/status").then(() => undefined).catch(() => undefined);
    api<{ items: Task[] }>("/api/helpdesk/tasks?limit=50").then((d) => setTasks(d.items || [])).catch(() => undefined);
    api<{ items: Report[] }>("/api/growth/reports").then((d) => setReports(d.items || [])).catch(() => undefined);
    api<{ items: Change[] }>("/api/growth/changes").then((d) => setChanges(d.items || [])).catch(() => undefined);
    api<{ items: Schedule[] }>("/api/growth/schedules").then((d) => setSchedules(d.items || [])).catch(() => undefined);
    api<{ items: Integration[] }>("/api/growth/integrations").then((d) => setIntegrations(d.items || [])).catch(() => undefined);
    api<Analysis>("/api/growth/seo/analysis").then(setAnalysis).catch(() => undefined);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function post(path: string, body: any = {}) {
    setMsg(""); setErr("");
    try {
      const r = await api<any>(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setMsg(typeof r === "object" ? JSON.stringify(r).slice(0, 220) : String(r));
      load();
    } catch (e) { setErr(String(e)); }
  }

  const KPI = ({ label, value, bad }: { label: string; value: any; bad?: boolean }) => (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-[10px] uppercase tracking-widest text-white/50">{label}</p>
      <p className={`mt-1 font-serif text-2xl ${bad ? "text-[#E9A58A]" : "text-white"}`}>{String(value ?? "—")}</p>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-[#0B192C] p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#B87333]">New Look Impex · 24/7 Autonomous Growth</p>
            <h1 className="mt-2 font-serif text-3xl text-white">AI Growth Command Centre</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/60">Persistent worker, real Search Console data, approval-gated changes and a weekly growth report.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/helpdesk" className="rounded-lg border border-white/20 px-3 py-2 text-xs text-white/80">Help Desk →</Link>
            <button onClick={() => post("/api/growth/emergency-stop", { on: !status.emergency_stop })}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${status.emergency_stop ? "bg-[#B87333] text-white" : "border border-red-300/40 text-red-200"}`}>
              {status.emergency_stop ? "Resume all agents" : "Emergency stop"}
            </button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
          <KPI label="Worker" value={status.running ? (status.emergency_stop ? "PAUSED" : "RUNNING") : "OFFLINE"} bad={!status.running || status.emergency_stop} />
          <KPI label="Heartbeat" value={status.heartbeat_age_seconds === null ? "—" : `${status.heartbeat_age_seconds}s ago`} bad={(status.heartbeat_age_seconds ?? 999) > 120} />
          <KPI label="Queued tasks" value={status.queued_tasks} />
          <KPI label="Open issues" value={status.open_issues} bad={(status.open_issues ?? 0) > 0} />
          <KPI label="GSC data" value={status.gsc_configured ? "CONNECTED" : "NOT CONNECTED"} bad={!status.gsc_configured} />
          <KPI label="GA4 data" value={status.ga4_configured ? "CONNECTED" : "UNAVAILABLE"} bad={!status.ga4_configured} />
        </div>
      </div>

      {msg && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{msg}</p>}
      {err && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</p>}

      <div className="flex flex-wrap gap-2">
        {NAV.map((n) => <button key={n.key} onClick={() => setView(n.key)}
          className={`rounded-lg px-3 py-2 text-xs font-semibold ${view === n.key ? "bg-navy text-white" : "border border-clay/25 text-gray hover:border-clay"}`}>{n.label}</button>)}
        <Link href="/admin/approvals" className="ml-auto rounded-lg border border-[#B87333]/40 px-3 py-2 text-xs text-clay">Approval Centre →</Link>
      </div>

      {view === "overview" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-clay/20 bg-white p-4">
            <h2 className="font-serif text-lg text-espresso">Eight agents</h2>
            <div className="mt-3 space-y-2">
              {agents.map((a) => {
                const live = (status.agents || []).find((s) => s.agent === a.key);
                return <div key={a.key} className="flex items-center justify-between rounded-lg border border-clay/15 p-3">
                  <div><p className="text-sm font-semibold">{a.name}</p><p className="text-[11px] text-gray">{a.role?.slice(0, 90)}</p></div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${live?.paused ? "badge-gray" : "badge-green"}`}>{live?.paused ? "PAUSED" : "ACTIVE"}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => post(`/api/growth/agents/${a.key}/pause`, { paused: !live?.paused })}>
                      {live?.paused ? "Resume" : "Pause"}
                    </button>
                  </div>
                </div>;
              })}
            </div>
          </section>
          <section className="space-y-4">
            <div className="rounded-xl border border-clay/20 bg-white p-4">
              <h2 className="font-serif text-lg">Manual jobs (headless)</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {schedules.map((s) => <button key={s.key} className="btn btn-primary btn-sm" onClick={() => post(`/api/growth/jobs/${s.key}/run`, { force: true })}>Run {s.key.replaceAll("_", " ")}</button>)}
              </div>
            </div>
            <div className="rounded-xl border border-clay/20 bg-white p-4">
              <h2 className="font-serif text-lg">Latest issues</h2>
              {!issues.length ? <p className="mt-2 text-sm text-gray">No open issues detected.</p> :
                <ul className="mt-2 space-y-1 text-xs text-gray">{issues.slice(0, 8).map((i) => <li key={i.id}><b>{i.kind}</b> — {i.subject}</li>)}</ul>}
            </div>
          </section>
        </div>
      )}

      {view === "seo" && (
        <div className="rounded-xl border border-clay/20 bg-white p-4">
          <h2 className="font-serif text-lg">Google SEO growth (real data)</h2>
          {!analysis.has_data && <p className="mt-2 rounded bg-ivory p-3 text-xs text-gray">{analysis.note}</p>}
          {analysis.has_data && <>
            <p className="mt-2 text-sm">Clicks: <b>{analysis.totals?.clicks}</b> · Impressions: <b>{analysis.totals?.impressions}</b> · Queries: <b>{analysis.totals?.queries}</b></p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[["Top keywords", analysis.top], ["Low CTR", analysis.low_ctr], ["Positions 5–30", analysis.positions_5_30]].map(([title, rows]: any) =>
                <div key={title as string}><h3 className="text-xs font-semibold uppercase tracking-wide text-clay">{title as string}</h3>
                  <ul className="mt-1 space-y-1 text-[11px] text-gray">{(rows || []).slice(0, 8).map((r: any) => <li key={r.keyword}>{r.keyword} — {r.clicks}/{r.impressions} · pos {r.position}</li>)}</ul>
                </div>)}
            </div>
          </>}
          <div className="mt-4 flex gap-2">
            <button className="btn btn-primary btn-sm" onClick={() => post("/api/growth/seo/sync", { days: 28 })}>Refresh keywords from GSC</button>
            <button className="btn btn-ghost btn-sm" onClick={() => post("/api/growth/seo/ga4-sync", { days: 28 })}>Sync GA4</button>
          </div>
        </div>
      )}

      {view === "keywords" && (
        <div className="rounded-xl border border-clay/20 bg-white p-4">
          <table className="data w-full"><thead><tr><th>Keyword</th><th>Source</th><th>Intent</th><th>Clicks</th><th>Impr.</th><th>Pos</th><th>Target</th><th>Status</th></tr></thead>
            <tbody>{keywords.map((k) => <tr key={k.keyword + k.source}>
              <td>{k.keyword}</td><td>{k.source}</td><td>{k.intent}</td><td>{k.clicks}</td><td>{k.impressions}</td><td>{k.position || "—"}</td>
              <td className="max-w-[180px] truncate">{k.target_url || "—"}</td><td>{k.status}</td></tr>)}</tbody></table>
          {!keywords.length && <EmptyState title="No keywords yet" hint="Run the weekly keyword job or connect Search Console." />}
        </div>
      )}

      {view === "tasks" && (
        <div className="rounded-xl border border-clay/20 bg-white p-4">
          <p className="mb-2 text-xs text-gray">Tasks are claimed by the persistent worker with an exclusive lease; finished/failed tasks stay here.</p>
          <table className="data w-full"><thead><tr><th>Title</th><th>Agent</th><th>Status</th><th>Priority</th><th>Approval</th></tr></thead>
            <tbody>{tasks.map((t) => <tr key={t.id}><td>{t.title}</td><td>{t.agent}</td><td>{t.status}</td><td>{t.priority}</td><td>{t.approval_required ? "Yes" : "No"}</td></tr>)}</tbody></table>
        </div>
      )}

      {view === "reports" && (
        <div className="rounded-xl border border-clay/20 bg-white p-4">
          <button className="btn btn-primary btn-sm" onClick={() => post("/api/growth/reports/generate", {})}>Generate this week's growth report</button>
          <div className="mt-3 space-y-2">{reports.map((r) => <div key={r.id} className="flex items-center justify-between rounded-lg border border-clay/15 p-3">
            <div><p className="font-semibold">{r.title}</p><p className="text-xs text-gray">{r.summary?.slice(0, 180)}</p></div>
            {r.pdf_filename && <a className="btn btn-ghost btn-sm" href={`/api/growth/reports/${r.id}/download`}>Download PDF</a>}
          </div>)}</div>
        </div>
      )}

      {view === "changes" && (
        <div className="rounded-xl border border-clay/20 bg-white p-4">
          <p className="mb-2 text-xs text-gray">Every approved change records before/after and can be rolled back. Verification is explicit, not assumed.</p>
          <table className="data w-full"><thead><tr><th>Kind</th><th>Target</th><th>Status</th><th>Verification</th><th>Rollback</th></tr></thead>
            <tbody>{changes.map((c) => <tr key={c.id}><td>{c.kind}</td><td>{c.target}</td><td>{c.status}</td><td>{c.verification || "—"}</td>
              <td>{c.status === "rolled_back" ? "—" : <button className="btn btn-ghost btn-sm" onClick={() => post(`/api/growth/changes/${c.id}/rollback`, {})}>Rollback</button>}</td></tr>)}</tbody></table>
          {!changes.length && <EmptyState title="No published changes yet" hint="Changes approved in the Approval Centre appear here with rollback control." />}
        </div>
      )}

      {view === "schedules" && (
        <div className="rounded-xl border border-clay/20 bg-white p-4">
          <table className="data w-full"><thead><tr><th>Job</th><th>Cadence</th><th>Time (IST)</th><th>Enabled</th><th>Run now</th></tr></thead>
            <tbody>{schedules.map((s) => <tr key={s.key}><td>{s.description}</td><td>{s.cadence}</td><td>{s.time || "—"}</td>
              <td><input type="checkbox" checked={s.enabled} onChange={(e) => post(`/api/growth/schedules/${s.key}`, { enabled: e.target.checked })} /></td>
              <td><button className="btn btn-ghost btn-sm" onClick={() => post(`/api/growth/jobs/${s.key}/run`, { force: true })}>Run</button></td></tr>)}</tbody></table>
        </div>
      )}

      {view === "integrations" && (
        <div className="rounded-xl border border-clay/20 bg-white p-4">
          <div className="space-y-2">{integrations.map((i) => <div key={i.name} className="rounded-lg border border-clay/15 p-3">
            <div className="flex justify-between"><b>{i.name}</b><span className={`badge ${i.configured ? "badge-green" : "badge-gray"}`}>{i.configured ? "CONNECTED" : "UNAVAILABLE"}</span></div>
            <p className="text-xs text-gray">{i.note}</p></div>)}</div>
          <Link href="/admin/integrations" className="link mt-4 inline-block">Manage Google integration →</Link>
        </div>
      )}
    </div>
  );
}
