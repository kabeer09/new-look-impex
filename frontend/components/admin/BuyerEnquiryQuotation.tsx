"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, apiUpload, getToken } from "@/lib/api";

/* Verified business details used only as editable pre-fill. */
const EXPORTER_DEFAULTS: Record<string, string> = {
  company_name: "New Look Impex",
  address: "Ganga Mandir, Thana Nagphani Road, Kisrol, Moradabad - 244001, Uttar Pradesh, India",
  email: "newlookimpex130@gmail.com", phone: "+91 9808588603", whatsapp: "+91 96900 53913",
  website: "https://www.newlookimpex.store", gstin: "", iec: "",
};

const QUESTIONS = [
  "Final price per bottle, including laser engraving, standard packaging and air shipping to Ramat Gan, Israel (postal code 5229103)?",
  "Total order cost for 50 bottles — please break down product cost and shipping cost.",
  "Weight of each bottle including packaging, and estimated total shipping weight for 50 bottles?",
  "Copper purity — are the bottles made entirely of pure copper (not copper-plated)? Exact purity percentage and lab certificate?",
  "Drinking water safety — laboratory test reports confirming safety, including metal migration testing?",
  "Logo engraving — will the logo be laser engraved exactly as provided, without changes? Can you send a digital mockup for approval before production?",
  "Sample — one sample bottle with logo engraved; total price including engraving and air shipping to Israel?",
  "Production and delivery timelines — do 7–10 working days production and 4–5 working days air delivery apply?",
  "Quality and finish — smooth interior, no black spots or scratches, leakproof cap, no undisclosed internal coating; dishwasher safe or hand-wash only?",
  "Import charges — does the shipping quote include customs clearance, duties and taxes in Israel, or are these paid separately?",
];

const DEFAULT_TERMS = [
  "Quotation is valid until the specified expiry date.",
  "Prices and currency are as stated in this quotation.",
  "Shipping charges are estimates unless specifically confirmed.",
  "Production starts after order confirmation and agreed advance payment.",
  "Product specifications and customization must be approved before production.",
  "Import duties, customs clearance, destination taxes and charges are the buyer's responsibility unless otherwise agreed.",
].join("\n");

