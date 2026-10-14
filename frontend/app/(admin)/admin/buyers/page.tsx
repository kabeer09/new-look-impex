"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, downloadFile } from "@/lib/api";
import type { Buyer, BuyerInput, ImportResult } from "@/lib/types";
import { Loading, ErrorBox, EmptyState, StatusBadge } from "@/components/public/States";

const OUTREACH_STATUSES = [
  "not_contacted", "contacted", "replied", "interested", "not_interested", "unsubscribed", "do_not_contact",
];

export default function AdminBuyers() {
  const [items, setItems] = useState<Buyer[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [category, setCategory] = useState("");
  const [outreachStatus, setOutreachStatus] = useState("");
  const [verification, setVerification] = useState("");
  const [msg, setMsg] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<BuyerInput>({ company_name: "" });
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    setErr("");
    const params = new URLSearchParams({ page_size: "50" });
    if (q) params.set("q", q);
    if (country) params.set("country", country);
    if (category) params.set("category", category);
    if (outreachStatus) params.set("outreach_status", outreachStatus);
    if (verification) params.set("verification", verification);
    api<Buyer[]>(`/api/buyers?${params.toString()}`)
      .then((d) => setItems(Array.isArray(d) ? d : (d as any).items || []))
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, [q, country, category, outreachStatus, verification]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setMsg("");
    try {
      await api<Buyer>("/api/buyers", { method: "POST", body: JSON.stringify(form) });
      setMsg("Buyer added.");
      setFormOpen(false);
      setForm({ company_name: "" });
      load();
    } catch (e: any) {
      setMsg(String(e));
    }
  };

  const remove = async (id: number) => {
    setMsg("");
    try {
      await api(`/api/buyers/${id}`, { method: "DELETE" });
      setConfirmDelete(null);
      load();
    } catch (e: any) {
      setMsg(String(e));
    }
  };

  const setOutreach = async (id: number, outreach_status: string) => {
    setMsg("");
    try {
      await api(`/api/buyers/${id}`, { method: "PUT", body: JSON.stringify({ outreach_status }) });
      setMsg("Outreach status updated.");
      load();
    } catch (e: any) {
      setMsg(String(e));
    }
  };

  const onImportFile = async (file: File) => {
    setImporting(true);
    setMsg("");
    try {
      const csv = await file.text();
      const res = await api<ImportResult>("/api/buyers/import", { method: "POST", body: JSON.stringify({ csv }) });
      setMsg(`Import done — created: ${res.created ?? 0}, skipped duplicates: ${res.skipped_duplicates ?? 0}, errors: ${(res.errors || []).length}`);
      load();
    } catch (e: any) {
      setMsg(String(e));
    } finally {
      setImporting(false);
    }
  };

  const exportCsv = async () => {
    setMsg("");
    try {
      await downloadFile("/api/buyers/export", "buyers-export.csv");
    } catch (e: any) {
      setMsg(String(e));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Buyers (CRM)</h1>
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-primary btn-sm" onClick={() => setFormOpen((v) => !v)}>+ Add buyer</button>
          <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={importing}>
            {importing ? "Importing…" : "Import CSV"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void onImportFile(f); e.target.value = ""; }}
          />
          <button className="btn btn-ghost btn-sm" onClick={exportCsv}>Export CSV</button>
        </div>
      </div>

      <div className="card flex gap-2 flex-wrap items-end">
        <div>
          <label className="label" htmlFor="b-q">Search</label>
          <input id="b-q" className="input max-w-[200px]" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Company, website…" />
        </div>
        <div>
          <label className="label" htmlFor="b-country">Country</label>
          <input id="b-country" className="input max-w-[140px]" value={country} onChange={(e) => setCountry(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="b-cat">Category</label>
          <input id="b-cat" className="input max-w-[140px]" value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="b-out">Outreach</label>
          <select id="b-out" className="input max-w-[150px]" value={outreachStatus} onChange={(e) => setOutreachStatus(e.target.value)}>
            <option value="">All</option>
            {OUTREACH_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="b-ver">Verification</label>
          <select id="b-ver" className="input max-w-[130px]" value={verification} onChange={(e) => setVerification(e.target.value)}>
            <option value="">All</option>
            <option value="unverified">unverified</option>
            <option value="verified">verified</option>
            <option value="pending">pending</option>
          </select>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => { setQ(""); setCountry(""); setCategory(""); setOutreachStatus(""); setVerification(""); }}>Reset</button>
      </div>

      {msg && <p className="text-sm">{msg}</p>}
      {loading && <Loading label="Loading buyers…" />}
      {err && <ErrorBox error={err} retry={load} />}
      {!loading && !err && items.length === 0 && <EmptyState title="No buyers" hint="Add buyers manually or import a CSV of researched companies." />}

      {!loading && !err && items.length > 0 && (
        <div className="card !p-0 overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th>Company</th><th>Country</th><th>Category</th><th>Lead score</th><th>Outreach</th><th>Verification</th><th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link className="font-medium text-navy hover:underline" href={`/admin/buyers/${b.id}`}>{b.company_name}</Link>
                    {b.website && <div className="text-xs text-gray break-all">{b.website}</div>}
                  </td>
                  <td>{b.country || "—"}</td>
                  <td>{b.buyer_category || "—"}</td>
                  <td>{b.lead_score != null ? b.lead_score.toFixed(2) : "—"}</td>
                  <td>
                    <select
                      className="input !w-[140px] !py-1 !px-2 text-xs"
                      value={b.outreach_status}
                      onChange={(e) => void setOutreach(b.id, e.target.value)}
                      aria-label={`Outreach status for ${b.company_name}`}
                    >
                      {OUTREACH_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td><StatusBadge status={b.verification_status} /></td>
                  <td className="text-right whitespace-nowrap">
                    <Link className="btn btn-ghost btn-sm" href={`/admin/buyers/${b.id}`}>Open</Link>{" "}
                    {confirmDelete === b.id ? (
                      <span className="inline-block ml-1">
                        <button className="btn btn-danger btn-sm" onClick={() => void remove(b.id)}>Confirm</button>{" "}
                        <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(null)}>Cancel</button>
                      </span>
                    ) : (
                      <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(b.id)}>Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <div className="card">
          <h2 className="font-semibold mb-3">Add buyer</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="nb-name">Company name *</label>
              <input id="nb-name" className="input" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="nb-website">Website</label>
              <input id="nb-website" className="input" value={form.website || ""} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="nb-country">Country</label>
              <input id="nb-country" className="input" value={form.country || ""} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="nb-cat">Buyer category</label>
              <input id="nb-cat" className="input" value={form.buyer_category || ""} onChange={(e) => setForm({ ...form, buyer_category: e.target.value })} placeholder="e.g. wholesaler, retailer" />
            </div>
            <div>
              <label className="label" htmlFor="nb-rel">Product relevance</label>
              <input id="nb-rel" className="input" value={form.product_relevance || ""} onChange={(e) => setForm({ ...form, product_relevance: e.target.value })} placeholder="e.g. brass urlis" />
            </div>
            <div>
              <label className="label" htmlFor="nb-contact">Contact name</label>
              <input id="nb-contact" className="input" value={form.contact_name || ""} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="nb-email">Contact email</label>
              <input id="nb-email" type="email" className="input" value={form.contact_email || ""} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="nb-phone">Phone</label>
              <input id="nb-phone" className="input" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="nb-source">Source URL</label>
              <input id="nb-source" className="input" value={form.source_url || ""} onChange={(e) => setForm({ ...form, source_url: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="nb-stype">Source type</label>
              <input id="nb-stype" className="input" value={form.source_type || ""} onChange={(e) => setForm({ ...form, source_type: e.target.value })} />
            </div>
          </div>
          <div className="mt-3">
            <label className="label" htmlFor="nb-notes">Notes</label>
            <textarea id="nb-notes" rows={2} className="input" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex gap-2 mt-4">
            <button className="btn btn-primary" onClick={save}>Add buyer</button>
            <button className="btn btn-ghost" onClick={() => setFormOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
