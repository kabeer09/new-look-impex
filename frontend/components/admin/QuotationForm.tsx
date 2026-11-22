"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, apiUpload, getToken } from "@/lib/api";

type Item = {
  product_id?: number | null; sku: string; name: string; description: string;
  material: string; dimensions: string; weight: string; images: string[];
  quantity: number | string; unit: string; unit_price: number | string;
  moq: string; packaging: string; line_total?: number;
};
type Form = {
  id?: number; number?: string;
  status: string; exporter: Record<string, string>;
  buyer_company: string; buyer_contact: string; buyer_email: string; buyer_phone: string;
  buyer_whatsapp: string; buyer_country: string; buyer_address: string; buyer_type: string; buyer_notes: string;
  currency: string; shipping_method: string; incoterm: string;
  shipping_charges: string; packing_charges: string; sample_charges: string; discount: string; tax: string;
  port_loading: string; port_destination: string; delivery_time: string; production_lead: string;
  payment_terms: string; advance_pct: string; balance_terms: string;
  quote_date: string; expiry_date: string; terms: string; items: Item[];
};

const CURRENCIES = ["USD", "EUR", "GBP", "AED", "SAR", "INR", "AUD", "CAD"];
const INCOTERMS = ["EXW", "FCA", "FOB", "CFR", "CIF", "CPT", "CIP", "DAP", "DDP"];
const TABS = ["Company", "Buyer", "Products", "Shipping & Payment", "Terms", "Preview"] as const;

function blankItem(): Item {
  return { sku: "", name: "", description: "", material: "", dimensions: "", weight: "",
           images: [], quantity: 1, unit: "pcs", unit_price: 0, moq: "", packaging: "" };
}

