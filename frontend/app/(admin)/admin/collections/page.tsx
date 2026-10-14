"use client";
import { useCallback, useEffect, useState } from "react";
import { api, mediaUrl } from "@/lib/api";
import type { Collection, CollectionInput, ProductCard } from "@/lib/types";
import { Loading, ErrorBox, EmptyState, StatusBadge } from "@/components/public/States";
import { AiSeoAssistant } from "@/components/admin/AiSeoAssistant";

export default function AdminCollections() {
  const [items, setItems] = useState<Collection[]>([]);
  const [products, setProducts] = useState<ProductCard[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState<Collection | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CollectionInput>({ name: "" });
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [manageId, setManageId] = useState<number | null>(null);
  const [manageSelected, setManageSelected] = useState<number[]>([]);
  const [manageErr, setManageErr] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setErr("");
    Promise.all([
      api<Collection[]>("/api/collections").then((d) => (Array.isArray(d) ? d : (d as any).items || [])),
      api<{ items: ProductCard[] }>("/api/products?page_size=100").then((d) => d.items || []),
    ])
      .then(([cols, prods]) => {
        setItems(cols);
        setProducts(prods);
      })
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const startCreate = () => {
    setEditing(null);
    setFormOpen(true);
    setForm({ name: "" });
  };

  const startEdit = (c: Collection) => {
    setEditing(c);
    setFormOpen(true);
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description || "",
      image_url: c.image_url || "",
      seo_title: c.seo_title || "",
      seo_description: c.seo_description || "",
      featured: Boolean(c.featured),
      sort_order: c.sort_order ?? 0,
    });
  };

  const save = async () => {
    setMsg("");
    try {
      if (editing) {
        await api(`/api/collections/${editing.id}`, { method: "PUT", body: JSON.stringify(form) });
        setMsg("Collection updated.");
      } else {
        await api("/api/collections", { method: "POST", body: JSON.stringify(form) });
        setMsg("Collection created.");
      }
      setEditing(null);
      setFormOpen(false);
      setForm({ name: "" });
      load();
    } catch (e: any) {
      setMsg(String(e));
    }
  };

  const remove = async (id: number) => {
    setMsg("");
    try {
      await api(`/api/collections/${id}`, { method: "DELETE" });
      setConfirmDelete(null);
      load();
    } catch (e: any) {
      setMsg(String(e));
    }
  };

  const openManage = (c: Collection) => {
    setManageId(c.id);
    setManageErr("");
    setManageSelected([]);
    api<{ items: ProductCard[] }>(`/api/public/collections/${c.slug}?page_size=100`)
      .then((d) => setManageSelected((d.items || []).map((p) => p.id)))
      .catch(() => {
        // Fall back to product_ids embedded in the collection payload if present.
        const withIds = (c as unknown as { product_ids?: number[] }).product_ids;
        if (withIds) setManageSelected(withIds);
      });
  };

  const toggleManage = (id: number) =>
    setManageSelected((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]));

  const saveManage = async () => {
    if (manageId == null) return;
    setManageErr("");
    try {
      await api(`/api/collections/${manageId}/products`, {
        method: "POST",
        body: JSON.stringify({ product_ids: manageSelected }),
      });
      setManageId(null);
      setMsg(`Collection updated — ${manageSelected.length} product(s) attached.`);
      load();
    } catch (e: any) {
      setManageErr(String(e));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Collections</h1>
        <button className="btn btn-primary btn-sm" onClick={startCreate}>+ New collection</button>
      </div>
      {msg && <p className="text-sm">{msg}</p>}
      {loading && <Loading label="Loading collections…" />}
      {err && <ErrorBox error={err} retry={load} />}
      {!loading && !err && items.length === 0 && <EmptyState title="No collections" hint="Create the first collection." />}
      {!loading && !err && items.length > 0 && (
        <div className="card !p-0 overflow-x-auto">
          <table className="data">
            <thead>
              <tr><th>Name</th><th>Slug</th><th>Products</th><th>Featured</th><th className="text-right">Actions</th></tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      {c.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mediaUrl(c.image_url)} alt="" className="w-8 h-8 rounded object-cover" />
                      )}
                      <span className="font-medium">{c.name}</span>
                    </div>
                    {c.description && <div className="text-xs text-gray max-w-xs line-clamp-1">{c.description}</div>}
                  </td>
                  <td className="text-gray">{c.slug}</td>
                  <td>{c.product_count ?? "—"}</td>
                  <td>{c.featured ? <span className="badge badge-brass">★</span> : "—"}</td>
                  <td className="text-right whitespace-nowrap">
                    <button className="btn btn-ghost btn-sm" onClick={() => startEdit(c)}>Edit</button>{" "}
                    <button className="btn btn-ghost btn-sm" onClick={() => openManage(c)}>Manage products</button>{" "}
                    {confirmDelete === c.id ? (
                      <span className="inline-block ml-1">
                        <button className="btn btn-danger btn-sm" onClick={() => void remove(c.id)}>Confirm</button>{" "}
                        <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(null)}>Cancel</button>
                      </span>
                    ) : (
                      <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(c.id)}>Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(editing !== null || formOpen) && (
        <div className="card">
          <h2 className="font-semibold mb-3">{editing ? `Edit: ${editing.name}` : "New collection"}</h2>
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="col-name">Name *</label>
                <input id="col-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="col-slug">Slug</label>
                <input id="col-slug" className="input" value={form.slug || ""} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto if empty" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="col-desc">Description</label>
              <textarea id="col-desc" rows={3} className="input" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="col-img">Image URL</label>
              <input id="col-img" className="input" value={form.image_url || ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="col-seot">SEO title</label>
                <input id="col-seot" className="input" value={form.seo_title || ""} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="col-seod">SEO description</label>
                <input id="col-seod" className="input" value={form.seo_description || ""} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-4 items-center">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="accent-[#172A3A]" checked={Boolean(form.featured)} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
                Featured
              </label>
              <div>
                <label className="label" htmlFor="col-sort">Sort order</label>
                <input id="col-sort" type="number" className="input max-w-[120px]" value={form.sort_order ?? 0} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={save}>Save</button>
              <button className="btn btn-ghost" onClick={() => { setEditing(null); setFormOpen(false); setForm({ name: "" }); }}>Cancel</button>
            </div>
            {editing !== null && (
              <AiSeoAssistant
                entityType="collection"
                entityId={editing.id}
                current={{
                  seo_title: form.seo_title,
                  seo_description: form.seo_description,
                  slug: form.slug,
                  description: form.description,
                }}
                onApply={(patch) => setForm({ ...form, ...patch })}
              />
            )}
          </div>
        </div>
      )}

      {manageId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Manage collection products">
          <div className="absolute inset-0 bg-navy/40" onClick={() => setManageId(null)} />
          <div className="relative bg-white rounded-xl border border-sand shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-5">
            <h2 className="font-semibold text-lg mb-1">Manage products</h2>
            <p className="text-xs text-gray mb-3">
              Currently attached products are ticked. Tick or untick products, then save. The API replaces the
              collection&apos;s product list with your selection.
            </p>
            {manageErr && <p className="text-sm text-red-700 mb-2">{manageErr}</p>}
            <div className="space-y-1 max-h-72 overflow-y-auto border border-sand rounded-lg p-3">
              {products.length === 0 && <p className="text-sm text-gray">No products loaded.</p>}
              {products.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm py-0.5">
                  <input
                    type="checkbox"
                    className="accent-[#172A3A]"
                    checked={manageSelected.includes(p.id)}
                    onChange={() => toggleManage(p.id)}
                  />
                  <span className="flex-1">{p.name}</span>
                  <span className="text-xs text-gray">{p.status && <StatusBadge status={p.status} />}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button className="btn btn-primary btn-sm" onClick={saveManage}>Save selection ({manageSelected.length})</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setManageId(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
