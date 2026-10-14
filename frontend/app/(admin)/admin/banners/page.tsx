"use client";
import { useCallback, useEffect, useState } from "react";
import { api, mediaUrl } from "@/lib/api";
import type { Banner } from "@/lib/types";
import { Loading, ErrorBox, EmptyState } from "@/components/public/States";

interface WatcherStatus {
  enabled: boolean;
  dir: string;
  interval_seconds: number;
  auto_publish: boolean;
  rights: string;
  last_run: { at: string | null; products: number; banners: number; failed: number; error: string };
}

export default function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [watch, setWatch] = useState<WatcherStatus | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setErr("");
    Promise.allSettled([
      api<{ items: Banner[] }>("/api/banners"),
      api<WatcherStatus>("/api/admin/watcher"),
    ]).then(([b, w]) => {
      if (b.status === "fulfilled") setBanners(b.value.items || []);
      else setErr(String(b.reason));
      if (w.status === "fulfilled") setWatch(w.value);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const patch = async (b: Banner, p: Partial<Banner>) => {
    setMsg("");
    try {
      const res = await api<Banner>(`/api/banners/${b.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...b, ...p }),
      });
      setBanners((bs) => bs.map((x) => (x.id === b.id ? res : x)));
      setMsg(`Saved “${b.title || `#${b.id}`}”.`);
    } catch (e) {
      setMsg(String(e));
    }
  };

  const remove = async (id: number) => {
    setMsg("");
    try {
      await api(`/api/banners/${id}`, { method: "DELETE" });
      setBanners((bs) => bs.filter((x) => x.id !== id));
      setConfirmDelete(null);
      setMsg("Banner deleted.");
    } catch (e) {
      setMsg(String(e));
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Banners</h1>
      <div className="card text-sm space-y-1">
        <p>
          <b>Automatic:</b> drop banner images (JPEG/PNG/WebP) into{" "}
          <span className="font-mono">incoming/banners/</span> in the project — they appear
          on the homepage hero within ~{watch?.interval_seconds ?? 60} seconds, no redeploy.
        </p>
        <p className="text-xs text-gray">
          Drop-folder watcher:{" "}
          <span className={`badge ${watch?.enabled ? "badge-green" : "badge-gray"}`}>
            {watch == null ? "checking…" : watch.enabled ? "enabled" : "disabled (INCOMING_ENABLED)"}
          </span>
          {watch?.last_run?.at && (
            <span className="ml-2">
              Last scan {new Date(watch.last_run.at).toLocaleString()} —{" "}
              {watch.last_run.banners} banner(s), {watch.last_run.products} product(s)
              {watch.last_run.failed > 0 && `, ${watch.last_run.failed} failed`}
              {watch.last_run.error && ` — error: ${watch.last_run.error}`}
            </span>
          )}
        </p>
      </div>
      {msg && <p className="text-sm">{msg}</p>}
      {loading && <Loading label="Loading banners…" />}
      {err && <ErrorBox error={err} retry={load} />}
      {!loading && !err && banners.length === 0 && (
        <EmptyState title="No banners yet" hint="Drop an image into incoming/banners/ and it will appear here." />
      )}
      {!loading && !err && banners.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {banners.map((b) => (
            <div key={b.id} className="card !p-3 space-y-2">
              <div className="relative aspect-[16/9] bg-sand overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl(b.image_url)} alt={b.title} className="absolute inset-0 w-full h-full object-cover" />
              </div>
              <input
                className="input !py-1 !text-sm font-semibold"
                value={b.title}
                onChange={(e) => setBanners((bs) => bs.map((x) => (x.id === b.id ? { ...x, title: e.target.value } : x)))}
                onBlur={(e) => { if (e.target.value !== b.title) void patch(b, { title: e.target.value }); }}
                aria-label="Banner title"
              />
              <div className="grid grid-cols-3 gap-2 items-center text-xs">
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={b.is_active} onChange={(e) => void patch(b, { is_active: e.target.checked })} />
                  Active
                </label>
                <label>Order
                  <input
                    type="number" min={0} className="input !py-1 !text-xs ml-1 !w-16"
                    value={b.sort_order ?? 0}
                    onChange={(e) => void patch(b, { sort_order: Number(e.target.value) || 0 })}
                    aria-label="Sort order"
                  />
                </label>
                {confirmDelete === b.id ? (
                  <span className="flex gap-1">
                    <button className="btn btn-danger btn-sm" onClick={() => void remove(b.id)}>Confirm</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(null)}>Keep</button>
                  </span>
                ) : (
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(b.id)}>Delete</button>
                )}
              </div>
              {b.cta_link && <p className="text-[11px] text-gray">Link: {b.cta_link}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
