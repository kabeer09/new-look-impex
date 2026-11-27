"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Loading, ErrorBox } from "@/components/public/States";

type Agent = { key: string; name: string; role: string; instructions: string; tools: string[]; restrictions: string[]; enabled: boolean; runs: number; color: string };

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api<{ items: Agent[] }>("/api/agents").then(d => setAgents(d.items || [])).catch(e => setErr(String(e))).finally(() => setLoading(false));
  }, []);
  if (loading) return <Loading label="Loading agents…" />;
  if (err) return <ErrorBox error={err} />;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">New Look Impex · Intelligence</p>
        <h1 className="page-title mt-1">AI Agents</h1>
        <p className="page-subtitle">Eight bounded specialists sharing verified business data. Every consequential action requires approval.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map(a => (
          <article key={a.key} className="card flex flex-col">
            <div className="flex items-start gap-3">
              <span className="mt-1.5 h-3 w-3 rounded-full" style={{ background: a.color }} />
              <div>
                <h2 className="font-serif text-lg text-espresso">{a.name}</h2>
                <p className="text-xs text-gray">{a.role}</p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray">{a.instructions}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {a.tools.map(t => <span key={t} className="badge badge-gray !text-[10px]">{t}</span>)}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {a.restrictions.map(r => <span key={r} className="rounded bg-ivory px-2 py-1 text-[10px] text-clay">{r}</span>)}
            </div>
            <div className="mt-auto flex items-center justify-between border-t border-clay/15 pt-4 text-xs text-gray">
              <span>{a.runs} execution steps</span>
              <Link href={`/admin/command-centre?agent=${a.key}`} className="link">Open in chat →</Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
