"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, apiUpload } from "@/lib/api";
import type { Category, Collection, ProductDetail, ProductInput, ProductSpec, ProductVariant, ProductImage } from "@/lib/types";
import { Loading, ErrorBox, StatusBadge } from "@/components/public/States";
import { AiSeoAssistant } from "@/components/admin/AiSeoAssistant";
import { AiFieldButton } from "@/components/admin/AiFieldButton";
import { ImageRightsEditor } from "@/components/admin/ImageRightsEditor";
// StatusBadge is exported from components/public/States.

interface FormState {
  name: string;
  description: string;
  short_description: string;
  category_id: string;
  material: string;
  finish: string;
  color: string;
  dimensions: string;
  weight: string;
  sku: string;
  tags: string;
  moq: string;
  lead_time: string;
  packaging_info: string;
  price: string;
  currency: string;
  price_on_request: boolean;
  featured: boolean;
  status: "draft" | "published" | "archived";
  slug: string;
  seo_title: string;
  seo_description: string;
  variants: ProductVariant[];
  spec_data: ProductSpec[];
  collection_ids: number[];
}

const emptyForm: FormState = {
  name: "",
  description: "",
  short_description: "",
  category_id: "",
  material: "",
  finish: "",
  color: "",
  dimensions: "",
  weight: "",
  sku: "",
  tags: "",
  moq: "",
  lead_time: "",
  packaging_info: "",
  price: "",
  currency: "USD",
  price_on_request: true,
  featured: false,
  status: "draft",
  slug: "",
  seo_title: "",
  seo_description: "",
  variants: [],
  spec_data: [],
  collection_ids: [],
};

