"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function Auto() {
  const [w, setW] = useState<any>(null);
  const [err, setErr] = useState("");
  useEffect(() => { api("/api/automation/workflows").then(setW).catch((e) => setErr(String(e))); }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Automation</h1>
      <div className="card text-sm">Import JSON files from <code>n8n-workflows/</code> into n8n. Configure env: API_BASE_URL, API_TOKEN, N8N_WEBHOOK_TOKEN, SMTP_WEBHOOK. No credentials inside JSON. Guide: docs/n8n-setup.md</div>
      {err && <p className="text-sm text-red-700">{err}</p>}
      <div className="card"><pre className="text-xs whitespace-pre-wrap">{JSON.stringify(w, null, 2) || "Loading…"}</pre></div>
    </div>
  );
}
