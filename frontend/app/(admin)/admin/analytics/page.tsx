"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function Analytics() {
  const [rows, setRows] = useState<any[]>([]);
  const [err, setErr] = useState("");
  useEffect(() => {
    api<any>("/api/seo/performance?days=28")
      .then((d) => setRows(d.rows || []))
      .catch((e) => setErr(String(e)));
  }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Analytics</h1>
      {err && <p className="text-sm text-red-700">{err}</p>}
      <div className="card">
        {rows.length === 0 ? <p className="text-sm">No rows yet.</p> :
          <table className="data">
            <thead><tr><th>Date</th><th>Source</th><th>URL</th><th>Query</th><th>Clicks</th><th>Impr</th><th>Pos</th></tr></thead>
            <tbody>{rows.slice(-30).map((r: any, i: number) => <tr key={i}><td>{r.date}</td><td>{r.source}</td><td className="break-all">{r.url}</td><td>{r.query || "—"}</td><td>{r.clicks}</td><td>{r.impressions}</td><td>{r.position ?? "n/a"}</td></tr>)}</tbody>
          </table>}
      </div>
    </div>
  );
}
