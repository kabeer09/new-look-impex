"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, apiUpload, getToken } from "@/lib/api";

/* Verified New Look Impex business details (used as pre-fill / fallback).
   Never invent figures — these come from the site's established constants. */
const EXPORTER_DEFAULTS = {
  company_name: "New Look Impex",
  address: "Ganga Mandir, Thana Nagphani Road, Kisrol, Moradabad - 244001, Uttar Pradesh, India",
  city: "Moradabad", state: "Uttar Pradesh", postal_code: "244001", country: "India",
  email: "newlookimpex130@gmail.com", phone: "+91 9808588603", whatsapp: "+91 96900 53913",
  website: "https://www.newlookimpex.store", gstin: "", iec: "",
};

const DEFAULT_TERMS = [
  "Quotation is valid until the specified expiry date.",
  "Prices and currency are as stated in this quotation.",
  "Shipping charges are estimates unless specifically confirmed.",
  "Production starts after order confirmation and agreed advance payment.",
  "Product specifications and customization must be approved before production.",
  "Delivery times are estimates and may depend on production and logistics.",
  "Import duties, customs clearance, destination taxes and charges are the buyer's responsibility unless otherwise agreed.",
].join("\n");

const CURRENCIES = ["USD", "EUR", "GBP", "AED", "SAR", "INR", "AUD", "CAD"];
const SYM: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", AED: "د.إ", SAR: "﷼", INR: "₹", AUD: "A$", CAD: "C$" };
const num = (v: unknown) => { const n = parseFloat(String(v ?? "")); return isNaN(n) ? 0 : n; };
const money = (v: unknown, cur: string) => `${SYM[cur] || ""}${num(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (d: number) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);

type PItem = { sku: string; name: string; description: string; images: string[]; quantity: number | string; unit: string; unit_price: number | string };
const blankItem = (): PItem => ({ sku: "", name: "", description: "", images: [], quantity: 1, unit: "pcs", unit_price: 0 });

/** One-page manual quotation: your details pre-filled, buyer + products typed in, PDF generated. */
export function ManualQuotation() {
  const [exporter, setExporter] = useState<Record<string, string>>({ ...EXPORTER_DEFAULTS });
  const [buyer, setBuyer] = useState<Record<string, string>>({ company: "", contact: "", email: "", phone: "", country: "", address: "", tax_id: "" });
  const [items, setItems] = useState<PItem[]>([blankItem()]);
  const [currency, setCurrency] = useState("USD");
  const [discount, setDiscount] = useState(0);
  const [packing, setPacking] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [tax, setTax] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState("");
  const [terms, setTerms] = useState(DEFAULT_TERMS);
  const [quoteDate, setQuoteDate] = useState(today());
  const [expiryDate, setExpiryDate] = useState(plusDays(30));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [result, setResult] = useState<{ id: number; number: string } | null>(null);
  const [pdfReady, setPdfReady] = useState(false);

  // Merge saved company profile over the defaults so admin edits are honoured.
  useEffect(() => {
    api<Record<string, any>>("/api/company-profile").then((c) => {
      if (!c) return;
      const map: Record<string, string> = {
        company_name: "name", address: "address", city: "city", state: "state", postal_code: "postal_code",
        country: "country", email: "email", phone: "phone", whatsapp: "whatsapp", website: "website", gstin: "gstin", iec: "iec",
      };
      setExporter((prev) => {
        const next = { ...prev };
        for (const [k, ck] of Object.entries(map)) if (c[ck]) next[k] = String(c[ck]);
        return next;
      });
      if (c.default_currency) setCurrency(c.default_currency);
      if (c.validity_days) setExpiryDate(plusDays(Number(c.validity_days) || 30));
    }).catch(() => undefined);
  }, []);

  const setExp = (k: string, v: string) => setExporter((e) => ({ ...e, [k]: v }));
  const setBuy = (k: string, v: string) => setBuyer((b) => ({ ...b, [k]: v }));
  const setItem = (i: number, k: keyof PItem, v: any) => setItems((prev) => {
    const next = [...prev]; next[i] = { ...next[i], [k]: v }; return next;
  });
  const upload = async (i: number, files: FileList | null) => {
    if (!files?.length) return;
    const fd = new FormData(); Array.from(files).forEach((f) => fd.append("files", f));
    try {
      const r = await apiUpload<{ files: { url: string }[] }>("/api/quotations/upload", fd);
      setItem(i, "images", [...items[i].images, ...(r.files || []).map((f) => f.url)]);
    } catch (e) { setMsg(`Image upload failed: ${String(e)}`); }
  };

  const lineTotal = (it: PItem) => num(it.quantity) * num(it.unit_price);
  const subtotal = items.reduce((s, it) => s + lineTotal(it), 0);
  const grand = subtotal + num(shipping) + num(packing) - num(discount) + num(tax);

  const buildPayload = () => ({
    status: "draft",
    exporter: { ...exporter, name: exporter.company_name },
    buyer_company: buyer.company, buyer_contact: buyer.contact, buyer_email: buyer.email,
    buyer_phone: buyer.phone, buyer_country: buyer.country, buyer_address: buyer.address,
    currency, quote_date: quoteDate, expiry_date: expiryDate,
    shipping_charges: num(shipping), packing_charges: num(packing), discount: num(discount), tax: num(tax),
    payment_terms: paymentTerms, terms,
    items: items.map((it, idx) => ({
      sku: it.sku, name: it.name, description: it.description, images: it.images,
      quantity: num(it.quantity), unit: it.unit, unit_price: num(it.unit_price),
      line_total: lineTotal(it), sort_order: idx,
    })),
  });

  const generate = async () => {
    setMsg(""); setPdfReady(false); setResult(null);
    if (!buyer.company.trim() && !buyer.contact.trim()) { setMsg("Enter at least a buyer company or contact name."); return; }
    if (!items.some((it) => it.name.trim())) { setMsg("Enter a product name for at least one row."); return; }
    setBusy(true);
    try {
      const q = await api<any>("/api/quotations", { method: "POST", body: JSON.stringify(buildPayload()) });
      setResult({ id: q.id, number: q.number });
      setMsg(`Quotation ${q.number} created.`);
    } catch (e) { setMsg(`Could not create quotation: ${String(e)}`); }
    finally { setBusy(false); }
  };

  const fetchPdf = async (): Promise<Blob | null> => {
    if (!result) return null;
    const token = getToken();
    const r = await fetch(`/api/quotations/${result.id}/pdf`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!r.ok) { setMsg(`PDF failed (${r.status}).`); return null; }
    setPdfReady(true);
    return await r.blob();
  };
  const preview = async () => { const b = await fetchPdf(); if (b) window.open(URL.createObjectURL(b), "_blank", "noopener"); };
  const download = async () => {
    const b = await fetchPdf(); if (!b || !result) return;
    const url = URL.createObjectURL(b); const a = document.createElement("a");
    a.href = url; a.download = `${result.number}.pdf`; a.click(); URL.revokeObjectURL(url);
  };

  const field = (label: string, value: string, onChange: (v: string) => void, opts?: { type?: string; wide?: boolean; placeholder?: string }) => (
    <label className={`block ${opts?.wide ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-semibold text-navy">{label}</span>
      <input className="input mt-1" type={opts?.type || "text"} value={value} placeholder={opts?.placeholder || ""} onChange={(e) => onChange(e.target.value)} />
    </label>
  );

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link href="/admin/documents" className="link text-sm">← Document Studio</Link>
          <h1 className="text-2xl font-bold mt-1">Manual Quotation</h1>
          <p className="text-sm text-gray mt-1">Your details are filled in. Type the buyer and products, then click <b>Generate Quotation</b>.</p>
        </div>
        {result && <div className="flex gap-2 flex-wrap">
          <span className="badge badge-green self-center font-mono">{result.number}</span>
          <button className="btn btn-sm" onClick={preview}>Preview PDF</button>
          <button className="btn btn-primary btn-sm" onClick={download}>Download PDF</button>
        </div>}
      </div>

      {msg && <p className="text-sm text-brass-dark">{msg}</p>}

      {/* STEP 1 — your details */}
      <section className="card">
        <h2 className="font-semibold text-navy mb-1">1 · Your details (pre-filled — edit if needed)</h2>
        <p className="text-xs text-gray mb-4">These appear on the quotation as the seller/exporter.</p>
        <div className="grid sm:grid-cols-3 gap-3">
          {field("Company name", exporter.company_name || "", (v) => setExp("company_name", v), { wide: true })}
          {field("Address", exporter.address || "", (v) => setExp("address", v), { wide: true })}
          {field("City", exporter.city || "", (v) => setExp("city", v))}
          {field("State", exporter.state || "", (v) => setExp("state", v))}
          {field("Postal code", exporter.postal_code || "", (v) => setExp("postal_code", v))}
          {field("Country", exporter.country || "", (v) => setExp("country", v))}
          {field("Email", exporter.email || "", (v) => setExp("email", v))}
          {field("Phone", exporter.phone || "", (v) => setExp("phone", v))}
          {field("WhatsApp", exporter.whatsapp || "", (v) => setExp("whatsapp", v))}
          {field("Website", exporter.website || "", (v) => setExp("website", v))}
          {field("GSTIN", exporter.gstin || "", (v) => setExp("gstin", v))}
          {field("IEC", exporter.iec || "", (v) => setExp("iec", v))}
        </div>
      </section>

      {/* STEP 2 — buyer */}
      <section className="card">
        <h2 className="font-semibold text-navy mb-1">2 · Buyer details</h2>
        <p className="text-xs text-gray mb-4">Enter manually — the buyer does not need to be saved in your system.</p>
        <div className="grid sm:grid-cols-3 gap-3">
          {field("Company / buyer name *", buyer.company, (v) => setBuy("company", v))}
          {field("Contact person", buyer.contact, (v) => setBuy("contact", v))}
          {field("Email", buyer.email, (v) => setBuy("email", v), { type: "email" })}
          {field("Phone", buyer.phone, (v) => setBuy("phone", v))}
          {field("Country", buyer.country, (v) => setBuy("country", v))}
          {field("Tax ID / VAT", buyer.tax_id, (v) => setBuy("tax_id", v))}
          {field("Address", buyer.address, (v) => setBuy("address", v), { wide: true })}
        </div>
      </section>

      {/* STEP 3 — products */}
      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <div><h2 className="font-semibold text-navy mb-1">3 · Products</h2>
            <p className="text-xs text-gray">Add as many as you like — custom products are fine.</p></div>
          <button className="btn btn-outline btn-sm" onClick={() => setItems([...items, blankItem()])}>+ Add product</button>
        </div>
        <div className="space-y-4">
          {items.map((it, i) => (
            <div key={i} className="border border-sand rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <b className="text-sm text-navy">Product {i + 1}</b>
                <div className="flex gap-2">
                  <button className="btn btn-ghost btn-sm" title="Move up" onClick={() => { if (i > 0) { const n = [...items]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; setItems(n); } }}>↑</button>
                  <button className="btn btn-ghost btn-sm" title="Move down" onClick={() => { if (i < items.length - 1) { const n = [...items]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; setItems(n); } }}>↓</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setItems(items.filter((_, j) => j !== i))}>Remove</button>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {field("Product name", it.name, (v) => setItem(i, "name", v))}
                {field("SKU", it.sku, (v) => setItem(i, "sku", v))}
                {field("Description", it.description, (v) => setItem(i, "description", v), { wide: true })}
                <label className="block"><span className="text-xs font-semibold text-navy">Quantity</span>
                  <input className="input mt-1" type="number" min="0" value={it.quantity} onChange={(e) => setItem(i, "quantity", e.target.value)} /></label>
                <label className="block"><span className="text-xs font-semibold text-navy">Unit</span>
                  <select className="input mt-1" value={it.unit} onChange={(e) => setItem(i, "unit", e.target.value)}>
                    {["pcs", "set", "carton", "kg", "piece", "dozen", "pair"].map((u) => <option key={u}>{u}</option>)}
                  </select></label>
                <label className="block"><span className="text-xs font-semibold text-navy">Unit price</span>
                  <input className="input mt-1" type="number" min="0" value={it.unit_price} onChange={(e) => setItem(i, "unit_price", e.target.value)} /></label>
                <div className="flex items-end"><p className="text-sm ml-auto">Amount: <b>{money(lineTotal(it), currency)}</b></p></div>
                <label className="block sm:col-span-2"><span className="text-xs font-semibold text-navy">Product images</span>
                  <input type="file" accept="image/*" multiple className="block mt-1 text-xs" onChange={(e) => upload(i, e.target.files)} />
                  <div className="flex gap-2 mt-2 flex-wrap">{it.images.map((src, k) => (
                    <div key={k} className="relative">
                      <img src={src} alt="Product" className="h-14 w-14 object-cover rounded border border-sand" />
                      <button className="absolute -top-1 -right-1 bg-navy text-white rounded-full w-5 h-5 text-[10px]"
                        onClick={() => setItem(i, "images", it.images.filter((_, j) => j !== k))}>×</button>
                    </div>
                  ))}</div>
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* STEP 4 — charges, dates, terms */}
      <section className="card">
        <h2 className="font-semibold text-navy mb-4">4 · Prices, charges & terms</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="block"><span className="text-xs font-semibold text-navy">Currency</span>
            <select className="input mt-1" value={currency} onChange={(e) => setCurrency(e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></label>
          {field("Discount", discount as any, (v) => setDiscount(num(v)), { type: "number" })}
          {field("Packing charges", packing as any, (v) => setPacking(num(v)), { type: "number" })}
          {field("Shipping charges", shipping as any, (v) => setShipping(num(v)), { type: "number" })}
          {field("Tax", tax as any, (v) => setTax(num(v)), { type: "number" })}
          <label className="block"><span className="text-xs font-semibold text-navy">Quote date</span>
            <input type="date" className="input mt-1" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} /></label>
          <label className="block"><span className="text-xs font-semibold text-navy">Valid until</span>
            <input type="date" className="input mt-1" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} /></label>
          {field("Payment terms", paymentTerms, setPaymentTerms)}
          <label className="block sm:col-span-3"><span className="text-xs font-semibold text-navy">Terms & conditions (one per line)</span>
            <textarea rows={7} className="input mt-1" value={terms} onChange={(e) => setTerms(e.target.value)} /></label>
        </div>
        <div className="text-right mt-4 pt-3 border-t border-sand space-y-1">
          <p className="text-sm">Subtotal: <b>{money(subtotal, currency)}</b></p>
          <p className="text-lg font-bold text-navy">Grand total: {money(grand, currency)}</p>
        </div>
      </section>

      <div className="card flex items-center justify-between flex-wrap gap-3 sticky bottom-3">
        <div><p className="text-sm text-gray">Ready to generate?</p>
          <p className="text-xs text-gray">The quotation is saved and its PDF is generated instantly.</p></div>
        <button className="btn btn-primary btn-lg" onClick={generate} disabled={busy}>
          {busy ? "Generating…" : "Generate Quotation"}
        </button>
      </div>
    </div>
  );
}
