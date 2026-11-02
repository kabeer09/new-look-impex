"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, API } from "@/lib/api";
import { Loading, ErrorBox } from "@/components/public/States";

function Cell({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="card">
      <div className="text-xs text-gray">{label}</div>
      <div className="text-xl font-bold text-navy">
        {value === null || value === undefined ? <span className="text-gray font-normal">unavailable</span> : String(value)}
      </div>
    </div>
  );
}

export default function Overview() {
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api<Record<string, any>>("/api/dashboard/summary")
      .then(setData)
      .catch((e) => setErr(String(e)));
  }, []);

  if (err) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Overview</h1>
        <ErrorBox error={err} retry={() => window.location.reload()} />
        <p className="text-sm text-gray">Backend: {API}</p>
      </div>
    );
  }
  if (!data) return <div className="space-y-4"><h1 className="text-2xl font-bold">Overview</h1><Loading label="Loading dashboard…" /></div>;

  const seoCards: [string, unknown][] = [
    ["Organic clicks", data.clicks],
    ["Impressions", data.impressions],
    ["Avg CTR", data.ctr != null ? `${(Number(data.ctr) * 100).toFixed(2)}%` : null],
    ["Avg position", data.avg_position ?? null],
    ["Tracked keywords", data.keywords_tracked],
    ["Pending approvals", data.recommendations_pending],
    ["Pages", data.pages],
    ["Published changes", data.published_changes],
    ["Enquiries", data.enquiries_total],
    ["Qualified enquiries", data.enquiries_qualified],
  ];

  const commerceCards: [string, unknown][] = [
    ["Products published", data.products_published],
    ["Products draft", data.products_draft],
    ["Products total", data.products_total],
    ["RFQs total", data.rfqs_total],
    ["RFQs new", data.rfqs_new],
    ["Buyers total", data.buyers_total],
    ["Buyers qualified", data.buyers_qualified],
    ["Catalogue downloads", data.catalogue_downloads],
  ];

  const events = data.events_summary;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Overview</h1>
          <p className="text-sm text-gray mt-1">
            Data source: <span className="badge">{data.data_source || "unknown"}</span> — {data.data_note || ""}
          </p>
        </div>
        <Link href="/" className="btn btn-ghost btn-sm">View public site</Link>
      </div>

      <section>
        <h2 className="font-semibold mb-2">Commerce</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {commerceCards.map(([k, v]) => <Cell key={k} label={k} value={v} />)}
        </div>
      </section>

      {events && (
        <section>
          <h2 className="font-semibold mb-2">Catalogue events</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Cell label="Product views" value={events.product_views} />
            <Cell label="RFQ adds" value={events.rfq_adds} />
            <Cell label="RFQ submits" value={events.rfq_submits} />
            <Cell label="Catalogue downloads" value={events.catalogue_downloads} />
            <Cell label="Contact clicks" value={events.contact_clicks} />
            <Cell label="WhatsApp clicks" value={events.whatsapp_clicks} />
          </div>
        </section>
      )}

      <section>
        <h2 className="font-semibold mb-2">SEO</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {seoCards.map(([k, v]) => <Cell key={k} label={k} value={v} />)}
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="font-semibold mb-2">Clicks by day (last {data.clicks_by_day?.length || 0})</h2>
          {!data.clicks_by_day || data.clicks_by_day.length === 0 ? (
            <p className="text-sm text-gray">unavailable — connect Search Console.</p>
          ) : (
            <table className="data">
              <thead><tr><th>Date</th><th>Clicks</th><th>Impr.</th></tr></thead>
              <tbody>
                {data.clicks_by_day.slice(-14).map((d: any) => (
                  <tr key={d.date}><td>{d.date}</td><td>{d.clicks}</td><td>{d.impressions}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <h2 className="font-semibold mb-2">Top pages</h2>
          {(data.top_pages || []).length === 0 ? (
            <p className="text-sm text-gray">unavailable — no page data yet.</p>
          ) : (
            <table className="data">
              <thead><tr><th>URL</th><th>Clicks</th></tr></thead>
              <tbody>
                {data.top_pages.map((p: any) => (
                  <tr key={p.url}><td className="break-all">{p.url}</td><td>{p.clicks}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <h2 className="font-semibold mb-2">Enquiries by country</h2>
          {(data.enquiries_by_country || []).length === 0 ? (
            <p className="text-sm text-gray">unavailable — no enquiries yet.</p>
          ) : (
            <table className="data">
              <thead><tr><th>Country</th><th>Count</th></tr></thead>
              <tbody>
                {data.enquiries_by_country.map((e: any) => (
                  <tr key={e.country}><td>{e.country}</td><td>{e.count}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <h2 className="font-semibold mb-2">Most requested products</h2>
          {(data.most_requested_products || []).length === 0 ? (
            <p className="text-sm text-gray">unavailable — no RFQ data yet.</p>
          ) : (
            <table className="data">
              <thead><tr><th>Product</th><th>Requests</th></tr></thead>
              <tbody>
                {data.most_requested_products.map((m: any, i: number) => (
                  <tr key={i}><td>{m.product_name}</td><td>{m.count}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Link href="/admin/rfqs" className="card hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-navy">RFQs ({data.rfqs_total ?? "?"})</h3>
          <p className="text-sm text-gray mt-1">{data.rfqs_new ?? "?"} new — review &amp; quote</p>
        </Link>
        <Link href="/admin/buyers" className="card hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-navy">Buyers ({data.buyers_total ?? "?"})</h3>
          <p className="text-sm text-gray mt-1">{data.buyers_qualified ?? "?"} qualified</p>
        </Link>
        <Link href="/admin/products" className="card hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-navy">Products ({data.products_total ?? "?"})</h3>
          <p className="text-sm text-gray mt-1">{data.products_published ?? "?"} published · {data.products_draft ?? "?"} drafts</p>
        </Link>
      </div>
    </div>
  );
}
