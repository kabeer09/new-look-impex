"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loading, ErrorBox, EmptyState } from "@/components/public/States";

interface SeoPage {
  id: number;
  path: string;
  title: string;
  meta_description: string;
  canonical_url: string;
  og_image_url: string;
  published: boolean;
}

const EMPTY = { path: "", title: "", meta_description: "", canonical_url: "", og_image_url: "", published: true };

export default function AdminSeoPages() {
  const [items, setItems] = useState<SeoPage[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setErr("");
    api<{ items: SeoPage[] }>("/api/seo-pages")
      .then((d) => setItems(d.items || []))
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const startEdit = (p: SeoPage) => {
    setEditingId(p.id);
    setForm({ path: p.path, title: p.title, meta_description: p.meta_description,
              canonical_url: p.canonical_url, og_image_url: p.og_image_url, published: p.published });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reset = () => { setEditingId(null); setForm(EMPTY); };

  const save = async () => {
    if (!form.path.trim()) { setMsg("Path is required (e.g. 'wholesale' or 'au')."); return; }
    setBusy(true); setMsg("");
    try {
      if (editingId) {
        await api(`/api/seo-pages/${editingId}`, { method: "PUT", body: JSON.stringify(form) });
        setMsg("Page metadata saved.");
      } else {
        await api("/api/seo-pages", { method: "POST", body: JSON.stringify(form) });
        setMsg("Page metadata created.");
      }
      reset(); load();
    } catch (e: any) { setMsg(String(e)); } finally { setBusy(false); }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this page metadata? The page falls back to default SEO.")) return;
    setBusy(true);
    try { await api(`/api/seo-pages/${id}`, { method: "DELETE" }); load(); }
    catch (e: any) { setMsg(String(e)); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">SEO Page Metadata</h1>
      <p className="text-sm text-gray">
        Unique title, meta description and canonical URL for static pages (homepage, /wholesale, /export,
        regional pages). Changes apply without a code deploy.
      </p>

      <div className="card space-y-3">
        <h2 className="font-semibold">{editingId ? `Edit page #${editingId}` : "Add page metadata"}</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="sp-path">Path (required)</label>
            <input id="sp-path" className="input" placeholder="wholesale or au" value={form.path}
              onChange={(e) => setForm({ ...form, path: e.target.value })} disabled={!!editingId} />
          </div>
          <div>
            <label className="label" htmlFor="sp-canonical">Canonical URL</label>
            <input id="sp-canonical" className="input" placeholder="https://…/wholesale" value={form.canonical_url}
              onChange={(e) => setForm({ ...form, canonical_url: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="sp-title">SEO title (≤60 chars)</label>
          <input id="sp-title" className="input" maxLength={65} value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="sp-meta">Meta description (≤160 chars)</label>
          <textarea id="sp-meta" className="input min-h-[70px]" maxLength={165} value={form.meta_description}
            onChange={(e) => setForm({ ...form, meta_description: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="sp-og">OG image URL (optional)</label>
          <input id="sp-og" className="input" value={form.og_image_url}
            onChange={(e) => setForm({ ...form, og_image_url: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
          Published (apply this metadata)
        </label>
        <div className="flex gap-2">
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => void save()}>
            {editingId ? "Save changes" : "Create"}
          </button>
          {editingId && <button className="btn btn-ghost btn-sm" onClick={reset}>Cancel edit</button>}
        </div>
      </div>

      {msg && <p className="text-sm">{msg}</p>}
      {loading && <Loading label="Loading page metadata…" />}
      {err && <ErrorBox error={err} retry={load} />}
      {!loading && !err && items.length === 0 && (
        <EmptyState title="No page metadata yet" hint="Add metadata for your key static pages to control their SEO titles and descriptions." />
      )}

      {!loading && !err && items.length > 0 && (
        <div className="card !p-0 overflow-x-auto">
          <table className="data">
            <thead><tr><th>Path</th><th>Title</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs">/{p.path}</td>
                  <td className="truncate max-w-[280px]">{p.title || "—"}</td>
                  <td><span className={`badge ${p.published ? "badge-green" : "badge-gray"}`}>{p.published ? "published" : "draft"}</span></td>
                  <td className="text-right whitespace-nowrap">
                    <button className="btn btn-ghost btn-sm" onClick={() => startEdit(p)}>Edit</button>{" "}
                    <button className="btn btn-ghost btn-sm" onClick={() => void remove(p.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