const num = (v: unknown) => { const n = parseFloat(String(v ?? "")); return isNaN(n) ? 0 : n; };
const fmt = (v: unknown, cur: string) => {
  const sym: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", AED: "د.إ", SAR: "﷼", INR: "₹" };
  return `${sym[cur] || ""}${num(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/** Shared create/edit form. `id` set => edit existing; else create new. */
export function QuotationForm({ id }: { id?: number }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Company");
  const [form, setForm] = useState<Form | null>(null);
  const [catalogue, setCatalogue] = useState<{ id: number; name: string; sku: string; material: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [number, setNumber] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true); setErr("");
      try {
        const [settings, cat] = await Promise.all([
          api<any>("/api/quotation-settings"),
          api<{ items: { id: number; name: string; sku: string; material: string }[] }>("/api/products?page_size=200"),
        ]);
        setCatalogue(cat.items || []);
        const today = new Date();
        const exp = new Date(today.getTime() + (settings.validity_days || 30) * 86400000);
        const expOut: Exporter = {
          company_name: settings.company_name || "New Look Impex", address: settings.address || "",
          contact_person: settings.contact_person || "", email: settings.email || "",
          phone: settings.phone || "", whatsapp: settings.whatsapp || "",
          website: settings.website || "", gstin: settings.gstin || "", iec: settings.iec || "",
        };
        let base: Form = {
          status: "draft", exporter: expOut,
          buyer_company: "", buyer_contact: "", buyer_email: "", buyer_phone: "", buyer_whatsapp: "",
          buyer_country: "", buyer_address: "", buyer_type: "", buyer_notes: "",
          currency: settings.default_currency || "USD", shipping_method: "", incoterm: "",
          shipping_charges: "0", packing_charges: "0", sample_charges: "0", discount: "0", tax: "0",
          port_loading: "", port_destination: "", delivery_time: "", production_lead: "",
          payment_terms: "", advance_pct: "0", balance_terms: "",
          quote_date: today.toISOString().slice(0, 10), expiry_date: exp.toISOString().slice(0, 10),
          terms: settings.default_terms || "", items: [blankItem()],
        };
        if (id) {
          const q = await api<any>(`/api/quotations/${id}`);
          setNumber(q.number);
          base = { ...base, ...q,
            shipping_charges: String(q.shipping_charges ?? 0), packing_charges: String(q.packing_charges ?? 0),
            sample_charges: String(q.sample_charges ?? 0), discount: String(q.discount ?? 0), tax: String(q.tax ?? 0),
            advance_pct: String(q.advance_pct ?? 0),
            items: (q.items || []).map((it: any) => ({ ...it, images: it.images || [] })),
          };
        }
        setForm(base);
      } catch (e) {
        setErr(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const set = (k: keyof Form, v: any) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const setExporter = (k: string, v: string) => setForm((f) => (f ? { ...f, exporter: { ...f.exporter, [k]: v } } : f));
  const setItem = (i: number, k: keyof Item, v: any) => setForm((f) => {
    if (!f) return f; const items = [...f.items]; items[i] = { ...items[i], [k]: v }; return { ...f, items };
  });

  const subtotal = form?.items.reduce((s, it) => s + num(it.quantity) * num(it.unit_price), 0) || 0;
  const grand = form ? subtotal + num(form.shipping_charges) + num(form.packing_charges) + num(form.sample_charges)
    - num(form.discount) + num(form.tax) : 0;

  const pickCatalogue = (i: number, productId: string) => {
    const p = catalogue.find((c) => String(c.id) === productId);
    if (!p) return;
    setForm((f) => {
      if (!f) return f; const items = [...f.items];
      items[i] = { ...items[i], product_id: p.id, sku: p.sku || "", name: p.name, material: p.material || "" };
      return { ...f, items };
    });
  };

  const uploadImages = async (i: number, files: FileList | null) => {
    if (!files || !files.length) return;
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("files", f));
    try {
      const r = await apiUpload<{ files: { url: string }[] }>("/api/quotations/upload", fd);
      const urls = (r.files || []).map((f) => f.url);
      setForm((f) => {
        if (!f) return f; const items = [...f.items];
        items[i] = { ...items[i], images: [...(items[i].images || []), ...urls] }; return { ...f, items };
      });
    } catch (e) { setMsg(`Image upload failed: ${String(e)}`); }
  };

  const save = async (status?: string) => {
    if (!form) return;
    if (!form.buyer_company || !form.buyer_email) { setMsg("Buyer company and email are required."); return; }
    if (!form.items.length || !form.items.some((i) => i.name)) { setMsg("Add at least one product with a name."); return; }
    setSaving(true); setMsg("");
    try {
      const payload = { ...form, status: status || form.status,
        items: form.items.map((it, idx) => ({ ...it, sort_order: idx, line_total: num(it.quantity) * num(it.unit_price) })) };
      const saved = id
        ? await api<any>(`/api/quotations/${id}`, { method: "PUT", body: JSON.stringify(payload) })
        : await api<any>("/api/quotations", { method: "POST", body: JSON.stringify(payload) });
      setForm(saved); setNumber(saved.number);
      setMsg(`Saved ${saved.number}.`);
    } catch (e) { setMsg(`Save failed: ${String(e)}`); }
    finally { setSaving(false); }
  };

  const fetchPdf = async (): Promise<Blob | null> => {
    try {
      const token = getToken();
      const r = await fetch(`/api/quotations/${form?.id}/pdf`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!r.ok) { setMsg(`PDF failed (${r.status}).`); return null; }
      return await r.blob();
    } catch (e) { setMsg(String(e)); return null; }
  };
  const previewPdf = async () => {
    const b = await fetchPdf(); if (b) window.open(URL.createObjectURL(b), "_blank", "noopener");
  };
  const downloadPdf = async () => {
    const b = await fetchPdf(); if (!b) return;
    const u = URL.createObjectURL(b); const a = document.createElement("a");
    a.href = u; a.download = `${number || "quotation"}.pdf`; a.click(); URL.revokeObjectURL(u);
  };

  const action = async (path: string, method = "POST", body?: any) => {
    if (!form?.id) { setMsg("Save the quotation first."); return; }
    setMsg("");
    try {
      const r = await api<any>(`/api/quotations/${id || form?.id}${path}`, { method, body: body ? JSON.stringify(body) : undefined });
      if (path.includes("status")) setForm((f) => (f ? { ...f, status: body.status } : f));
      setMsg(path.includes("pdf") ? "PDF ready." : "Done.");
      return r;
    } catch (e) { setMsg(`Action failed: ${String(e)}`); }
  };

  if (loading || !form) return <div className="card">{err || "Loading quotation…"}</div>;

  const field = (label: string, key: keyof Form, placeholder = "") => (
    <label className="block"><span className="text-xs font-semibold text-charcoal">{label}</span>
      <input className="input mt-1" placeholder={placeholder} value={String(form[key] ?? "")}
             onChange={(e) => set(key, e.target.value)} /></label>
  );
  const area = (label: string, key: keyof Form) => (
    <label className="block"><span className="text-xs font-semibold text-charcoal">{label}</span>
      <textarea className="input mt-1" rows={3} value={String(form[key] ?? "")}
                onChange={(e) => set(key, e.target.value)} /></label>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href="/admin/quotations" className="link text-sm">← Quotation History</Link>
          <h1 className="text-2xl font-bold mt-1">{id ? "Edit" : "Create"} Quotation {number && <span className="font-mono text-base text-gray">{number}</span>}</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-ghost btn-sm" onClick={() => save("draft")} disabled={saving}>Save Draft</button>
          <button className="btn btn-primary btn-sm" onClick={() => save()} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          {form.id && <>
            <button className="btn btn-sm" onClick={previewPdf}>Preview PDF</button>
            <button className="btn btn-sm" onClick={downloadPdf}>Download PDF</button>
            <button className="btn btn-sm" onClick={() => action("/send-email", "POST", {})}>Send Email</button>
            <button className="btn btn-sm" onClick={async () => {
              const b = await fetchPdf(); if (!b) return;
              const text = `Quotation ${number} from New Look Impex. Total: ${form.currency} ${grand.toLocaleString()}. Valid until ${form.expiry_date || "-"}. PDF ready on request.`;
              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
            }}>Share WhatsApp</button>
          </>}
        </div>
      </div>
      {msg && <p className="text-sm text-brass-dark">{msg}</p>}
      {err && <p className="text-sm text-red-700">{err}</p>}

      <div className="card !p-0">
        <div className="flex flex-wrap gap-1 border-b border-sand p-2">
          {TABS.map((t) => <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs rounded ${tab === t ? "bg-navy text-white" : "text-gray hover:bg-sand"}`}>{t}</button>)}
        </div>
        <div className="p-5">
          {tab === "Company" && <div className="grid sm:grid-cols-2 gap-4">
            {Object.keys(form.exporter).map((k) => (
              <label key={k} className="block"><span className="text-xs font-semibold capitalize text-charcoal">{k.replace(/_/g, " ")}</span>
                <input className="input mt-1" value={form.exporter[k] || ""} onChange={(e) => setExporter(k, e.target.value)} /></label>
            ))}
          </div>}

          {tab === "Buyer" && <div className="grid sm:grid-cols-2 gap-4">
            {field("Buyer / Company name", "buyer_company")}{field("Contact person", "buyer_contact")}
            {field("Email", "buyer_email")}{field("Phone", "buyer_phone")}
            {field("WhatsApp", "buyer_whatsapp")}{field("Country", "buyer_country")}
            {field("Buyer type (Importer / Distributor)", "buyer_type")}
            {area("Address", "buyer_address")}{area("Notes", "buyer_notes")}
          </div>}

          {tab === "Products" && <div className="space-y-4">
            {form.items.map((it, idx) => (
              <div key={idx} className="border border-sand rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <b className="text-sm">Product {idx + 1}</b>
                  <div className="flex gap-2">
                    <select className="input !w-auto !py-1 text-xs" value="" onChange={(e) => pickCatalogue(idx, e.target.value)}>
                      <option value="">Select from catalogue…</option>
                      {catalogue.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button className="btn btn-ghost btn-sm" onClick={() => setForm((f) => f ? { ...f, items: f.items.filter((_, i) => i !== idx) } : f)}>Remove</button>
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <label className="block"><span className="text-xs">SKU</span><input className="input mt-1" value={it.sku} onChange={(e) => setItem(idx, "sku", e.target.value)} /></label>
                  <label className="block"><span className="text-xs">Name *</span><input className="input mt-1" value={it.name} onChange={(e) => setItem(idx, "name", e.target.value)} /></label>
                  <label className="block"><span className="text-xs">Material</span><input className="input mt-1" value={it.material} onChange={(e) => setItem(idx, "material", e.target.value)} /></label>
                  <label className="block"><span className="text-xs">Dimensions</span><input className="input mt-1" value={it.dimensions} onChange={(e) => setItem(idx, "dimensions", e.target.value)} /></label>
                  <label className="block"><span className="text-xs">Weight</span><input className="input mt-1" value={it.weight} onChange={(e) => setItem(idx, "weight", e.target.value)} /></label>
                  <label className="block"><span className="text-xs">Unit</span><input className="input mt-1" value={it.unit} onChange={(e) => setItem(idx, "unit", e.target.value)} /></label>
                  <label className="block"><span className="text-xs">Qty</span><input className="input mt-1" type="number" value={it.quantity} onChange={(e) => setItem(idx, "quantity", e.target.value)} /></label>
                  <label className="block"><span className="text-xs">Unit price</span><input className="input mt-1" type="number" step="0.01" value={it.unit_price} onChange={(e) => setItem(idx, "unit_price", e.target.value)} /></label>
                  <label className="block"><span className="text-xs">MOQ</span><input className="input mt-1" value={it.moq} onChange={(e) => setItem(idx, "moq", e.target.value)} /></label>
                </div>
                <label className="block"><span className="text-xs">Description</span><input className="input mt-1" value={it.description} onChange={(e) => setItem(idx, "description", e.target.value)} /></label>
                <label className="block"><span className="text-xs">Packaging</span><input className="input mt-1" value={it.packaging} onChange={(e) => setItem(idx, "packaging", e.target.value)} /></label>
                <div>
                  <span className="text-xs font-semibold">Images</span>
                  <input type="file" accept="image/*" multiple className="block mt-1 text-xs" onChange={(e) => uploadImages(idx, e.target.files)} />
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {it.images.map((src, i) => <div key={i} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="Product" className="h-14 w-14 object-cover rounded border border-sand" />
                      <button className="absolute -top-1 -right-1 bg-navy text-white rounded-full w-5 h-5 text-[10px]" onClick={() => setItem(idx, "images", it.images.filter((_, j) => j !== i))}>×</button>
                    </div>)}
                  </div>
                </div>
                <p className="text-xs text-gray text-right">Line total: <b>{fmt(num(it.quantity) * num(it.unit_price), form.currency)}</b></p>
              </div>
            ))}
            <button className="btn btn-outline btn-sm" onClick={() => setForm((f) => f ? { ...f, items: [...f.items, blankItem()] } : f)}>+ Add product</button>
          </div>}

          {tab === "Shipping & Payment" && <div className="grid sm:grid-cols-2 gap-4">
            <label className="block"><span className="text-xs font-semibold">Currency</span>
              <select className="input mt-1" value={form.currency} onChange={(e) => set("currency", e.target.value)}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select></label>
            <label className="block"><span className="text-xs font-semibold">Shipping method</span>
              <select className="input mt-1" value={form.shipping_method} onChange={(e) => set("shipping_method", e.target.value)}>
                <option value="">—</option><option>Sea Freight</option><option>Air Freight</option><option>Courier</option>
              </select></label>
            <label className="block"><span className="text-xs font-semibold">Incoterms</span>
              <select className="input mt-1" value={form.incoterm} onChange={(e) => set("incoterm", e.target.value)}>
                <option value="">—</option>{INCOTERMS.map((c) => <option key={c}>{c}</option>)}
              </select></label>
            {(["shipping_charges", "packing_charges", "sample_charges", "discount", "tax", "advance_pct"] as (keyof Form)[]).map((k) => (
              <label key={k} className="block"><span className="text-xs font-semibold capitalize">{k.replace(/_/g, " ")}</span>
                <input className="input mt-1" type="number" step="0.01" value={String(form[k] ?? "")} onChange={(e) => set(k, e.target.value)} /></label>
            ))}
            {field("Port of loading", "port_loading")}{field("Destination port", "port_destination")}
            {field("Estimated delivery time", "delivery_time")}{field("Production lead time", "production_lead")}
            {area("Payment terms", "payment_terms")}{area("Balance payment terms", "balance_terms")}
            <label className="block"><span className="text-xs font-semibold">Issue date</span><input className="input mt-1" type="date" value={form.quote_date} onChange={(e) => set("quote_date", e.target.value)} /></label>
            <label className="block"><span className="text-xs font-semibold">Expiry date</span><input className="input mt-1" type="date" value={form.expiry_date} onChange={(e) => set("expiry_date", e.target.value)} /></label>
          </div>}

          {tab === "Terms" && <div>
            <p className="text-xs text-gray mb-2">Edit the Terms & Conditions for this quotation.</p>
            <textarea className="input" rows={12} value={form.terms} onChange={(e) => set("terms", e.target.value)} />
          </div>}

          {tab === "Preview" && <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="card"><h3 className="font-semibold mb-2">Exporter</h3>{Object.entries(form.exporter).map(([k, v]) => <p key={k} className="text-xs"><b className="capitalize">{k.replace(/_/g, " ")}:</b> {v || "—"}</p>)}</div>
              <div className="card"><h3 className="font-semibold mb-2">Buyer</h3>
                <p className="text-xs"><b>Company:</b> {form.buyer_company || "—"}</p>
                <p className="text-xs"><b>Contact:</b> {form.buyer_contact || "—"}</p>
                <p className="text-xs"><b>Country:</b> {form.buyer_country || "—"}</p>
                <p className="text-xs"><b>Email:</b> {form.buyer_email || "—"}</p>
              </div>
            </div>
            <table className="data w-full"><thead><tr><th>SKU</th><th>Product</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead>
              <tbody>{form.items.map((it, i) => <tr key={i}><td>{it.sku || "—"}</td><td>{it.name}</td><td>{it.quantity} {it.unit}</td><td>{fmt(it.unit_price, form.currency)}</td><td>{fmt(num(it.quantity) * num(it.unit_price), form.currency)}</td></tr>)}</tbody></table>
            <div className="text-right space-y-1 text-sm">
              <p>Subtotal: <b>{fmt(subtotal, form.currency)}</b></p>
              <p className="text-lg font-bold">Grand total: {fmt(grand, form.currency)}</p>
            </div>
            <p className="text-xs text-gray">Save the quotation to enable PDF preview/download, email and WhatsApp sharing.</p>
          </div>}
        </div>
      </div>
    </div>
  );
}

type Exporter = Record<string, string>;
