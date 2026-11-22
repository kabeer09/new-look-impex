"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loading, ErrorBox } from "@/components/public/States";

type Row = {
  slug: string; name: string; path: string;
  enquiries: number; page_events: number; gsc_clicks: number; gsc_impressions: number;
  gsc_configured: boolean;
};
type Data = {
  days: number; rows: Row[];
  top_by_enquiries: { name: string; enquiries: number }[];
  limitations: string;
};

export default function EuropeDashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback((days: number) => {
    setLoading(true); setErr("");
    api<Data>(`/api/admin/europe-dashboard?days=${days}`)
      .then(setData).catch((e) => setErr(String(e))).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(90); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Europe Markets</h1>
          <p className="text-sm text-gray mt-1">Country-wise performance across the ten Europe landing pages.</p>
        </div>
        <div className="flex gap-2">
          {[30, 90, 365].map((d) => (
            <button key={d} className="btn btn-sm" onClick={() => load(d)}>{d}d</button>
          ))}
        </div>
      </div>

      {err && <ErrorBox error={err} />}
      {loading && !data && <Loading label="Loading Europe data…" />}

      {data && (
        <>
          <p className="text-xs text-gray max-w-3xl">{data.limitations}</p>
          <div className="card overflow-x-auto">
            <table className="data w-full">
              <thead>
                <tr>
                  <th>Country</th>
                  <th className="text-right">Enquiries</th>
                  <th className="text-right">Page events</th>
                  <th className="text-right">GSC clicks</th>
                  <th className="text-right">GSC impressions</th>
                  <th>Page</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.slug}>
                    <td className="font-medium">{r.name}</td>
                    <td className="text-right">{r.enquiries}</td>
                    <td className="text-right">{r.page_events}</td>
                    <td className="text-right">{r.gsc_clicks}{!r.gsc_configured && <span className="text-gray">*</span>}</td>
                    <td className="text-right">{r.gsc_impressions}{!r.gsc_configured && <span className="text-gray">*</span>}</td>
                    <td><a className="link" href={r.path} target="_blank" rel="noopener noreferrer">{r.path} ↗</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.rows.some((r) => r.gsc_configured) && (
              <p className="text-xs text-gray mt-3">* Search Console has not been connected/synced — GSC figures are zero, not estimates.</p>
            )}
          </div>

          <div className="card">
            <h2 className="font-semibold">Top markets by enquiries</h2>
            <ul className="mt-2 text-sm space-y-1">
              {data.top_by_enquiries.filter((r) => r.enquiries > 0).map((r) => (
                <li key={r.name}>{r.name} — {r.enquiries} enquiries</li>
              ))}
              {!data.top_by_enquiries.some((r) => r.enquiries > 0) && (
                <li className="text-gray">No enquiries recorded in this window yet.</li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
