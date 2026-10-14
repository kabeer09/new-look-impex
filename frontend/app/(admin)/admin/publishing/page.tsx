"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function Pub() {
  const [rep, setRep] = useState<any>(null);
  useEffect(() => { api("/api/reports/monthly").then(setRep).catch(() => {}); }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Publishing &amp; Reports</h1>
      <div className="card text-sm">Approval mode: all significant changes stay drafts until approved. Low-risk auto changes only if explicitly configured. Every publish saves versions + logs + supports rollback.</div>
      {rep ? <div className="card"><pre className="text-xs whitespace-pre-wrap">{JSON.stringify(rep, null, 2)}</pre></div> : <div className="card text-sm">Loading report… (log in first)</div>}
    </div>
  );
}
