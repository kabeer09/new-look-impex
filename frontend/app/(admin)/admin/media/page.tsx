"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { api, apiUpload, mediaUrl } from "@/lib/api";
import type { MediaFile } from "@/lib/types";
import { RIGHTS_SOURCES } from "@/lib/types";
import { Loading, ErrorBox, EmptyState } from "@/components/public/States";

interface MediaItem extends MediaFile {
  id: number;
  filename: string;
  url: string;
  size: number;
  content_type: string;
  uploaded_at: string;
}

function MediaRightsEditor({ item, onSaved }: { item: MediaItem; onSaved: (next: MediaItem) => void }) {
  const [open, setOpen] = useState(false);
  const [alt, setAlt] = useState(item.alt_text || "");
  const [rights, setRights] = useState(item.rights_source || "");
  const [permission, setPermission] = useState(item.permission || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      const updated = await api<MediaItem>(`/api/media/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({
          alt_text: alt || null,
          rights_source: rights || undefined,
          permission: permission || undefined,
        }),
      });
      onSaved({ ...item, ...updated });
      setMsg("Saved.");
    } catch (e: any) {
      setMsg(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-2 border-t border-sand pt-2">
      {(item.rights_source || item.permission || item.alt_text) && !open && (
        <p className="text-[11px] text-gray truncate" title={`${item.rights_source || ""} ${item.permission || ""} ${item.alt_text || ""}`}>
          {[item.rights_source, item.permission].filter(Boolean).join(" · ")}
          {item.alt_text ? ` · alt: ${item.alt_text}` : ""}
        </p>
      )}
      <button className="text-[11px] text-navy hover:underline mt-1" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? "Hide rights & alt" : "Edit rights & alt"}
      </button>
      {open && (
        <div className="space-y-1.5 mt-1.5">
          <input className="input !py-1 !text-xs" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Alt text" aria-label="Alt text" />
          <select className="input !py-1 !text-xs" value={rights} onChange={(e) => setRights(e.target.value)} aria-label="Rights source">
            <option value="">— rights source —</option>
            {RIGHTS_SOURCES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <input className="input !py-1 !text-xs" value={permission} onChange={(e) => setPermission(e.target.value)} placeholder="Permission note" aria-label="Permission note" />
          {msg && <p className="text-[11px] text-gray">{msg}</p>}
          <button className="btn btn-ghost btn-sm !px-2 w-full" disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save metadata"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminMedia() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [upRights, setUpRights] = useState("");
  const [upPermission, setUpPermission] = useState("");
  const [upAlt, setUpAlt] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    setErr("");
    api<{ items: MediaItem[] }>("/api/media?page_size=100")
      .then((d) => setItems(d.items || []))
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setMsg("");
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files", f));
      if (upRights) fd.append("rights_source", upRights);
      if (upPermission) fd.append("permission", upPermission);
      if (upAlt) fd.append("alt_text", upAlt);
      const res = await apiUpload<{ file?: MediaFile; files?: MediaFile[] }>("/api/media", fd);
      const uploaded = res.files || (res.file ? [res.file] : []);
      setMsg(`${uploaded.length} file(s) uploaded.`);
      load();
    } catch (e: any) {
      setMsg(String(e));
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: number) => {
    setMsg("");
    try {
      await api(`/api/media/${id}`, { method: "DELETE" });
      setConfirmDelete(null);
      setMsg("File deleted.");
      load();
    } catch (e: any) {
      setMsg(String(e));
    }
  };

  const copyUrl = async (id: number, url: string) => {
    const absolute = url.startsWith("http") ? url : `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(id);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setMsg("Copy failed — clipboard unavailable.");
    }
  };

  const fmtSize = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Media library</h1>
        <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? "Uploading…" : "Upload files"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => { void onFiles(e.target.files); e.target.value = ""; }}
        />
      </div>
      <p className="text-xs text-gray">Files are served publicly at /api/media/files/&lt;filename&gt; — URLs can be pasted into product/category/collection image fields.</p>
      <div className="card !p-3 grid sm:grid-cols-3 gap-2">
        <label className="text-xs">Image rights
          <select className="input mt-1" value={upRights} onChange={(e) => setUpRights(e.target.value)} aria-label="Image rights for uploads">
            <option value="">Set later (edit after upload)</option>
            <option value="own">Own photography</option>
            <option value="supplier_authorised">Supplier-authorised</option>
            <option value="licensed">Licensed</option>
            <option value="ai_generated">AI-generated concept</option>
          </select>
        </label>
        <label className="text-xs">Permission note
          <input className="input mt-1" value={upPermission} onChange={(e) => setUpPermission(e.target.value)} placeholder="Supplier / licence ref" aria-label="Permission note for uploads" />
        </label>
        <label className="text-xs">Alt text
          <input className="input mt-1" value={upAlt} onChange={(e) => setUpAlt(e.target.value)} placeholder="Describe the image" aria-label="Alt text for uploads" />
        </label>
      </div>
      {msg && <p className="text-sm">{msg}</p>}
      {loading && <Loading label="Loading media…" />}
      {err && <ErrorBox error={err} retry={load} />}
      {!loading && !err && items.length === 0 && <EmptyState title="No media yet" hint="Upload images to use them across the catalogue." />}
      {!loading && !err && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((m) => (
            <div key={m.id} className="card !p-3">
              <div className="relative aspect-square bg-sand rounded-lg overflow-hidden">
                {m.content_type?.startsWith("image/") ? (
                  <Image src={mediaUrl(m.url)} alt={m.filename} fill sizes="160px" className="object-cover" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-xs text-gray">file</span>
                )}
              </div>
              <p className="text-xs font-medium mt-2 truncate" title={m.filename}>{m.filename}</p>
              <p className="text-[11px] text-gray">{m.content_type || "file"} · {fmtSize(m.size || 0)}</p>
              <p className="text-[11px] text-gray truncate" title={m.url}>{m.url}</p>
              <MediaRightsEditor item={m} onSaved={(next) => setItems((arr) => arr.map((x) => (x.id === m.id ? next : x)))} />
              <div className="flex gap-1 mt-2">
                <button className="btn btn-ghost btn-sm !px-2" onClick={() => void copyUrl(m.id, m.url)} aria-label={`Copy URL for ${m.filename}`}>
                  {copied === m.id ? "Copied ✓" : "Copy URL"}
                </button>
                {confirmDelete === m.id ? (
                  <button className="btn btn-danger btn-sm !px-2" onClick={() => void remove(m.id)}>Confirm</button>
                ) : (
                  <button className="btn btn-ghost btn-sm !px-2 !text-red-700" onClick={() => setConfirmDelete(m.id)} aria-label={`Delete ${m.filename}`}>✕</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
