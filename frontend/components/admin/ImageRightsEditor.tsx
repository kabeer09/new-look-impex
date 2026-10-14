"use client";
import { useState } from "react";
import Image from "next/image";
import { api, mediaUrl } from "@/lib/api";
import type { ProductImage } from "@/lib/types";
import { RIGHTS_SOURCES } from "@/lib/types";

/**
 * Per-image rights + alt management (contract §6):
 * alt text editing, primary-image select, rights source/permission display + edit
 * via PUT /api/products/images/{iid}. Concept images carry a permanent badge.
 */
export function ImageRightsEditor({
  image,
  productName,
  onUpdated,
  onDeleted,
}: {
  image: ProductImage;
  productName: string;
  onUpdated: (next: ProductImage) => void;
  onDeleted: () => void;
}) {
  const [alt, setAlt] = useState(image.alt_text || "");
  const [rights, setRights] = useState(image.source || "");
  const [permission, setPermission] = useState(image.permission || "");
  const [primary, setPrimary] = useState(Boolean(image.is_primary));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [confirming, setConfirming] = useState(false);

  const imageId = image.id;

  const save = async () => {
    if (imageId == null) {
      setMsg("This image has no ID — re-upload it to manage rights metadata.");
      return;
    }
    setSaving(true);
    setMsg("");
    try {
      const updated = await api<ProductImage>(`/api/products/images/${encodeURIComponent(String(imageId))}`, {
        method: "PUT",
        body: JSON.stringify({
          alt_text: alt || null,
          is_primary: primary,
          rights_source: rights || undefined,
          permission: permission || undefined,
        }),
      });
      onUpdated({ ...image, ...updated, alt_text: alt || null, is_primary: primary });
      setMsg("Saved.");
    } catch (e) {
      setMsg(String(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (imageId == null) {
      onDeleted();
      return;
    }
    try {
      await api(`/api/products/images/${encodeURIComponent(String(imageId))}`, { method: "DELETE" });
      onDeleted();
    } catch (e) {
      setMsg(String(e));
    }
  };

  return (
    <div className="border border-sand p-2 space-y-2">
      <div className="relative aspect-square bg-sand overflow-hidden">
        {image.url ? (
          <Image src={mediaUrl(image.url)} alt={image.alt_text || productName} fill sizes="160px" className="object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-brass-dark font-serif font-bold">
            {productName.charAt(0)}
          </span>
        )}
        {image.is_concept && (
          <span className="absolute bottom-1 left-1 badge !bg-navy/90 !text-ivory !text-[10px]">
            Concept imagery — not a product photograph
          </span>
        )}
        {primary && <span className="absolute top-1 left-1 badge badge-brass bg-white/90 !text-[10px]">Primary</span>}
      </div>
      <div>
        <label className="label" htmlFor={`alt-${imageId ?? image.url}`}>Alt text</label>
        <input
          id={`alt-${imageId ?? image.url}`}
          className="input !py-1 !text-xs"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          placeholder={`e.g. ${productName}`}
        />
      </div>
      <div>
        <label className="label" htmlFor={`rights-${imageId ?? image.url}`}>Rights source</label>
        <select
          id={`rights-${imageId ?? image.url}`}
          className="input !py-1 !text-xs"
          value={rights}
          onChange={(e) => setRights(e.target.value)}
        >
          <option value="">— select —</option>
          {RIGHTS_SOURCES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor={`perm-${imageId ?? image.url}`}>Permission note</label>
        <input
          id={`perm-${imageId ?? image.url}`}
          className="input !py-1 !text-xs"
          value={permission}
          onChange={(e) => setPermission(e.target.value)}
          placeholder="supplier / licence ref"
        />
      </div>
      <label className="flex items-center gap-1.5 text-xs">
        <input type="checkbox" className="accent-[#172A3A]" checked={primary} onChange={(e) => setPrimary(e.target.checked)} />
        Primary image
      </label>
      {msg && <p className="text-[11px] text-gray">{msg}</p>}
      <div className="flex gap-1">
        <button className="btn btn-ghost btn-sm !px-2 flex-1" disabled={saving} onClick={() => void save()}>
          {saving ? "…" : "Save"}
        </button>
        {confirming ? (
          <button className="btn btn-danger btn-sm !px-2" onClick={() => void remove()}>Confirm</button>
        ) : (
          <button className="btn btn-ghost btn-sm !px-2 !text-red-700" onClick={() => setConfirming(true)} aria-label="Delete image">✕</button>
        )}
      </div>
    </div>
  );
}
