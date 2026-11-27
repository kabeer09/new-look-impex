"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Row = { value: string; clicks: number; impressions: number; ctr: number; position: number; count?: number };
type Totals = { clicks: number; impressions: number; ctr: number; position: number;
  period: { start: string; end: string }; note?: string; source?: string };
type Status = { configured: boolean; connected: boolean; status: string; setup_message?: string;
  site_url: string; scope: string; callback_url: string; last_sync_at: string | null; last_error: string };

const TABS = ["Overview", "GA4 Overview", "Organic Traffic", "GA4 Countries", "Landing Pages",
  "Enquiry Tracking", "Search Queries", "Top Pages", "Countries", "Devices", "Search Appearance",
  "Country Pages", "URL Inspection", "Sitemap Manager", "Indexing Issues", "Recommendations",
  "Connection Settings"] as const;

const pct = (n: number) => `${(n * 100).toFixed(2)}%`;
const num = (n: number) => new Intl.NumberFormat("en-IN").format(n || 0);

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <div className="card"><p className="text-xs uppercase tracking-wider text-gray">{label}</p>
    <p className="text-2xl font-bold text-navy mt-2">{value}</p>{sub && <p className="text-xs text-gray mt-1">{sub}</p>}</div>;
}

function Table({ items }: { items: Row[] }) {
  if (!items.length) return <p className="text-sm text-gray py-6">No real Search Console data for this period yet.</p>;
  return <div className="overflow-x-auto"><table className="data">
    <thead><tr><th>Value</th><th>Clicks</th><th>Impressions</th><th>CTR</th><th>Position</th></tr></thead>
    <tbody>{items.map((r, i) => <tr key={`${r.value}-${i}`}>
      <td className="max-w-xl break-words">{r.value}</td>
      <td>{r.count !== undefined ? num(r.count) : num(r.clicks)}</td>
      <td>{r.count !== undefined ? "—" : num(r.impressions)}</td>
      <td>{r.count !== undefined ? "—" : pct(r.ctr)}</td>
      <td>{r.count !== undefined ? "—" : r.position.toFixed(1)}</td></tr>)}</tbody></table></div>;
}