const CURRENCIES = ["USD", "EUR", "GBP", "AED", "SAR", "INR", "AUD", "CAD"];
const SYM: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", AED: "د.إ", SAR: "﷼", INR: "₹", AUD: "A$", CAD: "C$" };
const num = (v: unknown) => { const n = parseFloat(String(v ?? "")); return isNaN(n) ? 0 : n; };
const money = (v: unknown, cur: string) => `${SYM[cur] || ""}${num(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (d: number) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);

type Item = { sku: string; name: string; description: string; images: string[]; quantity: number | string; unit: string; unit_price: number | string };

/** Detailed buyer-enquiry quotation: 10 buyer questions with manual answer fields. */
export function BuyerEnquiryQuotation() {
  const [exporter, setExporter] = useState<Record<string, string>>({ ...EXPORTER_DEFAULTS });
  const [buyer, setBuyer] = useState<Record<string, string>>({
    company: "SHAVIA", contact: "Orly", email: "", phone: "", country: "Israel",
    address: "Ramat Gan 5229103, Israel", tax_id: "",
  });
  const [items, setItems] = useState<Item[]>([{
    sku: "", name: "Copper Bottle", description: "With laser-engraved SHAVIA logo", images: [], quantity: 50, unit: "pcs", unit_price: 0,
  }]);
  const [answers, setAnswers] = useState<string[]>(QUESTIONS.map(() => ""));
  const [currency, setCurrency] = useState("USD");
  const [shipping, setShipping] = useState(0);
  const [packing, setPacking] = useState(0);
  const [sample, setSample] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState("");
  const [terms, setTerms] = useState(DEFAULT_TERMS);
  const [quoteDate, setQuoteDate] = useState(today());
  const [expiryDate, setExpiryDate] = useState(plusDays(30));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [result, setResult] = useState<{ id: number; number: string } | null>(null);

  useEffect(() => {
    api<Record<string, any>>("/api/company-profile").then((c) => {
      if (!c) return;
      const map: Record<string, string> = {
        company_name: "name", address: "address", email: "email", phone: "phone", whatsapp: "whatsapp",
        website: "website", gstin: "gstin", iec: "iec",
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
  const setItem = (i: number, k: keyof Item, v: any) => setItems((prev) => {
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

  const lineTotal = (it: Item) => num(it.quantity) * num(it.unit_price);
  const subtotal = items.reduce((s, it) => s + lineTotal(it), 0);
  const grand = subtotal + num(shipping) + num(packing) + num(sample) - num(discount) + num(tax);

  const generate = async () => {
    setMsg(""); setResult(null);
    if (!buyer.company.trim() && !buyer.contact.trim()) { setMsg("Enter the buyer company or contact."); return; }
    if (!items.some((it) => it.name.trim())) { setMsg("Enter a product name."); return; }
    setBusy(true);
    try {
      const payload = {
        status: "draft",
        exporter: { ...exporter, name: exporter.company_name },
        buyer_company: buyer.company, buyer_contact: buyer.contact, buyer_email: buyer.email,
        buyer_phone: buyer.phone, buyer_country: buyer.country, buyer_address: buyer.address,
        currency, quote_date: quoteDate, expiry_date: expiryDate,
        shipping_charges: num(shipping), packing_charges: num(packing), sample_charges: num(sample),
        discount: num(discount), tax: num(tax), payment_terms: paymentTerms, terms,
        buyer_qa: QUESTIONS.map((q, i) => ({ q, a: answers[i] || "" })),
        items: items.map((it, idx) => ({
          sku: it.sku, name: it.name, description: it.description, images: it.images,
          quantity: num(it.quantity), unit: it.unit, unit_price: num(it.unit_price),
          line_total: lineTotal(it), sort_order: idx,
        })),
      };
      const q = await api<any>("/api/quotations", { method: "POST", body: JSON.stringify(payload) });
      setResult({ id: q.id, number: q.number });
      setMsg(`Quotation ${q.number} created with your responses.`);
    } catch (e) { setMsg(`Could not create quotation: ${String(e)}`); }
    finally { setBusy(false); }
  };

  const fetchPdf = async (): Promise<Blob | null> => {
    if (!result) return null;
    const token = getToken();
    const r = await fetch(`/api/quotations/${result.id}/pdf`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!r.ok) { setMsg(`PDF failed (${r.status}).`); return null; }
    return await r.blob();
  };
  const preview = async () => { const b = await fetchPdf(); if (b) window.open(URL.createObjectURL(b), "_blank", "noopener"); };
  const download = async () => {
    const b = await fetchPdf(); if (!b || !result) return;
    const url = URL.createObjectURL(b); const a = document.createElement("a");
    a.href = url; a.download = `${result.number}.pdf`; a.click(); URL.revokeObjectURL(url);
  };

  const field = (label: string, value: any, onChange: (v: string) => void, opts?: { type?: string; wide?: boolean }) => (
    <label className={`block ${opts?.wide ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-semibold text-navy">{label}</span>
      <input className="input mt-1" type={opts?.type || "text"} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </label>
  );

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link href="/admin/documents" className="link text-sm">← Document Studio</Link>
          <h1 className="text-2xl font-bold mt-1">Buyer Enquiry Quotation</h1>
          <p className="text-sm text-gray mt-1">For detailed buyer questions. The questions are pre-loaded — type your answers manually, then generate the quotation.</p>
        </div>
        {result && <div className="flex gap-2 flex-wrap items-center">
          <span className="badge badge-green font-mono">{result.number}</span>
          <button className="btn btn-sm" onClick={preview}>Preview PDF</button>
          <button className="btn btn-primary btn-sm" onClick={download}>Download PDF</button>
        </div>}
      </div>

      <div className="card border-brass bg-ivory">
        <p className="text-sm text-navy"><b>Accuracy note:</b> only enter figures and claims you can verify. Do not state copper purity, lab certificates, food-safety or performance claims unless you hold a genuine report. Leave an answer blank if you need to confirm it first.</p>
      </div>
      {msg && <p className="text-sm text-brass-dark">{msg}</p>}

      <section className="card">
        <h2 className="font-semibold text-navy mb-4">1 · Your details (pre-filled — edit if needed)</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {field("Company name", exporter.company_name, (v) => setExp("company_name", v), { wide: true })}
          {field("Address", exporter.address, (v) => setExp("address", v), { wide: true })}
          {field("Email", exporter.email, (v) => setExp("email", v))}
          {field("Phone", exporter.phone, (v) => setExp("phone", v))}
          {field("Website", exporter.website, (v) => setExp("website", v))}
          {field("GSTIN", exporter.gstin, (v) => setExp("gstin", v))}
          {field("IEC", exporter.iec, (v) => setExp("iec", v))}
        </div>
      </section>

      <section className="card">
        <h2 className="font-semibold text-navy mb-1">2 · Buyer details</h2>
        <p className="text-xs text-gray mb-4">Pre-filled from the enquiry — edit freely.</p>
        <div className="grid sm:grid-cols-3 gap-3">
          {field("Company / buyer", buyer.company, (v) => setBuy("company", v))}
          {field("Contact person", buyer.contact, (v) => setBuy("contact", v))}
          {field("Email", buyer.email, (v) => setBuy("email", v), { type: "email" })}
          {field("Phone", buyer.phone, (v) => setBuy("phone", v))}
          {field("Country", buyer.country, (v) => setBuy("country", v))}
          {field("Tax ID / VAT", buyer.tax_id, (v) => setBuy("tax_id", v))}
          {field("Address", buyer.address, (v) => setBuy("address", v), { wide: true })}
        </div>
      </section>

      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <div><h2 className="font-semibold text-navy mb-1">3 · Products</h2>
            <p className="text-xs text-gray">Enter the product, quantity and your real price.</p></div>
          <button className="btn btn-outline btn-sm" onClick={() => setItems([...items, { sku: "", name: "", description: "", images: [], quantity: 1, unit: "pcs", unit_price: 0 }])}>+ Add product</button>
        </div>
        {items.map((it, i) => (
          <div key={i} className="border border-sand rounded-lg p-4 mb-3">
            <div className="flex justify-between items-center mb-3">
              <b className="text-sm text-navy">Product {i + 1}</b>
              <button className="btn btn-ghost btn-sm" onClick={() => setItems(items.filter((_, j) => j !== i))}>Remove</button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {field("Product name", it.name, (v) => setItem(i, "name", v))}
              {field("SKU", it.sku, (v) => setItem(i, "sku", v))}
              {field("Description", it.description, (v) => setItem(i, "description", v), { wide: true })}
              {field("Quantity", it.quantity, (v) => setItem(i, "quantity", v), { type: "number" })}
              <label className="block"><span className="text-xs font-semibold text-navy">Unit</span>
                <select className="input mt-1" value={it.unit} onChange={(e) => setItem(i, "unit", e.target.value)}>{["pcs", "set", "carton", "kg", "piece", "dozen"].map((u) => <option key={u}>{u}</option>)}</select></label>
              {field("Unit price", it.unit_price, (v) => setItem(i, "unit_price", v), { type: "number" })}
              <div className="flex items-end"><p className="text-sm ml-auto">Amount: <b>{money(lineTotal(it), currency)}</b></p></div>
              <label className="block sm:col-span-2"><span className="text-xs font-semibold text-navy">Product images</span>
                <input type="file" accept="image/*" multiple className="block mt-1 text-xs" onChange={(e) => upload(i, e.target.files)} />
                <div className="flex gap-2 mt-2 flex-wrap">{it.images.map((src, k) => (
                  <img key={k} src={src} alt="Product" className="h-14 w-14 object-cover rounded border border-sand" />
                ))}</div>
              </label>
            </div>
          </div>
        ))}
      </section>

      <section className="card">
        <h2 className="font-semibold text-navy mb-1">4 · Buyer questions &amp; your answers</h2>
        <p className="text-xs text-gray mb-4">These appear in the PDF as “Your Questions &amp; Our Responses”. Leave a field empty if you are not ready to answer.</p>
        <div className="space-y-3">
          {QUESTIONS.map((q, i) => (
            <label key={i} className="block border-b border-sand pb-3 last:border-0">
              <span className="text-xs font-semibold text-navy block mb-1">{i + 1}. {q}</span>
              <textarea rows={2} className="input" placeholder="Your verified answer…" value={answers[i]} onChange={(e) => {
                const next = [...answers]; next[i] = e.target.value; setAnswers(next);
              }} />
            </label>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="font-semibold text-navy mb-4">5 · Prices, charges &amp; terms</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="block"><span className="text-xs font-semibold text-navy">Currency</span>
            <select className="input mt-1" value={currency} onChange={(e) => setCurrency(e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></label>
          {field("Air shipping / freight", shipping as any, (v) => setShipping(num(v)), { type: "number" })}
          {field("Packing charges", packing as any, (v) => setPacking(num(v)), { type: "number" })}
          {field("Sample charge", sample as any, (v) => setSample(num(v)), { type: "number" })}
          {field("Discount", discount as any, (v) => setDiscount(num(v)), { type: "number" })}
          {field("Tax", tax as any, (v) => setTax(num(v)), { type: "number" })}
          <label className="block"><span className="text-xs font-semibold text-navy">Quote date</span>
            <input type="date" className="input mt-1" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} /></label>
          <label className="block"><span className="text-xs font-semibold text-navy">Valid until</span>
            <input type="date" className="input mt-1" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} /></label>
          {field("Payment terms", paymentTerms, setPaymentTerms)}
          <label className="block sm:col-span-3"><span className="text-xs font-semibold text-navy">Terms &amp; conditions</span>
            <textarea rows={6} className="input mt-1" value={terms} onChange={(e) => setTerms(e.target.value)} /></label>
        </div>
        <div className="text-right mt-4 pt-3 border-t border-sand space-y-1">
          <p className="text-sm">Subtotal: <b>{money(subtotal, currency)}</b></p>
          <p className="text-lg font-bold text-navy">Grand total: {money(grand, currency)}</p>
        </div>
      </section>

      <div className="card flex items-center justify-between flex-wrap gap-3 sticky bottom-3">
        <div><p className="text-sm text-gray">Ready?</p><p className="text-xs text-gray">Quotation + PDF with your answers are generated instantly.</p></div>
        <button className="btn btn-primary btn-lg" onClick={generate} disabled={busy}>{busy ? "Generating…" : "Generate Quotation"}</button>
      </div>
    </div>
  );
}
