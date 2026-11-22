"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { AutomationRun, AutomationStatus } from "@/lib/types";
import { Loading, ErrorBox } from "@/components/public/States";

function Dot({ on }: { on: boolean }) {
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full mr-2 ${on ? "bg-emerald-600" : "bg-amber-500"}`}
      aria-hidden
    />
  );
}

function StatusCard({
  title,
  configured,
  note,
  children,
}: {
  title: string;
  configured: boolean;
  note: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif font-bold text-navy text-lg">{title}</h2>
        <span
          className={`text-xs font-semibold px-2 py-1 rounded ${
            configured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          {configured ? "Configured" : "Not configured"}
        </span>
      </div>
      <p className="text-sm text-gray mt-2 flex items-start">
        <Dot on={configured} />
        <span>{note}</span>
      </p>
      {children}
    </div>
  );
}

function Runs({ label, runs }: { label: string; runs: AutomationRun[] }) {
  if (!runs.length) return <p className="text-xs text-gray mt-3">{label}: no runs yet.</p>;
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-navy mb-1">{label}</p>
      <ul className="space-y-1">
        {runs.map((r, i) => (
          <li key={i} className="text-xs text-gray flex flex-wrap gap-x-2">
            <span
              className={r.status === "success" ? "text-emerald-700 font-semibold" : "text-red-700 font-semibold"}
            >
              {r.status}
            </span>
            <span className="break-all">{r.detail}</span>
            {r.at && <span className="text-clay/70">{new Date(r.at).toLocaleString()}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Automation() {
  const [s, setS] = useState<AutomationStatus | null>(null);
  const [files, setFiles] = useState<{ file: string; path: string }[]>([]);
  const [toggles, setToggles] = useState<{ rfq_followup: boolean; campaign_mailer: boolean }>({ rfq_followup: true, campaign_mailer: true });
  const [runResult, setRunResult] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    setErr("");
    api<AutomationStatus>("/api/automation/status")
      .then(setS)
      .catch((e) => setErr(String(e)));
    api<{ workflows: { file: string; path: string }[] }>("/api/automation/workflows")
      .then((d) => setFiles(d.workflows || []))
      .catch(() => setFiles([]));
    api<{ rfq_followup: boolean; campaign_mailer: boolean }>("/api/automation/settings")
      .then(setToggles)
      .catch(() => undefined);
  }, []);

  const saveToggles = async () => {
    try {
      await api("/api/automation/settings", { method: "PUT", body: JSON.stringify(toggles) });
      setRunResult("Automation settings saved.");
    } catch (e) { setRunResult(String(e)); }
  };

  const runNow = async (kind: "rfq_followup" | "campaign_mailer") => {
    setRunResult(`Running ${kind}…`);
    try {
      const r = await api<any>(`/api/automation/run/${kind}`, { method: "POST" });
      setRunResult(`${kind}: ${JSON.stringify(r)}`);
    } catch (e) { setRunResult(`${kind} failed: ${String(e)}`); }
  };

  useEffect(() => {
    load();
  }, [load]);

  if (err) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Automation</h1>
        <ErrorBox error={err} retry={load} />
      </div>
    );
  }
  if (!s) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Automation</h1>
        <Loading label="Loading automation status…" />
      </div>
    );
  }

  const f = s.rfq_followup;
  const c = s.campaign_mailer;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Automation</h1>
        <button className="btn text-sm" onClick={load}>
          Refresh
        </button>
      </div>

      <div className="card">
        <h2 className="font-serif font-bold text-navy text-lg">Automation controls</h2>
        <p className="text-sm text-gray mt-1">Switch tasks on or off, or run one now. Nothing is sent when email is not configured.</p>
        <div className="flex flex-wrap items-center gap-6 mt-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={toggles.rfq_followup}
              onChange={(e) => setToggles({ ...toggles, rfq_followup: e.target.checked })} />
            Abandoned RFQ follow-up
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={toggles.campaign_mailer}
              onChange={(e) => setToggles({ ...toggles, campaign_mailer: e.target.checked })} />
            Seasonal campaign mailer
          </label>
          <button className="btn btn-primary btn-sm" onClick={saveToggles}>Save settings</button>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <button className="btn btn-outline btn-sm" onClick={() => runNow("rfq_followup")}>Run RFQ follow-up now</button>
          <button className="btn btn-outline btn-sm" onClick={() => runNow("campaign_mailer")}>Run campaign mailer now</button>
        </div>
        {runResult && <p className="text-xs text-gray mt-3 break-all">{runResult}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatusCard title="Email (SMTP)" configured={s.email.configured} note={s.email.note} />
        <StatusCard title="AI (LLM)" configured={s.llm.configured} note={s.llm.note}>
          {s.llm.model && <p className="text-xs text-gray mt-1">Model: {s.llm.model}</p>}
        </StatusCard>
        <StatusCard title="Spam check (Turnstile)" configured={s.turnstile.configured} note={s.turnstile.note} />
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif font-bold text-navy text-lg">
            Abandoned RFQ follow-up
          </h2>
          <Link className="link text-sm" href="/admin/rfqs">
            Manage drafts
          </Link>
        </div>
        <p className="text-sm text-gray mt-2">{f.note}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          {[
            ["Checks every", `${f.interval_hours}h`],
            ["Open drafts", String(f.open_drafts)],
            ["Eligible now", String(f.eligible_now)],
            ["Follow-ups sent", String(f.followups_sent)],
          ].map(([label, value]) => (
            <div key={label} className="bg-ivory rounded-lg p-3 border border-sand">
              <div className="text-[11px] text-gray">{label}</div>
              <div className="text-lg font-bold text-navy">{value}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray mt-2">
          Sends only to open drafts idle {f.min_idle_hours}h–{f.max_age_days} days with an email
          address, at most one per draft.
        </p>
        <Runs label="Recent follow-ups" runs={f.recent} />
      </div>

      <div className="card">
        <h2 className="font-serif font-bold text-navy text-lg">Seasonal campaign mailer</h2>
        <p className="text-sm text-gray mt-2">{c.note}</p>
        <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
          <span className="bg-ivory rounded-lg px-3 py-2 border border-sand">
            Checks every <strong>{c.interval_hours}h</strong>
          </span>
          {c.active_campaign ? (
            <span className="bg-ivory rounded-lg px-3 py-2 border border-sand">
              Live: <strong>{c.active_campaign.name}</strong> — {c.active_campaign.percent}% off,
              ends {c.active_campaign.ends_label}
            </span>
          ) : (
            <span className="bg-ivory rounded-lg px-3 py-2 border border-sand text-gray">
              No active campaign
            </span>
          )}
        </div>
        <Runs label="Recent announcements" runs={c.recent_announcements} />
        <Runs label="Recent last-chance reminders" runs={c.recent_reminders} />
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif font-bold text-navy text-lg">n8n workflows (external)</h2>
          <span className="text-xs text-gray font-mono">{s.n8n.guide}</span>
        </div>
        <p className="text-sm text-gray mt-2">{s.n8n.note}</p>
        {files.length > 0 ? (
          <ul className="mt-3 grid gap-1 md:grid-cols-2">
            {files.map((w) => (
              <li key={w.file} className="text-xs text-gray font-mono bg-ivory border border-sand rounded px-2 py-1.5 break-all">
                {w.path}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray mt-3">
            No workflow JSON files found in <code>n8n-workflows/</code>.
          </p>
        )}
        <p className="text-xs text-gray mt-3">
          Import these into your own n8n instance — they are not run by this server.
        </p>
      </div>
    </div>
  );
}
