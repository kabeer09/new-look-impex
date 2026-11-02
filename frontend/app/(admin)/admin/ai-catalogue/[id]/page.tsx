"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, mediaUrl, variantUrl } from "@/lib/api";
import type {
  CatalogueDetail,
  CataloguePreview,
  CatalogueProductFields,
  ImageSeo,
  KeywordGroups,
  PipelineStatus,
  SeoMetadata,
} from "@/lib/types";
import { Loading, ErrorBox } from "@/components/public/States";

type Tab =
  | "basic"
  | "descriptions"
  | "b2b"
  | "seo"
  | "keywords"
  | "image_seo"
  | "schema"
  | "preview";

const TABS: { id: Tab; label: string }[] = [
  { id: "basic", label: "Basic Info" },
  { id: "descriptions", label: "Description" },
  { id: "b2b", label: "B2B" },
  { id: "seo", label: "SEO Metadata" },
  { id: "keywords", label: "Keywords" },
  { id: "image_seo", label: "Image SEO" },
  { id: "schema", label: "Schema" },
  { id: "preview", label: "Preview" },
];

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending", analyzing: "Analyzing", ai_generated: "AI Generated",
  needs_review: "Needs Review", approved: "Approved", published: "Published",
  failed: "Failed", missing: "No profile",
};

const DESC_FIELDS: { key: string; label: string; rows: number }[] = [
  { key: "short", label: "Short description (50–80 words)", rows: 3 },
  { key: "detailed", label: "Detailed description (150–250 words)", rows: 6 },
  { key: "b2b", label: "B2B wholesale description", rows: 4 },
  { key: "manufacturer", label: "Manufacturer / exporter description", rows: 4 },
  { key: "indiamart", label: "IndiaMART-style description", rows: 4 },
  { key: "buyer", label: "International buyer description", rows: 4 },
];

const KEYWORD_GROUPS: { key: keyof KeywordGroups; label: string }[] = [
  { key: "primary", label: "Primary keyword" },
  { key: "secondary", label: "Secondary" },
  { key: "long_tail", label: "Long-tail" },
  { key: "buyer_intent", label: "Buyer intent" },
  { key: "manufacturer", label: "Manufacturer" },
  { key: "supplier", label: "Supplier" },
  { key: "exporter", label: "Exporter" },
  { key: "wholesale", label: "Wholesale" },
  { key: "bulk_order", label: "Bulk order" },
  { key: "country_specific", label: "Country-specific" },
];

const B2B_FIELDS: { key: string; label: string }[] = [
  { key: "manufacturer_overview", label: "Manufacturer overview" },
  { key: "exporter_overview", label: "Exporter overview" },
  { key: "supplier_intro", label: "Supplier intro" },
  { key: "wholesale_info", label: "Wholesale info" },
  { key: "bulk_order_info", label: "Bulk order info" },
  { key: "customization", label: "Customization" },
  { key: "packaging", label: "Packaging" },
  { key: "export_markets", label: "Export markets" },
];

function Field({ label, value, onChange, rows }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {rows ? (
        <textarea className="input" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        });
      }}
    >
      {done ? "Copied ✓" : label}
    </button>
  );
}