export default function SeoManager() {
  const [status, setStatus] = useState<Status | null>(null);
  const [ga4Status, setGa4Status] = useState<any>(null);
  const [preflight, setPreflight] = useState<any>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [range, setRange] = useState("28d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [overview, setOverview] = useState<any>(null);
  const [ga4Overview, setGa4Overview] = useState<any>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [countryRows, setCountryRows] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [sitemaps, setSitemaps] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [inspectUrl, setInspectUrl] = useState("https://www.newlookimpex.store/");
  const [inspectResult, setInspectResult] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const loadStatus = useCallback(() => Promise.all([
    api<Status>("/api/seo-console/status"), api<any>("/api/seo-console/ga4/status"),
  ]).then(([s, g]) => { setStatus(s); setGa4Status(g); }).catch((e) => setMsg(String(e))), []);
  useEffect(() => { loadStatus(); }, [loadStatus]);

  const loadData = useCallback(async () => {
    setMsg("");
    const qs = `range=${range}${range === "custom" ? `&start=${customStart}&end=${customEnd}` : ""}`;
    try {
      const ov = await api<any>(`/api/seo-console/overview?${qs}`);
      setOverview(ov);
      const ga4Tabs: Record<string, string> = {
        "GA4 Overview": "", "Organic Traffic": "", "GA4 Countries": "country",
        "Landing Pages": "landingPage", "Enquiry Tracking": "eventName",
      };
      if (tab in ga4Tabs) {
        const dim = ga4Tabs[tab];
        const organic = tab === "Organic Traffic" ? "true" : "false";
        setGa4Overview(await api<any>(`/api/seo-console/ga4/overview?${qs}&organic=${organic}`));
        if (dim) {
          const d = await api<{ items: Row[] }>(`/api/seo-console/ga4/dimension/${dim}?${qs}&organic=${organic}&limit=50`);
          setRows(d.items || []);
        }
      }
      const keyMap: Record<string, string> = {
        "Search Queries": "queries", "Top Pages": "pages", Countries: "countries",
        Devices: "devices", "Search Appearance": "appearances",
      };
      if (keyMap[tab]) {
        const d = await api<{ items: Row[] }>(`/api/seo-console/${keyMap[tab]}?${qs}&limit=50`);
        setRows(d.items || []);
      }
      if (tab === "Country Pages") {
        const d = await api<{ items: any[] }>(`/api/seo-console/country-pages?${qs}`);
        setCountryRows(d.items || []);
      }
      if (tab === "Indexing Issues") {
        const d = await api<{ items: any[] }>("/api/seo-console/url-inspection/history?limit=100");
        setInspections((d.items || []).filter((i) => i.index_status && i.index_status !== "PASS"));
      }
      if (tab === "Sitemap Manager") setSitemaps(await api<any>("/api/seo-console/sitemaps"));
      if (tab === "Recommendations") {
        const d = await api<{ items: any[] }>("/api/seo-console/recommendations?limit=100");
        setRecommendations(d.items || []);
      }
    } catch (e) { setMsg(String(e)); }
  }, [tab, range, customStart, customEnd]);

  useEffect(() => { if (status) loadData(); }, [status, loadData]);

  const act = async (path: string, body: any = {}, method = "POST") => {
    setBusy(true); setMsg("");
    try {
      const r = await api<any>(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (r.auth_url) window.location.href = r.auth_url;
      else { setMsg("Done."); await loadStatus(); await loadData(); }
      return r;
    } catch (e) { setMsg(String(e)); return null; }
    finally { setBusy(false); }
  };

  const cur = overview?.current as Totals | undefined;
  const prev = overview?.previous as Totals | undefined;
  const delta = (a: number, b: number) => b ? `${a >= b ? "+" : ""}${(((a - b) / b) * 100).toFixed(1)}% vs previous` : "no previous data";
  const daily = overview?.daily || [];
  const maxDaily = Math.max(1, ...daily.map((d: any) => d.impressions));

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-navy">SEO Manager</h1>
        <p className="text-sm text-gray mt-1">Real Google Search Console data — no estimates, no fabricated analytics.</p></div>
      <div className="flex flex-wrap gap-2">
        {status?.connected ? <>
          <button className="btn btn-outline btn-sm" disabled={busy} onClick={() => act("/api/seo-console/reconnect")}>Reconnect</button>
          <button className="btn btn-outline btn-sm" disabled={busy} onClick={() => act("/api/seo-console/disconnect")}>Disconnect</button>
        </> : <button className="btn btn-clay btn-sm" disabled={busy} onClick={() => act("/api/seo-console/connect")}>Connect Google Search Console</button>}
      </div>
    </div>

    {msg && <p className="card text-sm">{msg}</p>}
    {ga4Status && !ga4Status.configured && <div className="card text-sm text-gray">
      GA4: {ga4Status.setup_message}
    </div>}
    {ga4Status?.reconnect_needed && <div className="card border-l-4 border-clay text-sm">
      Reconnect required to grant the GA4 read-only scope. Existing Search Console access is preserved.
    </div>}
    {status && !status.connected && <div className="card border-l-4 border-clay">
      <p className="font-semibold">{status.configured ? "Search Console is not connected." : "Setup required"}</p>
      <p className="text-sm text-gray mt-1">{status.setup_message || "Connect with an account that has access to the verified property."}</p>
      <p className="text-xs text-gray mt-2 break-all">Callback URL to register: {status.callback_url}</p>
    </div>}

    <div className="flex flex-wrap gap-2 items-center">
      <select className="input w-auto" value={range} onChange={(e) => setRange(e.target.value)}>
        <option value="7d">Last 7 days</option><option value="28d">Last 28 days</option>
        <option value="3m">Last 3 months</option><option value="6m">Last 6 months</option>
        <option value="custom">Custom range</option>
      </select>
      {range === "custom" && <><input className="input w-auto" type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
        <input className="input w-auto" type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} /></>}
      <button className="btn btn-clay btn-sm" disabled={busy} onClick={() => act("/api/seo-console/sync", { range, start: customStart, end: customEnd })}>Sync now</button>
      <button className="btn btn-outline btn-sm" disabled={busy} onClick={loadData}>Refresh view</button>
      <span className="text-xs text-gray ml-auto">Last sync: {status?.last_sync_at || "never"}</span>
    </div>

    <nav className="flex flex-wrap gap-2">{TABS.map((t) => <button key={t}
      onClick={() => setTab(t)} className={`btn btn-sm ${tab === t ? "btn-clay" : "btn-outline"}`}>{t}</button>)}</nav>

    {cur && <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <Kpi label="Clicks" value={num(cur.clicks)} sub={delta(cur.clicks, prev?.clicks || 0)} />
      <Kpi label="Impressions" value={num(cur.impressions)} sub={delta(cur.impressions, prev?.impressions || 0)} />
      <Kpi label="Average CTR" value={pct(cur.ctr)} sub={delta(cur.ctr, prev?.ctr || 0)} />
      <Kpi label="Average position" value={cur.position.toFixed(1)} sub={cur.period ? `${cur.period.start} → ${cur.period.end}` : ""} />
    </div>}

    {tab === "Overview" && <div className="card">
      <h2 className="font-semibold mb-3">Daily impressions</h2>
      {daily.length === 0 ? <p className="text-sm text-gray">No daily data. Run a sync first.</p> :
        <div className="flex items-end gap-1 h-48 overflow-x-auto">{daily.map((d: any) =>
          <div key={d.date} title={`${d.date}: ${d.impressions} impressions, ${d.clicks} clicks`}
            className="w-3 min-w-[6px] bg-clay/70" style={{ height: `${Math.max(2, (d.impressions / maxDaily) * 100)}%` }} />)}</div>}
      <p className="text-xs text-gray mt-3">{cur?.note || "Data shown after Google Search Console sync."}</p>
    </div>}

    {(tab === "GA4 Overview" || tab === "Organic Traffic") && <div className="space-y-3">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="GA4 users" value={num(ga4Overview?.current?.total_users || 0)} sub="Analytics users, not GSC clicks" />
        <Kpi label="Sessions" value={num(ga4Overview?.current?.sessions || 0)} />
        <Kpi label="Views" value={num(ga4Overview?.current?.views || 0)} />
        <Kpi label="Engagement rate" value={pct(ga4Overview?.current?.engagement_rate || 0)} />
      </div>
      <div className="card text-xs text-gray">
        Avg. engagement time: {Math.round(ga4Overview?.current?.average_engagement_time_seconds || 0)}s ·
        Period: {ga4Overview?.current?.period?.start} → {ga4Overview?.current?.period?.end}
        {tab === "Organic Traffic" && " · Filtered to Organic Search channel"}
      </div>
    </div>}

    {(tab === "GA4 Countries" || tab === "Landing Pages" || tab === "Enquiry Tracking") && <div className="card">
      <h2 className="font-semibold mb-3">{tab === "Enquiry Tracking" ? "Recorded GA4 events (real Data API)" : tab}</h2>
      {tab === "Enquiry Tracking" && <p className="text-xs text-gray mb-3">
        Events sent: whatsapp_click, contact_click, generate_lead (rfq/contact/customisation/wholesale/chat), catalogue_download.
        No names, emails, phones or hrefs are sent. Event collection is not treated as verified conversions until confirmed in GA4.
      </p>}
      <Table items={rows} />
    </div>}

    {["Search Queries", "Top Pages", "Countries", "Devices", "Search Appearance"].includes(tab) && <div className="card"><Table items={rows} /></div>}

    {tab === "Country Pages" && <div className="card overflow-x-auto"><table className="data">
      <thead><tr><th>Country</th><th>URL</th><th>Clicks</th><th>Impressions</th><th>CTR</th><th>Position</th></tr></thead>
      <tbody>{countryRows.map((c) => <tr key={c.country}><td>{c.country}</td>
        <td className="text-xs break-all">{c.url}</td><td>{num(c.clicks)}</td><td>{num(c.impressions)}</td>
        <td>{pct(c.ctr)}</td><td>{c.position.toFixed(1)}</td></tr>)}</tbody></table></div>}

    {tab === "URL Inspection" && <div className="card space-y-3">
      <p className="text-sm text-gray">Google's known indexing state — not a live page test and no indexing guarantee.</p>
      <div className="flex gap-2"><input className="input flex-1" value={inspectUrl} onChange={(e) => setInspectUrl(e.target.value)} />
        <button className="btn btn-clay btn-sm" disabled={busy} onClick={async () => {
          setBusy(true); setMsg("");
          try { setInspectResult(await api<any>("/api/seo-console/url-inspection/inspect", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: inspectUrl }) })); }
          catch (e) { setMsg(String(e)); } finally { setBusy(false); }
        }}>Inspect</button></div>
      {inspectResult && <pre className="text-xs bg-ivory p-3 overflow-x-auto">{JSON.stringify(inspectResult, null, 2)}</pre>}
    </div>}

    {tab === "Sitemap Manager" && <div className="card space-y-3">
      <p className="text-sm">{sitemaps?.local_url_count ?? 0} URLs discovered in sitemap.xml; duplicates: {sitemaps?.duplicate_urls?.length ?? 0}</p>
      <div className="overflow-x-auto"><table className="data"><thead><tr><th>Sitemap</th><th>Source</th><th>Status</th><th>Errors</th><th>Submitted</th></tr></thead>
        <tbody>{(sitemaps?.items || []).map((s: any) => <tr key={s.url}><td className="text-xs break-all">{s.url}</td><td>{s.source}</td>
          <td>{s.status || "—"}</td><td>{s.errors}</td><td>{s.last_submitted || "—"}</td></tr>)}</tbody></table></div>
      {status?.scope === "write" && <button className="btn btn-outline btn-sm" disabled={busy}
        onClick={() => act("/api/seo-console/sitemaps/submit", { sitemap_url: "https://www.newlookimpex.store/sitemap.xml" })}>Submit sitemap to Google</button>}
    </div>}

    {tab === "Indexing Issues" && <div className="card"><Table items={[]} />
      <ul className="text-sm space-y-2">{inspections.map((i) => <li key={i.id} className="border-b border-sand py-2">
        <span className="font-semibold break-all">{i.url}</span> — {i.index_status || i.verdict || "Unknown"} · {i.coverage_state || ""}</li>)}</ul>
      {!inspections.length && <p className="text-sm text-gray">No inspection issues recorded yet. Inspect a URL first.</p>}</div>}

    {tab === "Recommendations" && <div className="card space-y-3">
      <button className="btn btn-outline btn-sm" disabled={busy} onClick={() => act("/api/seo-console/recommendations/generate", { range })}>Generate from real data</button>
      <p className="text-xs text-gray">Nothing is published automatically. Approve/complete decisions are audit-logged.</p>
      <div className="overflow-x-auto"><table className="data"><thead><tr><th>URL / query</th><th>Priority</th><th>Status</th><th>Recommendation</th><th>Evidence</th></tr></thead>
        <tbody>{recommendations.map((r) => <tr key={r.id}><td className="text-xs break-all">{r.url}</td><td>{r.priority}</td><td>{r.status}</td>
          <td className="text-xs">{r.recommendation}</td><td className="text-xs">{JSON.stringify(r.evidence)}</td>
          <td><button className="btn btn-sm btn-outline" disabled={busy} onClick={() => act(`/api/seo-console/recommendations/${r.id}/decision`, { status: r.status === "Pending" ? "Approved" : "Completed" })}>
            {r.status === "Pending" ? "Approve" : "Complete"}</button></td></tr>)}</tbody></table></div>
    </div>}

    {tab === "Connection Settings" && <div className="card space-y-2 text-sm">
      <p><b>Callback URL:</b> <span className="break-all">{status?.callback_url}</span></p>
      <p><b>Property:</b> {status?.site_url}</p><p><b>Scope:</b> {status?.scope}</p>
      <p className="text-gray">Set GOOGLE_SEARCH_CONSOLE_CLIENT_ID / CLIENT_SECRET / REDIRECT_URI on the backend only. Tokens are encrypted at rest; no secrets are sent to the browser.</p>
      <p className="text-xs text-gray">Full setup: docs/google-search-console-setup.md</p>
      <button className="btn btn-outline btn-sm" disabled={busy} onClick={async () => {
        setBusy(true); setMsg("");
        try { setPreflight(await api<any>("/api/seo-console/preflight")); }
        catch (e) { setMsg(String(e)); } finally { setBusy(false); }
      }}>Run connectivity preflight</button>
      {preflight && <pre className="text-xs bg-ivory p-3 overflow-x-auto">{JSON.stringify(preflight, null, 2)}</pre>}
    </div>}
  </div>;
}