export default function ProductEditor() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const isNew = id === "new";

  const [form, setForm] = useState<FormState>(emptyForm);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [imageIds, setImageIds] = useState<number[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [err, setErr] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [upRights, setUpRights] = useState("");
  const [upPermission, setUpPermission] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  /** Live form facts for per-field AI buttons (works for unsaved drafts). */
  const aiFacts = (): Record<string, string | null | undefined> => ({
    name: form.name,
    material: form.material,
    finish: form.finish,
    color: form.color,
    dimensions: form.dimensions,
    weight: form.weight,
    description: form.description || form.short_description,
    category: categories.find((c) => String(c.id) === form.category_id)?.name,
    sku: form.sku,
    moq: form.moq,
    lead_time: form.lead_time,
  });

  /** Merge AI keywords into the tags input (dedupe, cap 20). */
  const mergeKeywords = (keywords: string[]) =>
    setForm((f) => {
      const existing = f.tags.split(",").map((t) => t.trim()).filter(Boolean);
      const seen = new Set(existing.map((t) => t.toLowerCase()));
      const merged = [...existing];
      for (const k of keywords) {
        const clean = k.trim().toLowerCase().slice(0, 60);
        if (clean && !seen.has(clean)) {
          seen.add(clean);
          merged.push(clean);
        }
      }
      return { ...f, tags: merged.slice(0, 20).join(", ") };
    });

  useEffect(() => {
    api<Category[]>("/api/categories")
      .then((d) => setCategories(Array.isArray(d) ? d : []))
      .catch(() => undefined);
    api<Collection[]>("/api/collections")
      .then((d) => setCollections(Array.isArray(d) ? d : []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    setErr("");
    api<ProductDetail>(`/api/products/${encodeURIComponent(id)}`)
      .then((p) => {
        setForm({
          name: p.name || "",
          description: p.description || "",
          short_description: p.short_description || "",
          category_id: p.category?.id ? String(p.category.id) : "",
          material: p.material || "",
          finish: p.finish || "",
          color: p.color || "",
          dimensions: p.dimensions || "",
          weight: p.weight || "",
          sku: p.sku || "",
          tags: (p.tags || []).join(", "),
          moq: p.moq != null ? String(p.moq) : "",
          lead_time: p.lead_time || "",
          packaging_info: p.packaging_info || "",
          price: p.price != null ? String(p.price) : "",
          currency: p.currency || "USD",
          price_on_request: Boolean(p.price_on_request),
          featured: Boolean(p.featured),
          status: (p.status as FormState["status"]) || "draft",
          slug: p.slug || "",
          seo_title: p.seo_title || "",
          seo_description: p.seo_description || "",
          variants: Array.isArray(p.variants) ? p.variants : [],
          spec_data: Array.isArray(p.specifications) ? p.specifications : [],
          collection_ids: (p.collections || []).map((c) => c.id),
        });
        setImages(p.images || []);
        setImageIds([]);
      })
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  const buildPayload = (): ProductInput => ({
    name: form.name,
    slug: form.slug.trim() || undefined,
    description: form.description || undefined,
    short_description: form.short_description || undefined,
    category_id: form.category_id ? Number(form.category_id) : null,
    material: form.material || undefined,
    finish: form.finish || undefined,
    color: form.color || undefined,
    dimensions: form.dimensions || undefined,
    weight: form.weight || undefined,
    sku: form.sku || undefined,
    tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    moq: form.moq.trim() || undefined,
    lead_time: form.lead_time || undefined,
    packaging_info: form.packaging_info || undefined,
    price: form.price ? Number(form.price) : null,
    currency: form.currency || "USD",
    price_on_request: form.price_on_request,
    featured: form.featured,
    status: form.status,
    seo_title: form.seo_title || undefined,
    seo_description: form.seo_description || undefined,
    variant_data: form.variants.filter((v) => v.name.trim()),
    spec_data: form.spec_data.filter((s) => s.key.trim()),
    collection_ids: form.collection_ids,
  });

  const save = async () => {
    setSaving(true);
    setSaveMsg("");
    setErr("");
    setFieldErrors({});
    try {
      const payload = buildPayload();
      if (isNew) {
        const created = await api<ProductDetail>("/api/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSaveMsg(`Created — now upload images below.`);
        router.replace(`/admin/products/${created.id}`);
      } else {
        await api<ProductDetail>(`/api/products/${encodeURIComponent(id)}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setSaveMsg("Saved.");
      }
    } catch (e: any) {
      const raw = String(e);
      setErr(raw);
      // Best-effort field errors from FastAPI validation responses.
      try {
        const detailMatch = raw.match(/\{"detail":(\[.*\])\}/);
        if (detailMatch) {
          const details = JSON.parse(detailMatch[1]) as { loc: string[]; msg: string }[];
          const fe: Record<string, string> = {};
          details.forEach((d) => {
            const field = d.loc?.[d.loc.length - 1];
            if (field) fe[field] = d.msg;
          });
          setFieldErrors(fe);
        }
      } catch {
        /* ignore parse failure */
      }
    } finally {
      setSaving(false);
    }
  };

  const onImages = async (files: FileList) => {
    if (isNew || !files.length) return;
    setUploading(true);
    setSaveMsg("");
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files", f));
      if (upRights) fd.append("rights_source", upRights);
      if (upPermission.trim()) fd.append("permission", upPermission.trim());
      const res = await apiUpload<{ images: ProductImage[] }>(`/api/products/${encodeURIComponent(id)}/images`, fd);
      setImages((imgs) => [...imgs, ...(res.images || [])]);
      setSaveMsg(`${(res.images || []).length} image(s) uploaded.`);
    } catch (e: any) {
      setErr(String(e));
    } finally {
      setUploading(false);
    }
  };

  if (!isNew && loading) return <Loading label="Loading product…" />;
  if (!isNew && err && !form.name) return <ErrorBox error={err} retry={() => router.refresh()} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">{isNew ? "New product" : `Edit: ${form.name || `#${id}`}`}</h1>
          {!isNew && form.status && <span className="mt-1 inline-block"><StatusBadge status={form.status} /></span>}
        </div>
        <div className="flex gap-2">
          <Link className="btn btn-ghost btn-sm" href="/admin/products">← Products</Link>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : isNew ? "Create product" : "Save changes"}
          </button>
        </div>
      </div>

      {err && <ErrorBox error={err} />}
      {saveMsg && <p className="text-sm text-green-700">{saveMsg}</p>}
      {!form.name && <p className="text-sm text-red-700">Name is required.</p>}

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-4">
          <div className="card space-y-3">
            <h2 className="font-semibold">Basic information</h2>
            <div>
              <label className="label" htmlFor="f-name">Name *</label>
              <input id="f-name" className="input" value={form.name} onChange={(e) => set("name", e.target.value)} />
              {fieldErrors.name && <p className="text-xs text-red-700 mt-1">{fieldErrors.name}</p>}
              <AiFieldButton field="name" entityType="product" facts={aiFacts()} onValue={(v) => set("name", v)} />
            </div>
            <div>
              <label className="label" htmlFor="f-short">Short description</label>
              <input id="f-short" className="input" value={form.short_description} onChange={(e) => set("short_description", e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="f-desc">Description</label>
              <textarea id="f-desc" rows={6} className="input" value={form.description} onChange={(e) => set("description", e.target.value)} />
              <AiFieldButton field="description" entityType="product" facts={aiFacts()} onValue={(v) => set("description", v)} />
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="label" htmlFor="f-mat">Material</label>
                <input id="f-mat" className="input" value={form.material} onChange={(e) => set("material", e.target.value)} placeholder="e.g. brass" />
              </div>
              <div>
                <label className="label" htmlFor="f-fin">Finish</label>
                <input id="f-fin" className="input" value={form.finish} onChange={(e) => set("finish", e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="f-color">Color</label>
                <input id="f-color" className="input" value={form.color} onChange={(e) => set("color", e.target.value)} />
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="label" htmlFor="f-dim">Dimensions</label>
                <input id="f-dim" className="input" value={form.dimensions} onChange={(e) => set("dimensions", e.target.value)} placeholder="e.g. 30 × 8 cm" />
              </div>
              <div>
                <label className="label" htmlFor="f-weight">Weight</label>
                <input id="f-weight" className="input" value={form.weight} onChange={(e) => set("weight", e.target.value)} placeholder="e.g. 1.2 kg" />
              </div>
              <div>
                <label className="label" htmlFor="f-sku">SKU</label>
                <input id="f-sku" className="input" value={form.sku} onChange={(e) => set("sku", e.target.value)} />
                {fieldErrors.sku && <p className="text-xs text-red-700 mt-1">{fieldErrors.sku}</p>}
              </div>
            </div>
            <div>
              <label className="label" htmlFor="f-tags">Tags (comma-separated)</label>
              <input id="f-tags" className="input" value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="urli, brass, handcrafted" />
              <AiFieldButton field="keywords" entityType="product" facts={aiFacts()} onKeywords={mergeKeywords} />
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="label" htmlFor="f-moq">MOQ (e.g. 100 pcs — leave blank if unconfirmed)</label>
                <input id="f-moq" type="text" inputMode="numeric" className="input" value={form.moq} onChange={(e) => set("moq", e.target.value)} placeholder="100 pcs" />
              </div>
              <div>
                <label className="label" htmlFor="f-lead">Lead time</label>
                <input id="f-lead" className="input" value={form.lead_time} onChange={(e) => set("lead_time", e.target.value)} placeholder="e.g. 4 weeks" />
              </div>
              <div>
                <label className="label" htmlFor="f-pack">Packaging info</label>
                <input id="f-pack" className="input" value={form.packaging_info} onChange={(e) => set("packaging_info", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="card space-y-3">
            <h2 className="font-semibold">Pricing</h2>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="accent-[#172A3A]" checked={form.price_on_request} onChange={(e) => set("price_on_request", e.target.checked)} />
              Price on request (price hidden publicly)
            </label>
            {!form.price_on_request && (
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="f-price">Price</label>
                  <input id="f-price" type="number" step="0.01" min={0} className="input" value={form.price} onChange={(e) => set("price", e.target.value)} />
                </div>
                <div>
                  <label className="label" htmlFor="f-currency">Currency</label>
                  <input id="f-currency" className="input" value={form.currency} onChange={(e) => set("currency", e.target.value)} placeholder="USD" />
                </div>
              </div>
            )}
          </div>

          <div className="card space-y-3">
            <h2 className="font-semibold">Variants</h2>
            {form.variants.map((v, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 items-start">
                <input className="input" placeholder="Variant name" value={v.name} onChange={(e) => set("variants", form.variants.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                <input className="input" placeholder="SKU" value={v.sku || ""} onChange={(e) => set("variants", form.variants.map((x, j) => (j === i ? { ...x, sku: e.target.value } : x)))} />
                <input className="input" placeholder="Price" value={v.price != null ? String(v.price) : ""} onChange={(e) => set("variants", form.variants.map((x, j) => (j === i ? { ...x, price: e.target.value ? Number(e.target.value) : null } : x)))} />
                <div className="flex gap-1">
                  <input className="input" placeholder="MOQ (e.g. 100 pcs)" value={v.moq != null ? String(v.moq) : ""} onChange={(e) => set("variants", form.variants.map((x, j) => (j === i ? { ...x, moq: e.target.value || null } : x)))} />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => set("variants", form.variants.filter((_, j) => j !== i))} aria-label="Remove variant">✕</button>
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => set("variants", [...form.variants, { name: "" }])}>+ Add variant</button>
          </div>

          <div className="card space-y-3">
            <h2 className="font-semibold">Specifications (key / value)</h2>
            {form.spec_data.map((s, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 items-start">
                <input className="input col-span-2" placeholder="Key (e.g. Material)" value={s.key} onChange={(e) => set("spec_data", form.spec_data.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} />
                <input className="input col-span-2" placeholder="Value" value={s.value} onChange={(e) => set("spec_data", form.spec_data.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => set("spec_data", form.spec_data.filter((_, j) => j !== i))} aria-label="Remove specification">✕</button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => set("spec_data", [...form.spec_data, { key: "", value: "" }])}>+ Add specification</button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card space-y-3">
            <h2 className="font-semibold">Publishing</h2>
            <div>
              <label className="label" htmlFor="f-cat">Category</label>
              <select id="f-cat" className="input" value={form.category_id} onChange={(e) => set("category_id", e.target.value)}>
                <option value="">— none —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="f-status">Status</label>
              <select id="f-status" className="input" value={form.status} onChange={(e) => set("status", e.target.value as FormState["status"])}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="accent-[#172A3A]" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} />
              Featured
            </label>
            <div>
              <label className="label" htmlFor="f-slug">URL slug (auto from name if blank)</label>
              <input id="f-slug" className="input" value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="handcrafted-brass-urli" />
              <AiFieldButton field="slug" entityType="product" facts={aiFacts()} onValue={(v) => set("slug", v)} />
            </div>
            <div>
              <label className="label" htmlFor="f-seot">SEO title</label>
              <input id="f-seot" className="input" value={form.seo_title} onChange={(e) => set("seo_title", e.target.value)} />
              <AiFieldButton field="seo_title" entityType="product" facts={aiFacts()} onValue={(v) => set("seo_title", v)} />
            </div>
            <div>
              <label className="label" htmlFor="f-seod">SEO description</label>
              <textarea id="f-seod" rows={3} className="input" value={form.seo_description} onChange={(e) => set("seo_description", e.target.value)} />
              <AiFieldButton field="seo_description" entityType="product" facts={aiFacts()} onValue={(v) => set("seo_description", v)} />
            </div>
            <div>
              <p className="label">Collections</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {collections.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="accent-[#172A3A]"
                      checked={form.collection_ids.includes(c.id)}
                      onChange={(e) =>
                        set(
                          "collection_ids",
                          e.target.checked
                            ? [...form.collection_ids, c.id]
                            : form.collection_ids.filter((x) => x !== c.id)
                        )
                      }
                    />
                    {c.name}
                  </label>
                ))}
                {collections.length === 0 && <p className="text-xs text-gray">No collections.</p>}
              </div>
            </div>
          </div>

          {!isNew && (
            <AiSeoAssistant
              entityType="product"
              entityId={id}
              current={{
                seo_title: form.seo_title,
                seo_description: form.seo_description,
                slug: form.slug,
                description: form.description,
              }}
              onApply={(patch) =>
                setForm((f) => ({
                  ...f,
                  ...(patch.seo_title !== undefined ? { seo_title: patch.seo_title } : {}),
                  ...(patch.seo_description !== undefined ? { seo_description: patch.seo_description } : {}),
                  ...(patch.slug !== undefined ? { slug: patch.slug } : {}),
                  ...(patch.description !== undefined ? { description: patch.description } : {}),
                }))
              }
              onApplyKeywords={(keywords) => mergeKeywords(keywords)}
            />
          )}

          {!isNew && (
            <div className="card">
              <h2 className="font-semibold mb-3">Images</h2>
              <div className="grid grid-cols-2 gap-2">
                {images.map((img, i) => (
                  <ImageRightsEditor
                    key={img.id != null ? `img-${img.id}` : `img-${img.url}-${i}`}
                    image={img}
                    productName={form.name || "Product"}
                    onUpdated={(next) => setImages((imgs) => imgs.map((x, j) => (j === i ? next : x)))}
                    onDeleted={() => {
                      setImages((imgs) => imgs.filter((_, j) => j !== i));
                      setSaveMsg("Image deleted.");
                    }}
                  />
                ))}
                {images.length === 0 && <p className="text-xs text-gray col-span-2">No images yet.</p>}
              </div>
              <p className="help mt-2">Concept (AI-generated) images are badged and must never be presented as product photographs.</p>
              <div className="grid sm:grid-cols-2 gap-2 mt-3">
                <label className="text-xs">Image rights for uploads
                  <select className="input mt-1" value={upRights} onChange={(e) => setUpRights(e.target.value)} aria-label="Image rights for uploads">
                    <option value="">Set later (edit per image)</option>
                    <option value="own">Own photography</option>
                    <option value="supplier_authorised">Supplier-authorised</option>
                    <option value="licensed">Licensed</option>
                    <option value="ai_generated">AI-generated concept</option>
                  </select>
                </label>
                <label className="text-xs">Permission note
                  <input className="input mt-1" value={upPermission} onChange={(e) => setUpPermission(e.target.value)} placeholder="Supplier / licence ref" aria-label="Permission note for uploads" />
                </label>
              </div>
              <label className="btn btn-ghost btn-sm mt-3 cursor-pointer">
                {uploading ? "Uploading…" : "Upload images (JPEG/PNG/WebP ≤8MB)"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) void onImages(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