function KeywordGroup({ label, items, onEdit }: {
  label: string; items: string[]; onEdit?: (next: string[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(items.join(", "));
  if (!items.length && !onEdit) return null;
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="label !mb-0">{label}</span>
        <div className="flex gap-1">
          <CopyButton text={items.join(", ")} label="Copy" />
          {onEdit && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing((v) => !v)}>
              {editing ? "Done" : "Edit"}
            </button>
          )}
        </div>
      </div>
      {editing && onEdit ? (
        <textarea
          className="input"
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => onEdit(draft.split(",").map((s) => s.trim()).filter(Boolean))}
          aria-label={`${label} keywords (comma separated)`}
        />
      ) : (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {items.map((k) => (
            <span key={k} className="px-2 py-0.5 rounded-full bg-ivory border border-brass/30 text-xs">
              {k}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AiCatalogueEditor() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [tab, setTab] = useState<Tab>("basic");
  const [data, setData] = useState<CatalogueDetail | null>(null);
  const [preview, setPreview] = useState<CataloguePreview | null>(null);
  const [fields, setFields] = useState<Partial<CatalogueProductFields>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const d = await api<CatalogueDetail>(`/api/catalogue/products/${id}`);
      setData(d);
      setFields(d.product_fields || {});
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (tab === "preview" && data && !preview) {
      api<CataloguePreview>(`/api/catalogue/products/${id}/preview`)
        .then(setPreview)
        .catch((e) => setError(String(e)));
    }
  }, [tab, data, preview, id]);

  const patchProfile = (section: string, value: unknown) => {
    setData((d) =>
      d ? { ...d, profile: { ...d.profile, [section]: value } } : d,
    );
  };

  const save = async (extra?: Record<string, unknown>) => {
    setBusy("save");
    setFlash("");
    try {
      const res = await api<{ product: CatalogueDetail["product"]; profile: CatalogueDetail["profile"] }>(
        `/api/catalogue/products/${id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            product_fields: { ...fields, ...(extra?.product_fields as object || {}) },
            sections: {
              descriptions: data?.profile.descriptions,
              keywords: data?.profile.keywords,
              seo: data?.profile.seo,
              image_seo: data?.profile.image_seo,
              b2b: data?.profile.b2b,
              schema: data?.profile.schema,
              ...(extra?.sections as object || {}),
            },
          }),
        },
      );
      setData((d) => (d ? { ...d, product: res.product, profile: res.profile } : d));
      setFlash("Saved.");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy("");
    }
  };

  const analyze = async () => {
    setBusy("analyze");
    setFlash("");
    try {
      // Analyze returns {product, profile} only — reload the full detail
      // (it also carries product_fields) so the editor stays in sync.
      await api<CatalogueDetail>(`/api/catalogue/products/${id}/analyze`, { method: "POST" });
      await load();
      setPreview(null);
      setFlash("Analysis complete — review the generated content, then approve.");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy("");
    }
  };

  const regenerate = async (sections: string[]) => {
    setBusy("regen");
    setFlash("");
    try {
      const res = await api<{ product: CatalogueDetail["product"]; profile: CatalogueDetail["profile"] }>(
        `/api/catalogue/products/${id}/regenerate`,
        { method: "POST", body: JSON.stringify({ sections }) },
      );
      setData((d) => (d ? { ...d, product: res.product, profile: res.profile } : d));
      setPreview(null);
      setFlash(`Regenerated: ${sections.join(", ")}.`);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy("");
    }
  };

  const transition = async (action: "approve" | "publish" | "unpublish") => {
    setBusy(action);
    setFlash("");
    try {
      const res = await api<{ product: CatalogueDetail["product"]; profile: CatalogueDetail["profile"] }>(
        `/api/catalogue/products/${id}/${action}`,
        { method: "POST" },
      );
      setData((d) => (d ? { ...d, product: res.product, profile: res.profile } : d));
      setFlash(
        action === "approve"
          ? "Content approved and applied to the product."
          : action === "publish"
            ? "Product is now live on the public site."
            : "Product unpublished (back to draft).",
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy("");
    }
  };

  if (loading) return <Loading label="Loading product…" />;
  if (!data) return <ErrorBox error={error || "Product not found"} retry={() => void load()} />;

  const { product, profile, images } = data;
  const desc = profile.descriptions || {};
  const kw = (profile.keywords || {}) as Partial<KeywordGroups>;
  const seo = (profile.seo || {}) as Partial<SeoMetadata>;
  const b2b = profile.b2b || {};

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link href="/admin/ai-catalogue" className="text-xs text-gray hover:underline">
            ← AI Catalogue
          </Link>
          <h1 className="text-xl font-serif font-bold">{product.name}</h1>
          <p className="text-xs text-gray">
            Pipeline: <span className="font-semibold">{STATUS_LABEL[profile.status] || profile.status}</span>
            {" · "}Source: {profile.source || "—"}
            {profile.status === "published" && product.slug && (
              <>
                {" · "}
                <a href={data.public_url} target="_blank" rel="noreferrer" className="text-brass hover:underline">
                  View live ↗
                </a>
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-ghost btn-sm" disabled={busy === "analyze"} onClick={() => void analyze()}>
            {busy === "analyze" ? "Analyzing…" : "Analyze with AI"}
          </button>
          <button className="btn btn-ghost btn-sm" disabled={busy === "save" || busy === "analyze"} onClick={() => void save()}>
            {busy === "save" ? "Saving…" : "Save edits"}
          </button>
          {profile.status !== "approved" && profile.status !== "published" && (
            <button className="btn btn-sm btn-primary" disabled={busy === "approve"} onClick={() => void transition("approve")}>
              Approve
            </button>
          )}
          {profile.status === "approved" && (
            <button className="btn btn-sm btn-primary" disabled={busy === "publish"} onClick={() => void transition("publish")}>
              Publish
            </button>
          )}
          {product.status === "published" && (
            <button className="btn btn-sm btn-ghost" disabled={busy === "unpublish"} onClick={() => void transition("unpublish")}>
              Unpublish
            </button>
          )}
        </div>
      </div>

      {flash && <p className="text-sm bg-brass/10 border border-brass/30 rounded-lg px-3 py-2">{flash}</p>}
      {error && <ErrorBox error={error} />}
      {profile.error && (
        <p className="text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700">
          Last analysis error: {profile.error}
        </p>
      )}
      {(profile.needs_verification || []).length > 0 && (
        <div className="card !py-3 text-xs">
          <p className="font-semibold text-amber-800 mb-1">
            Requires verification ({profile.needs_verification.length}) — never published as fact:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {profile.needs_verification.map((n) => (
              <span key={n} className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800">
                {n}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap border-b border-ivory">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`px-3 py-1.5 text-sm rounded-t-lg ${tab === t.id ? "bg-navy text-white font-semibold" : "text-gray hover:bg-ivory"}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ---------------- Basic Info ---------------- */}
      {tab === "basic" && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card space-y-3">
            <h3 className="font-semibold">Product fields</h3>
            <Field label="Name" value={fields.name ?? product.name} onChange={(v) => setFields((f) => ({ ...f, name: v }))} />
            <Field label="Slug" value={fields.slug ?? product.slug} onChange={(v) => setFields((f) => ({ ...f, slug: v }))} />
            <Field label="Material" value={fields.material ?? ""} onChange={(v) => setFields((f) => ({ ...f, material: v }))} />
            <Field label="Finish" value={fields.finish ?? ""} onChange={(v) => setFields((f) => ({ ...f, finish: v }))} />
            <Field label="Colour" value={fields.color ?? ""} onChange={(v) => setFields((f) => ({ ...f, color: v }))} />
            <Field label="Dimensions (only if verified)" value={fields.dimensions ?? ""} onChange={(v) => setFields((f) => ({ ...f, dimensions: v }))} />
            <Field label="Weight (only if verified)" value={fields.weight ?? ""} onChange={(v) => setFields((f) => ({ ...f, weight: v }))} />
            <Field label="SKU" value={fields.sku ?? ""} onChange={(v) => setFields((f) => ({ ...f, sku: v }))} />
            <Field label="MOQ (only if confirmed)" value={fields.moq ?? ""} onChange={(v) => setFields((f) => ({ ...f, moq: v }))} />
            <Field label="Lead time (only if confirmed)" value={fields.lead_time ?? ""} onChange={(v) => setFields((f) => ({ ...f, lead_time: v }))} />
            <Field label="Packaging info" value={fields.packaging_info ?? ""} rows={2} onChange={(v) => setFields((f) => ({ ...f, packaging_info: v }))} />
            <button className="btn btn-primary btn-sm" disabled={busy === "save"} onClick={() => void save()}>
              Save basic info
            </button>
          </div>
          <div className="space-y-4">
            <div className="card space-y-2">
              <h3 className="font-semibold">Observed facts (from image)</h3>
              {(profile.observed_facts || []).length === 0 && (
                <p className="text-xs text-gray">No vision analysis yet — run “Analyze with AI”.</p>
              )}
              <ul className="list-disc pl-5 text-sm space-y-0.5">
                {(profile.observed_facts || []).map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {(profile.assumptions || []).length > 0 && (
                <>
                  <p className="text-xs font-semibold text-amber-800 mt-2">Assumptions (unconfirmed):</p>
                  <ul className="list-disc pl-5 text-sm space-y-0.5 text-amber-800">
                    {profile.assumptions.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <div className="card space-y-2">
              <h3 className="font-semibold">Images ({images.length})</h3>
              <div className="grid grid-cols-3 gap-2">
                {images.map((im) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={im.id}
                    src={variantUrl(im.url, "thumb") || mediaUrl(im.url)}
                    alt={im.alt_text || product.name}
                    className="rounded border border-ivory aspect-square object-cover"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Descriptions ---------------- */}
      {tab === "descriptions" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-sm" disabled={busy === "regen"} onClick={() => void regenerate(["descriptions"])}>
              Regenerate all descriptions
            </button>
            <CopyButton text={Object.values(desc).filter((v) => typeof v === "string").join("\n\n")} label="Copy all" />
          </div>
          <div className="card space-y-3">
            {DESC_FIELDS.map(({ key, label, rows }) => (
              <div key={key}>
                <div className="flex items-center justify-between">
                  <span className="label !mb-0">{label}</span>
                  <CopyButton text={String(desc[key] || "")} />
                </div>
                <textarea
                  className="input"
                  rows={rows}
                  value={String(desc[key] || "")}
                  onChange={(e) => patchProfile("descriptions", { ...desc, [key]: e.target.value })}
                />
              </div>
            ))}
            <div>
              <span className="label">Highlights</span>
              <textarea
                className="input"
                rows={3}
                value={(desc.highlights || []).join("\n")}
                onChange={(e) =>
                  patchProfile("descriptions", {
                    ...desc,
                    highlights: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                  })
                }
                aria-label="Highlights (one per line)"
              />
            </div>
            <button className="btn btn-primary btn-sm" disabled={busy === "save"} onClick={() => void save()}>
              Save descriptions
            </button>
          </div>
        </div>
      )}

      {/* ---------------- B2B ---------------- */}
      {tab === "b2b" && (
        <div className="space-y-4">
          <button className="btn btn-ghost btn-sm" disabled={busy === "regen"} onClick={() => void regenerate(["b2b"])}>
            Regenerate B2B copy
          </button>
          <div className="card space-y-3">
            {B2B_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <div className="flex items-center justify-between">
                  <span className="label !mb-0">{label}</span>
                  <CopyButton text={String(b2b[key] || "")} />
                </div>
                <textarea
                  className="input"
                  rows={3}
                  value={String(b2b[key] || "")}
                  onChange={(e) => patchProfile("b2b", { ...b2b, [key]: e.target.value })}
                />
              </div>
            ))}
            <button className="btn btn-primary btn-sm" disabled={busy === "save"} onClick={() => void save()}>
              Save B2B info
            </button>
          </div>
        </div>
      )}
      {/* ---------------- SEO Metadata ---------------- */}
      {tab === "seo" && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Google metadata</h3>
              <button className="btn btn-ghost btn-sm" disabled={busy === "regen"} onClick={() => void regenerate(["seo"])}>
                Regenerate SEO
              </button>
            </div>
            <Field
              label={`SEO title (${(seo.title || "").length}/60)`}
              value={fields.seo_title ?? seo.title ?? ""}
              onChange={(v) => {
                setFields((f) => ({ ...f, seo_title: v }));
                patchProfile("seo", { ...seo, title: v });
              }}
            />
            <Field
              label={`Meta description (${(seo.meta_description || "").length}/160)`}
              rows={3}
              value={fields.seo_description ?? seo.meta_description ?? ""}
              onChange={(v) => {
                setFields((f) => ({ ...f, seo_description: v }));
                patchProfile("seo", { ...seo, meta_description: v });
              }}
            />
            <Field label="Focus keyword" value={seo.focus_keyword || ""} onChange={(v) => patchProfile("seo", { ...seo, focus_keyword: v })} />
            <Field label="Slug" value={seo.slug || product.slug} onChange={(v) => patchProfile("seo", { ...seo, slug: v })} />
            <Field label="Canonical URL" value={seo.canonical_url || ""} onChange={(v) => patchProfile("seo", { ...seo, canonical_url: v })} />
            <Field label="OG title" value={seo.og_title || ""} onChange={(v) => patchProfile("seo", { ...seo, og_title: v })} />
            <Field label="OG description" rows={2} value={seo.og_description || ""} onChange={(v) => patchProfile("seo", { ...seo, og_description: v })} />
            <Field label="OG image URL" value={seo.og_image || ""} onChange={(v) => patchProfile("seo", { ...seo, og_image: v })} />
            <div>
              <span className="label">Secondary focus keywords</span>
              <input
                className="input"
                value={(seo.secondary_focus || []).join(", ")}
                onChange={(e) =>
                  patchProfile("seo", {
                    ...seo,
                    secondary_focus: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  })
                }
                aria-label="Secondary focus keywords (comma separated)"
              />
            </div>
            <button className="btn btn-primary btn-sm" disabled={busy === "save"} onClick={() => void save()}>
              Save SEO metadata
            </button>
          </div>
          <div className="space-y-4">
            <div className="card">
              <p className="text-xs font-semibold text-gray uppercase tracking-wide mb-2">Google SERP preview</p>
              <div className="border border-ivory rounded-lg p-3 bg-white">
                <p className="text-[15px] text-blue-800 leading-tight">
                  {(fields.seo_title || seo.title || product.name).slice(0, 60)}
                </p>
                <p className="text-xs text-green-800">{data.public_url}</p>
                <p className="text-xs text-gray mt-1">
                  {(fields.seo_description || seo.meta_description || "").slice(0, 165)}
                </p>
              </div>
              <p className="text-[11px] text-gray mt-2">
                Title ≤ 60 chars and meta ≤ 160 chars are recommended by Google.
              </p>
            </div>
            <div className="card text-xs text-gray space-y-1">
              <p className="font-semibold text-navy">SEO completeness</p>
              <p>Title: {product.seo_title || seo.title ? "✓" : "✗"}</p>
              <p>Meta description: {product.seo_description || seo.meta_description ? "✓" : "✗"}</p>
              <p>Description: {product.has_description ? "✓" : "✗"}</p>
              <p>Primary keyword: {kw.primary ? "✓" : "✗"}</p>
              <p>Image: {product.image_count > 0 ? "✓" : "✗"}</p>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Keywords ---------------- */}
      {tab === "keywords" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-sm" disabled={busy === "regen"} onClick={() => void regenerate(["keywords"])}>
              Regenerate keywords
            </button>
            <CopyButton
              text={[kw.primary, ...(kw.secondary || []), ...(kw.long_tail || [])].filter(Boolean).join(", ")}
              label="Copy primary + secondary"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="card space-y-4">
              {KEYWORD_GROUPS.slice(0, 5).map(({ key, label }) => (
                <KeywordGroup
                  key={key}
                  label={label}
                  items={key === "primary" ? (kw.primary ? [kw.primary] : []) : ((kw[key] as string[]) || [])}
                  onEdit={
                    key === "primary"
                      ? (next) => patchProfile("keywords", { ...kw, primary: next[0] || "" })
                      : (next) => patchProfile("keywords", { ...kw, [key]: next })
                  }
                />
              ))}
            </div>
            <div className="card space-y-4">
              {KEYWORD_GROUPS.slice(5).map(({ key, label }) => (
                <KeywordGroup
                  key={key}
                  label={label}
                  items={(kw[key] as string[]) || []}
                  onEdit={(next) => patchProfile("keywords", { ...kw, [key]: next })}
                />
              ))}
            </div>
          </div>
          <button className="btn btn-primary btn-sm" disabled={busy === "save"} onClick={() => void save()}>
            Save keywords
          </button>
        </div>
      )}

      {/* ---------------- Image SEO ---------------- */}
      {tab === "image_seo" && (
        <div className="space-y-4">
          <button className="btn btn-ghost btn-sm" disabled={busy === "regen"} onClick={() => void regenerate(["image_seo"])}>
            Regenerate image SEO
          </button>
          {(profile.image_seo || []).length === 0 ? (
            <p className="text-sm text-gray">No image SEO generated yet — run “Analyze with AI”.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {(profile.image_seo || []).map((im: ImageSeo, i: number) => (
                <div key={`${im.filename}-${i}`} className="card space-y-2">
                  <p className="text-xs font-semibold text-gray truncate">{im.filename}</p>
                  <Field
                    label="Alt text"
                    value={im.alt_text}
                    onChange={(v) =>
                      patchProfile(
                        "image_seo",
                        (profile.image_seo || []).map((x, j) => (j === i ? { ...x, alt_text: v } : x)),
                      )
                    }
                  />
                  <Field
                    label="Title"
                    value={im.title}
                    onChange={(v) =>
                      patchProfile(
                        "image_seo",
                        (profile.image_seo || []).map((x, j) => (j === i ? { ...x, title: v } : x)),
                      )
                    }
                  />
                  <Field
                    label="Caption"
                    value={im.caption}
                    onChange={(v) =>
                      patchProfile(
                        "image_seo",
                        (profile.image_seo || []).map((x, j) => (j === i ? { ...x, caption: v } : x)),
                      )
                    }
                  />
                  <Field
                    label="Description"
                    rows={2}
                    value={im.description}
                    onChange={(v) =>
                      patchProfile(
                        "image_seo",
                        (profile.image_seo || []).map((x, j) => (j === i ? { ...x, description: v } : x)),
                      )
                    }
                  />
                </div>
              ))}
            </div>
          )}
          <button className="btn btn-primary btn-sm" disabled={busy === "save"} onClick={() => void save()}>
            Save image SEO
          </button>
        </div>
      )}

      {/* ---------------- Schema ---------------- */}
      {tab === "schema" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-sm" disabled={busy === "regen"} onClick={() => void regenerate(["schema"])}>
              Regenerate schema
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(profile.schema || {}).map(([key, value]) => (
              <div key={key} className="card">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold capitalize">{key}</p>
                  <CopyButton text={JSON.stringify(value, null, 2)} />
                </div>
                <pre className="text-[11px] bg-navy text-ivory rounded p-2 overflow-x-auto max-h-72">
                  {JSON.stringify(value, null, 2)}
                </pre>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray">
            Product schema deliberately excludes price, availability and ratings — this is a
            price-on-request B2B catalogue and those values would be fabricated.
          </p>
        </div>
      )}

      {/* ---------------- Preview ---------------- */}
      {tab === "preview" && (
        <div id="preview" className="space-y-4">
          {!preview ? (
            <Loading label="Loading preview…" />
          ) : (
            <>
              <div className="card">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray uppercase tracking-wide">Google SERP preview</p>
                  <CopyButton text={`${preview.google_preview.title}\n${preview.google_preview.description}`} />
                </div>
                <div className="border border-ivory rounded-lg p-3 bg-white max-w-xl">
                  <p className="text-[15px] text-blue-800 leading-tight">{preview.google_preview.title}</p>
                  <p className="text-xs text-green-800">{preview.google_preview.url}</p>
                  <p className="text-xs text-gray mt-1">{preview.google_preview.description}</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="card space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">IndiaMART-style description</p>
                    <CopyButton text={preview.copy_blocks.indiamart_description} />
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{preview.copy_blocks.indiamart_description}</p>
                </div>
                <div className="card space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">B2B description</p>
                    <CopyButton text={preview.copy_blocks.b2b_description} />
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{preview.copy_blocks.b2b_description}</p>
                </div>
                <div className="card space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">SEO keywords</p>
                    <CopyButton text={preview.copy_blocks.seo_keywords.all.join(", ")} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {preview.copy_blocks.seo_keywords.all.map((k) => (
                      <span key={k} className="px-2 py-0.5 rounded-full bg-ivory border border-brass/30 text-xs">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="card space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Image alt texts</p>
                    <CopyButton text={preview.copy_blocks.image_alt_texts.join("\n")} />
                  </div>
                  <ul className="text-sm list-disc pl-5 space-y-0.5">
                    {preview.copy_blocks.image_alt_texts.map((a, i) => (
                      <li key={`${a}-${i}`}>{a}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="card">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold">JSON-LD (structured data)</p>
                  <CopyButton text={JSON.stringify(preview.json_ld, null, 2)} label="Copy JSON-LD" />
                </div>
                <pre className="text-[11px] bg-navy text-ivory rounded p-3 overflow-x-auto max-h-80">
                  {JSON.stringify(preview.json_ld, null, 2)}
                </pre>
              </div>
              <p className="text-[11px] text-gray">{preview.note}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
