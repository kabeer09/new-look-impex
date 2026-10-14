"use client";
import { useCallback, useEffect, useState } from "react";
import { api, mediaUrl } from "@/lib/api";
import type { Category, CategoryInput } from "@/lib/types";
import { Loading, ErrorBox, EmptyState } from "@/components/public/States";
import { AiSeoAssistant } from "@/components/admin/AiSeoAssistant";

export default function AdminCategories() {
  const [items, setItems] = useState<Category[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState<Category | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CategoryInput>({ name: "" });
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setErr("");
    api<Category[]>("/api/categories")
      .then((d) => setItems(Array.isArray(d) ? d : (d as any).items || []))
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const startCreate = () => {
    setEditing(null);
    setFormOpen(true);
    setForm({ name: "" });
  };

  const startEdit = (c: Category) => {
    setEditing(c);
    setFormOpen(true);
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description || "",
      image_url: c.image_url || "",
      parent_id: c.parent_id ?? null,
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
        await api(`/api/categories/${editing.id}`, { method: "PUT", body: JSON.stringify(form) });
        setMsg("Category updated.");
      } else {
        await api("/api/categories", { method: "POST", body: JSON.stringify(form) });
        setMsg("Category created.");
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
      await api(`/api/categories/${id}`, { method: "DELETE" });
      setConfirmDelete(null);
      load();
    } catch (e: any) {
      setMsg(String(e));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories</h1>
        <button className="btn btn-primary btn-sm" onClick={startCreate}>+ New category</button>
      </div>
      {msg && <p className="text-sm">{msg}</p>}
      {loading && <Loading label="Loading categories…" />}
      {err && <ErrorBox error={err} retry={load} />}
      {!loading && !err && items.length === 0 && <EmptyState title="No categories" hint="Create the first category." />}
      {!loading && !err && items.length > 0 && (
        <div className="card !p-0 overflow-x-auto">
          <table className="data">
            <thead><tr><th>Name</th><th>Slug</th><th>Products</th><th>Featured</th><th>Parent</th><th className="text-right">Actions</th></tr></thead>
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
                  <td>{c.parent_id ? `#${c.parent_id}` : "—"}</td>
                  <td className="text-right whitespace-nowrap">
                    <button className="btn btn-ghost btn-sm" onClick={() => startEdit(c)}>Edit</button>{" "}
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
          <h2 className="font-semibold mb-3">{editing ? `Edit: ${editing.name}` : "New category"}</h2>
          <CategoryForm form={form} setForm={setForm} editingId={editing ? editing.id : null} onSave={save} onCancel={() => { setEditing(null); setFormOpen(false); setForm({ name: "" }); }} />
        </div>
      )}
    </div>
  );
}

function CategoryForm({ form, setForm, editingId, onSave, onCancel }: {
  form: CategoryInput;
  setForm: (f: CategoryInput) => void;
  editingId: number | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  const set = <K extends keyof CategoryInput>(key: K, value: CategoryInput[K]) => setForm({ ...form, [key]: value });
  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="c-name">Name *</label>
          <input id="c-name" className="input" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="c-slug">Slug</label>
          <input id="c-slug" className="input" value={form.slug || ""} onChange={(e) => set("slug", e.target.value)} placeholder="auto if empty" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="c-desc">Description</label>
        <textarea id="c-desc" rows={3} className="input" value={form.description || ""} onChange={(e) => set("description", e.target.value)} />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="c-img">Image URL</label>
          <input id="c-img" className="input" value={form.image_url || ""} onChange={(e) => set("image_url", e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="c-parent">Parent category ID</label>
          <input id="c-parent" type="number" className="input" value={form.parent_id != null ? String(form.parent_id) : ""} onChange={(e) => set("parent_id", e.target.value ? Number(e.target.value) : null)} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="c-seot">SEO title</label>
          <input id="c-seot" className="input" value={form.seo_title || ""} onChange={(e) => set("seo_title", e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="c-seod">SEO description</label>
          <input id="c-seod" className="input" value={form.seo_description || ""} onChange={(e) => set("seo_description", e.target.value)} />
        </div>
      </div>
      <div className="flex gap-4 items-center">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-[#172A3A]" checked={Boolean(form.featured)} onChange={(e) => set("featured", e.target.checked)} />
          Featured
        </label>
        <div>
          <label className="label" htmlFor="c-sort">Sort order</label>
          <input id="c-sort" type="number" className="input max-w-[120px]" value={form.sort_order ?? 0} onChange={(e) => set("sort_order", Number(e.target.value))} />
        </div>
      </div>
      <div className="flex gap-2">
        <button className="btn btn-primary" onClick={onSave}>Save</button>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
      {editingId !== null && (
        <AiSeoAssistant
          entityType="category"
          entityId={editingId}
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
  );
}
