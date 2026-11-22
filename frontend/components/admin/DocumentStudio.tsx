"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, apiUpload, getToken } from "@/lib/api";

type Kind = "quotation" | "invoice";
type Item = {
  product_id?: number | null; sku: string; name: string; title: string; description: string;
  material: string; size: string; dimensions: string; weight: string; finish: string; images: string[];
  quantity: number | string; unit: string; unit_price: number | string;
  discount_pct: number | string; tax_pct: number | string; line_total?: number; sort_order?: number;
};
const blankItem = (): Item => ({ sku: "", name: "", title: "", description: "", material: "", size: "", dimensions: "", weight: "", finish: "", images: [], quantity: 1, unit: "pcs", unit_price: 0, discount_pct: 0, tax_pct: 0 });

const CURRENCIES = ["USD", "EUR", "GBP", "AED", "SAR", "INR", "AUD", "CAD"];
const INCOTERMS = ["", "EXW", "FCA", "FOB", "CFR", "CIF", "CPT", "CIP", "DAP", "DDP"];
const STEPS = ["Company", "Buyer", "Products", "Charges & Shipping", "Terms", "Preview"] as const;
const num = (v: unknown) => { const n = parseFloat(String(v ?? "")); return isNaN(n) ? 0 : n; };
const fmt = (v: unknown, cur: string) => {
  const sym: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", AED: "د.إ", SAR: "﷼", INR: "₹", AUD: "A$", CAD: "C$" };
  return `${sym[cur] || ""}${num(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/** Unified manual document editor. Works with unsaved buyers and custom products. */
export function DocumentStudio({ kind, id, fromQuote }: { kind: Kind; id?: number; fromQuote?: number }) {
  const [step, setStep] = useState<(typeof STEPS)[number]>("Company");
  const [doc, setDoc] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const isInv = kind === "invoice";

  useEffect(() => {
    (async () => {
      try {
        const [co, bs, cat] = await Promise.all([
          api<any>("/api/company-profile"),
          api<{ items: any[] }>("/api/doc-buyers"),
          api<{ items: any[] }>("/api/products?page_size=200"),
        ]);
        setCompany(co); setBuyers(bs.items || []); setCatalogue(cat.items || []);
        const today = new Date().toISOString().slice(0, 10);
        const exp = new Date(Date.now() + (co.validity_days || 30) * 86400000).toISOString().slice(0, 10);
        const exporter = {
          name: co.name, company_name: co.name, contact_person: co.contact_person, address: co.address,
          city: co.city, state: co.state, country: co.country, postal_code: co.postal_code,
          email: co.email, phone: co.phone, whatsapp: co.whatsapp, website: co.website, gstin: co.gstin, iec: co.iec,
        };
        const base: any = {
          status: "draft", exporter, buyer: { company: "", contact: "", email: "", phone: "", country: "" },
          buyer_id: null,
          currency: co.default_currency || "USD",
          doc_type: "proforma", payment_status: "unpaid", show_bank: true,
          terms: isInv ? (co.default_invoice_terms || "") : (co.default_quote_terms || ""),
          quote_date: today, expiry_date: exp, invoice_date: today, due_date: exp,
          items: [blankItem()],
          // invoice charges
          discount: 0, packing_charges: 0, freight_charges: 0, insurance: 0, other_charges: 0, tax: 0,
          amount_paid: 0, payment_method: "", payment_reference: "", payment_terms: "",
          shipping_method: "", incoterm: "", port_loading: "", port_destination: "", delivery_time: "", packaging: "",
          po_number: "", ref_quotation: "", order_number: "", notes: "",
          bank_details: { bank_name: co.bank_name, account_holder: co.account_holder, account_number: co.account_number, ifsc: co.ifsc, swift: co.swift, bank_address: co.bank_address },
        };
        let initial = base;
        if (fromQuote) {
          const q = await api<any>(`/api/quotations/${fromQuote}`);
          initial = { ...base,
            exporter: q.exporter || exporter,
            buyer: { company: q.buyer_company, contact: q.buyer_contact, email: q.buyer_email, phone: q.buyer_phone, whatsapp: q.buyer_whatsapp, country: q.buyer_country, billing_address: q.buyer_address, shipping_address: q.buyer_address },
            ref_quotation: q.number, currency: q.currency, payment_terms: q.payment_terms,
            shipping_method: q.shipping_method, incoterm: q.incoterm, port_loading: q.port_loading, port_destination: q.port_destination,
            delivery_time: q.delivery_time, terms: q.terms || base.terms,
            packing_charges: q.packing_charges || 0, freight_charges: q.shipping_charges || 0, discount: q.discount || 0, tax: q.tax || 0,
            items: (q.items || []).map((it: any) => ({ ...it, title: it.name, images: it.images || [], discount_pct: 0, tax_pct: 0 })),
          };
        } else if (id) {
          const existing = await api<any>(isInv ? `/api/invoices/${id}` : `/api/quotations/${id}`);
          // Quotations store buyer as flat buyer_* columns; map them into the
          // buyer object the editor uses so editing an existing quote works.
          const buyer = isInv
            ? (existing.buyer || {})
            : { company: existing.buyer_company, name: existing.buyer_company, contact: existing.buyer_contact,
                email: existing.buyer_email, phone: existing.buyer_phone, whatsapp: existing.buyer_whatsapp,
                country: existing.buyer_country, billing_address: existing.buyer_address, shipping_address: existing.buyer_address };
          initial = { ...base, ...existing, buyer,
            items: (existing.items || []).map((it: any) => ({ ...it, images: it.images || [], title: it.title || it.name, discount_pct: it.discount_pct || 0, tax_pct: it.tax_pct || 0 })) };
        }
        setDoc(initial); setLoaded(true);
      } catch (e) { setMsg(String(e)); setLoaded(true); }
    })();
  }, [id, fromQuote, isInv]);

  if (!loaded || !doc) return <div className="card">Loading document studio…{msg && <p className="text-sm text-red-700">{msg}</p>}</div>;

  const set = (k: string, v: any) => setDoc((d: any) => ({ ...d, [k]: v }));
  const setExporter = (k: string, v: string) => setDoc((d: any) => ({ ...d, exporter: { ...d.exporter, [k]: v } }));
  const setBuyer = (k: string, v: string) => setDoc((d: any) => ({ ...d, buyer: { ...d.buyer, [k]: v } }));
  const setBank = (k: string, v: string) => setDoc((d: any) => ({ ...d, bank_details: { ...d.bank_details, [k]: v } }));
  const setItem = (i: number, k: keyof Item, v: any) => setDoc((d: any) => {
    const items = [...d.items]; items[i] = { ...items[i], [k]: v }; return { ...d, items };
  });
  const useBuyer = (buyerId: string) => {
    const b = buyers.find((x) => String(x.id) === buyerId);
    if (!b) return;
    setDoc((d: any) => ({ ...d, buyer_id: b.id, buyer: {
      company: b.company, name: b.name, contact: b.contact, email: b.email, phone: b.phone, whatsapp: b.whatsapp,
      country: b.country, billing_address: b.billing_address, shipping_address: b.shipping_address,
      city: b.city, state: b.state, postal_code: b.postal_code, tax_id: b.tax_id,
    } }));
  };
  const saveBuyer = async (update = false) => {
    try {
      const r = await api<any>(update && doc.buyer_id ? `/api/doc-buyers/${doc.buyer_id}` : "/api/doc-buyers",
        { method: update && doc.buyer_id ? "PUT" : "POST", body: JSON.stringify(doc.buyer) });
      setBuyers((b) => update ? b.map((x) => x.id === r.id ? r : x) : [r, ...b]);
      setDoc((d: any) => ({ ...d, buyer_id: r.id }));
      setMsg(`Buyer "${r.company}" ${update ? "updated" : "saved"}.`);
    } catch (e) { setMsg(String(e)); }
  };
  const moveItem = (i: number, dir: -1 | 1) => setDoc((d: any) => {
    const items = [...d.items]; const j = i + dir;
    if (j < 0 || j >= items.length) return d;
    [items[i], items[j]] = [items[j], items[i]];
    return { ...d, items };
  });
  const pickCatalogue = (i: number, productId: string) => {
    const p = catalogue.find((c) => String(c.id) === productId);
    if (!p) return;
    setItem(i, "name", p.name); setItem(i, "sku", p.sku || ""); setItem(i, "material", p.material || "");
  };
  const uploadImages = async (i: number, files: FileList | null) => {
    if (!files?.length) return;
    const fd = new FormData(); Array.from(files).forEach((f) => fd.append("files", f));
    try {
      const r = await apiUpload<{ files: { url: string }[] }>("/api/quotations/upload", fd);
      setDoc((d: any) => { const items = [...d.items]; items[i] = { ...items[i], images: [...(items[i].images || []), ...(r.files || []).map((f) => f.url)] }; return { ...d, items }; });
    } catch (e) { setMsg(`Upload failed: ${String(e)}`); }
  };
  const uploadLogo = async (files: FileList | null) => {
    if (!files?.length) return;
    const fd = new FormData(); fd.append("file", files[0]);
    try {
      const r = await apiUpload<{ url: string }>("/api/company-profile/logo", fd);
      setCompany((c: any) => ({ ...c, logo_url: r.url })); setMsg("Logo saved to company profile.");
    } catch (e) { setMsg(`Logo upload failed: ${String(e)}`); }
  };

  // calculations
  const lineTotal = (it: Item) => {
    const base = num(it.quantity) * num(it.unit_price);
    return base * (1 - num(it.discount_pct) / 100) * (1 + num(it.tax_pct) / 100);
  };
  const subtotal = doc.items.reduce((s: number, it: Item) => s + num(it.quantity) * num(it.unit_price), 0);
  const charges = isInv
    ? -num(doc.discount) + num(doc.packing_charges) + num(doc.freight_charges) + num(doc.insurance) + num(doc.other_charges) + num(doc.tax)
    : -num(doc.discount) + num(doc.packing_charges) + num(doc.freight_charges || 0) + num(doc.tax);
  const grand = subtotal + charges;
  const balance = grand - num(doc.amount_paid);

  const save = async () => {
    setSaving(true); setMsg("");
    try {
      const items = doc.items.map((it: Item, idx: number) => ({ ...it, sort_order: idx, line_total: lineTotal(it) }));
      const payload = { ...doc, items };
      let saved: any;
      if (isInv) {
        saved = id ? await api<any>(`/api/invoices/${id}`, { method: "PUT", body: JSON.stringify(payload) })
                   : await api<any>("/api/invoices", { method: "POST", body: JSON.stringify(payload) });
      } else {
        // map back to quotation API shape
        const qp: any = {
          status: doc.status, exporter: doc.exporter,
          buyer_company: doc.buyer.company || doc.buyer.name, buyer_contact: doc.buyer.contact,
          buyer_email: doc.buyer.email, buyer_phone: doc.buyer.phone, buyer_whatsapp: doc.buyer.whatsapp,
          buyer_country: doc.buyer.country, buyer_address: doc.buyer.billing_address,
          currency: doc.currency, shipping_method: doc.shipping_method, incoterm: doc.incoterm,
          shipping_charges: doc.freight_charges, packing_charges: doc.packing_charges, sample_charges: doc.sample_charges,
          discount: doc.discount, tax: doc.tax, port_loading: doc.port_loading, port_destination: doc.port_destination,
          delivery_time: doc.delivery_time, production_lead: doc.production_lead, payment_terms: doc.payment_terms,
          quote_date: doc.quote_date, expiry_date: doc.expiry_date, terms: doc.terms,
          items: items.map((it: any) => ({ sku: it.sku, name: it.name, description: it.description, material: it.material, dimensions: it.dimensions, weight: it.weight, images: it.images, quantity: it.quantity, unit: it.unit, unit_price: it.unit_price, moq: it.moq, packaging: it.packaging, line_total: it.line_total })),
        };
        saved = id ? await api<any>(`/api/quotations/${id}`, { method: "PUT", body: JSON.stringify(qp) })
                   : await api<any>("/api/quotations", { method: "POST", body: JSON.stringify(qp) });
      }
      setDoc((d: any) => ({ ...d, id: saved.id, number: saved.number }));
      setMsg(`Saved ${saved.number}.`);
    } catch (e) { setMsg(`Save failed: ${String(e)}`); }
    finally { setSaving(false); }
  };

  const pdfPath = (isInv ? `/api/invoices/${doc.id}/pdf` : `/api/quotations/${doc.id}/pdf`);
  const fetchPdf = async () => {
    const token = getToken();
    const r = await fetch(pdfPath, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!r.ok) { setMsg(`PDF failed (${r.status}). Save first.`); return null; }
    return await r.blob();
  };
  const previewPdf = async () => { const b = await fetchPdf(); if (b) window.open(URL.createObjectURL(b), "_blank", "noopener"); };
  const downloadPdf = async () => {
    const b = await fetchPdf(); if (!b) return;
    const u = URL.createObjectURL(b); const a = document.createElement("a");
    a.href = u; a.download = `${doc.number || "document"}.pdf`; a.click(); URL.revokeObjectURL(u);
  };

  const input = (label: string, value: any, onChange: (v: string) => void, type = "text") => (
    <label className="block"><span className="text-xs font-semibold text-charcoal">{label}</span>
      <input className="input mt-1" type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></label>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href="/admin/documents" className="link text-sm">← Document Dashboard</Link>
          <h1 className="text-2xl font-bold mt-1">{isInv ? "Create Invoice" : "Create Quotation"}{doc.number && <span className="font-mono text-base text-gray"> · {doc.number}</span>}</h1>
          <p className="text-sm text-gray">Enter everything manually — no saved buyer or catalogue product required.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-ghost btn-sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Draft"}</button>
          <button className="btn btn-sm" onClick={previewPdf}>Preview PDF</button>
          <button className="btn btn-primary btn-sm" onClick={downloadPdf}>Download PDF</button>
        </div>
      </div>
      {msg && <p className="text-sm text-brass-dark">{msg}</p>}

      <div className="card !p-0">
        <div className="flex flex-wrap gap-1 border-b border-sand p-2">
          {STEPS.map((s) => <button key={s} onClick={() => setStep(s)} className={`px-3 py-1.5 text-xs rounded ${step === s ? "bg-navy text-white" : "text-gray hover:bg-sand"}`}>{s}</button>)}
        </div>
        <div className="p-5">
          {step === "Company" && <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 flex items-end gap-3">
              {company?.logo_url && <img src={company.logo_url} alt="Company logo" className="h-14 w-14 rounded border border-sand object-contain" />}
              <label className="block"><span className="text-xs font-semibold">Company logo</span><input type="file" accept="image/*" className="block mt-1 text-xs" onChange={(e) => uploadLogo(e.target.files)} /></label>
            </div>
            {Object.entries(doc.exporter).map(([k, v]) => input(k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()), v, (val) => setExporter(k, val)))}
            <div className="sm:col-span-2"><b className="text-sm">Bank details (shown on document)</b></div>
            {Object.entries(doc.bank_details || {}).map(([k, v]) => input(k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()), v, (val) => setBank(k, val)))}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!doc.show_bank} onChange={(e) => set("show_bank", e.target.checked)} /> Show bank details on PDF</label>
          </div>}

          {step === "Buyer" && <div className="space-y-4">
            <div className="card flex flex-wrap items-end gap-3">
              <label className="block"><span className="text-xs font-semibold">Load saved buyer</span>
                <select className="input mt-1 max-w-xs" value="" onChange={(e) => useBuyer(e.target.value)}>
                  <option value="">— Enter manually —</option>{buyers.map((b) => <option key={b.id} value={b.id}>{b.company || b.name}</option>)}
                </select></label>
              <button className="btn btn-outline btn-sm" onClick={() => saveBuyer(false)}>Save buyer as new</button>
              <button className="btn btn-ghost btn-sm" onClick={() => saveBuyer(true)} disabled={!doc.buyer_id}>Update selected buyer</button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {["company", "name", "contact", "email", "phone", "whatsapp", "country", "billing_address", "shipping_address", "city", "state", "postal_code", "tax_id"].map((k) =>
                input(k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()), doc.buyer[k], (v) => setBuyer(k, v)))}
              {isInv && <>{input("PO number", doc.po_number, (v) => set("po_number", v))}{input("Reference quotation", doc.ref_quotation, (v) => set("ref_quotation", v))}{input("Order number", doc.order_number, (v) => set("order_number", v))}</>}
            </div>
          </div>}

          {step === "Products" && <div className="space-y-4">
            {doc.items.map((it: Item, idx: number) => (
              <div key={idx} className="border border-sand rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <b className="text-sm">Product {idx + 1}</b>
                  <div className="flex gap-2 items-center">
                    <select className="input !w-auto !py-1 text-xs" value="" onChange={(e) => pickCatalogue(idx, e.target.value)}><option value="">From catalogue…</option>{catalogue.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                    <button className="btn btn-ghost btn-sm" title="Move up" onClick={() => moveItem(idx, -1)}>↑</button>
                    <button className="btn btn-ghost btn-sm" title="Move down" onClick={() => moveItem(idx, 1)}>↓</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setDoc((d: any) => ({ ...d, items: d.items.filter((_: any, i: number) => i !== idx) }))}>Remove</button>
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  {(["sku", "name", "title", "material", "size", "dimensions", "weight", "finish", "unit", "quantity", "unit_price", "discount_pct", "tax_pct"] as (keyof Item)[]).map((k) =>
                    <label key={k} className="block"><span className="text-xs">{k.replace(/_/g, " ")}</span>
                      <input className="input mt-1" type={["quantity", "unit_price", "discount_pct", "tax_pct"].includes(k as string) ? "number" : "text"} value={String(it[k] ?? "")} onChange={(e) => setItem(idx, k, e.target.value)} /></label>)}
                </div>
                <label className="block"><span className="text-xs">Description</span><input className="input mt-1" value={it.description} onChange={(e) => setItem(idx, "description", e.target.value)} /></label>
                <div><span className="text-xs font-semibold">Images</span>
                  <input type="file" accept="image/*" multiple className="block mt-1 text-xs" onChange={(e) => uploadImages(idx, e.target.files)} />
                  <div className="flex gap-2 mt-2 flex-wrap">{it.images.map((src, i) => <div key={i} className="relative">
                    <img src={src} alt="Product" className="h-14 w-14 object-cover rounded border border-sand" />
                    <button className="absolute -top-1 -right-1 bg-navy text-white rounded-full w-5 h-5 text-[10px]" onClick={() => setItem(idx, "images", it.images.filter((_, j) => j !== i))}>×</button>
                  </div>)}</div>
                </div>
                <p className="text-xs text-gray text-right">Line total: <b>{fmt(lineTotal(it), doc.currency)}</b></p>
              </div>
            ))}
            <button className="btn btn-outline btn-sm" onClick={() => setDoc((d: any) => ({ ...d, items: [...d.items, blankItem()] }))}>+ Add product</button>
          </div>}

          {step === "Charges & Shipping" && <div className="grid sm:grid-cols-2 gap-4">
            <label className="block"><span className="text-xs font-semibold">Currency</span><select className="input mt-1" value={doc.currency} onChange={(e) => set("currency", e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></label>
            {(isInv ? ["discount", "packing_charges", "freight_charges", "insurance", "other_charges", "tax", "amount_paid"] : ["discount", "packing_charges", "freight_charges", "tax"]).map((k) =>
              input(k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()), doc[k], (v) => set(k, v), "number"))}
            {isInv && <>{input("Payment method", doc.payment_method, (v) => set("payment_method", v))}{input("Payment reference", doc.payment_reference, (v) => set("payment_reference", v))}{input("Payment status", doc.payment_status, (v) => set("payment_status", v))}</>}
            <label className="block"><span className="text-xs font-semibold">Shipping method</span><select className="input mt-1" value={doc.shipping_method} onChange={(e) => set("shipping_method", e.target.value)}><option value="">—</option><option>Sea freight</option><option>Air freight</option><option>Express courier</option><option>Road</option><option>Other</option></select></label>
            <label className="block"><span className="text-xs font-semibold">Incoterms</span><select className="input mt-1" value={doc.incoterm} onChange={(e) => set("incoterm", e.target.value)}>{INCOTERMS.map((c) => <option key={c}>{c || "—"}</option>)}</select></label>
            {["port_loading", "port_destination", "delivery_time", "production_lead", "packaging"].map((k) => input(k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()), doc[k], (v) => set(k, v)))}
            <label className="block sm:col-span-2"><span className="text-xs font-semibold">Payment terms</span><textarea rows={2} className="input mt-1" value={doc.payment_terms} onChange={(e) => set("payment_terms", e.target.value)} /></label>
            <label className="block"><span className="text-xs font-semibold">{isInv ? "Invoice date" : "Issue date"}</span><input type="date" className="input mt-1" value={isInv ? doc.invoice_date : doc.quote_date} onChange={(e) => set(isInv ? "invoice_date" : "quote_date", e.target.value)} /></label>
            <label className="block"><span className="text-xs font-semibold">{isInv ? "Due date" : "Expiry date"}</span><input type="date" className="input mt-1" value={isInv ? doc.due_date : doc.expiry_date} onChange={(e) => set(isInv ? "due_date" : "expiry_date", e.target.value)} /></label>
          </div>}

          {step === "Terms" && <div>
            <p className="text-xs text-gray mb-2">Fully editable terms & conditions — one per line.</p>
            <textarea rows={12} className="input" value={doc.terms} onChange={(e) => set("terms", e.target.value)} />
          </div>}

          {step === "Preview" && <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="card"><h3 className="font-semibold mb-2">Exporter</h3>{Object.entries(doc.exporter).map(([k, v]) => <p key={k} className="text-xs"><b className="capitalize">{k.replace(/_/g, " ")}:</b> {String(v) || "—"}</p>)}</div>
              <div className="card"><h3 className="font-semibold mb-2">Buyer</h3>{Object.entries(doc.buyer).map(([k, v]) => <p key={k} className="text-xs"><b className="capitalize">{k.replace(/_/g, " ")}:</b> {String(v) || "—"}</p>)}</div>
            </div>
            <table className="data w-full"><thead><tr><th>SKU</th><th>Product</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead><tbody>
              {doc.items.map((it: Item, i: number) => <tr key={i}><td>{it.sku || "—"}</td><td>{it.name}</td><td>{it.quantity} {it.unit}</td><td>{fmt(it.unit_price, doc.currency)}</td><td>{fmt(lineTotal(it), doc.currency)}</td></tr>)}
            </tbody></table>
            <div className="text-right space-y-1 text-sm">
              <p>Subtotal: <b>{fmt(subtotal, doc.currency)}</b></p>
              <p>Charges/tax: {fmt(charges, doc.currency)}</p>
              <p className="text-lg font-bold">Grand total: {fmt(grand, doc.currency)}</p>
              {isInv && <p>Balance due: {fmt(balance, doc.currency)}</p>}
            </div>
            <p className="text-xs text-gray">Save the document to enable PDF preview and download.</p>
          </div>}
        </div>
      </div>
    </div>
  );
}
