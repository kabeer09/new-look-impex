"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHero } from "@/components/public/Shared";
import { Loading } from "@/components/public/States";
import { api, trackEvent } from "@/lib/api";
import { useRfqCart } from "@/lib/rfq";
import { useWhatsappNumber } from "@/hooks/useWhatsapp";
import type { PublicSettings, RfqSubmitResult } from "@/lib/types";

/** Compose the WhatsApp enquiry text with customer details + every selected product. */
function buildWaText(
  form: { full_name: string; business_email: string; company_name: string; country: string; phone: string; target_price: string; delivery_timeframe: string; additional_requirements: string },
  items: { product_name: string; quantity: number; notes?: string; unit?: string }[],
  reference?: string
): string {
  const lines: (string | false)[] = [
    "*New Quote Request — New Look Impex*⃟",
    reference ? `Ref: ${reference}` : false,
    `Name: ${form.full_name}`,
    `Company: ${form.company_name}`,
    `Email: ${form.business_email}`,
    form.country ? `Country: ${form.country}` : false,
    form.phone ? `Phone: ${form.phone}` : false,
    form.target_price ? `Target price: ${form.target_price}` : false,
    form.delivery_timeframe ? `Delivery timeframe: ${form.delivery_timeframe}` : false,
    form.additional_requirements ? `Requirements: ${form.additional_requirements}` : false,
    "",
    "*Selected Products:*",
    ...items.map(
      (it, i) => `${i + 1}. ${it.product_name} — Qty: ${it.quantity}${it.unit ? ` ${it.unit}` : ""}${it.notes ? ` ⃟ ${it.notes}` : ""}`
    ),
  ];
  return lines.filter((l) => typeof l === "string").join("\n");
}

export default function RequestQuotePage() {
  const cart = useRfqCart();
  const waNumber = useWhatsappNumber();
  const [countries, setCountries] = useState<string[]>([]);
  const [form, setForm] = useState({
    full_name: "",
    business_email: "",
    company_name: "",
    country: "",
    phone: "",
    target_price: "",
    delivery_timeframe: "",
    additional_requirements: "",
    consent: false,
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RfqSubmitResult | null>(null);
  const [waLink, setWaLink] = useState("");
  const waDigits = waNumber.replace(/\D/g, "");

  /** Pre-submit option: send the current selection without submitting the form. */
  const waSelectionLink = (() => {
    if (cart.items.length === 0) return "";
    const text = buildWaText(form, cart.items);
    return `https://wa.me/${waDigits}?text=${encodeURIComponent(text)}`;
  })();

  useEffect(() => {
    api<PublicSettings>("/api/public/settings")
      .then((s) => setCountries(s.countries || []))
      .catch(() => undefined);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);
    if (cart.items.length === 0) {
      setError("Add at least one product to the RFQ cart before submitting.");
      return;
    }
    if (!form.consent) {
      setError("Please tick the consent box to submit a quote request.");
      return;
    }
    setSending(true);
    try {
      const res = await api<RfqSubmitResult>("/api/public/rfqs", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          phone: form.phone || undefined,
          target_price: form.target_price || undefined,
          delivery_timeframe: form.delivery_timeframe || undefined,
          additional_requirements: form.additional_requirements || undefined,
          items: cart.items.map((i) => ({
            product_id: i.product_id,
            product_name: i.product_name,
            quantity: i.quantity,
            unit: i.unit || undefined,
            notes: i.notes || undefined,
          })),
        }),
      });
      trackEvent({ event_type: "rfq_submit" });
      const finalText = buildWaText(form, cart.items, res.reference_number);
      setWaLink(`https://wa.me/${waDigits}?text=${encodeURIComponent(finalText)}`);
      setResult(res);
      cart.clear();
    } catch (err) {
      setError(String(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <PageHero
        title="Request a Wholesale Quote"
        subtitle="Submit a request for quotation (RFQ) — receive a written quote with MOQ, lead time and packaging."
      />
      <div className="container-x section">
        {result ? (
          <div className="max-w-2xl">
            <div className="card border-green-200">
              <h2 className="font-serif font-bold text-navy text-2xl">Quote request received</h2>
              <div className="mt-4">
                <p className="text-xs text-gray uppercase tracking-wider">Reference number</p>
                <p className="text-2xl font-mono font-bold text-navy mt-1">{result.reference_number}</p>
              </div>
              <p className="text-sm text-gray mt-4">{result.message}</p>
              {result.email_sent === false && (
                <p className="text-xs text-gray mt-2">
                  Note: confirmation email delivery is not configured on our side — please keep your
                  reference number. Your request is stored in our system.
                </p>
              )}
              <p className="text-xs text-gray mt-2">
                Quote requests may be rate-limited or rejected as duplicates within 24 hours for
                identical email + items.
              </p>
              <button
                type="button"
                onClick={() => { if (waLink) window.open(waLink, "_blank", "noopener,noreferrer"); }}
                className="btn w-full mt-6 !bg-[#25D366] !text-white hover:!bg-[#1eb955]"
              >
                📲 Send this request to our WhatsApp
              </button>
              <p className="text-xs text-gray mt-2">
                Opens WhatsApp with your details and every selected product already written —
                just press send so we receive it instantly.
              </p>
              <div className="flex gap-2 mt-6">
                <Link href="/products" className="btn btn-primary btn-sm">Continue shopping</Link>
                <Link href="/wholesale" className="btn btn-outline btn-sm">How RFQ works</Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8 items-start">
            {/* Cart items */}
            <div className="lg:col-span-1">
              <h2 className="font-serif font-bold text-navy text-xl mb-4">Selected products ({cart.count})</h2>
              {cart.items.length === 0 ? (
                <div className="card text-sm text-gray">
                  <p>Your RFQ cart is empty.</p>
                  <p className="mt-2">Add products from the shop, then return here to submit quantities and request a quote.</p>
                  <Link href="/products" className="btn btn-primary btn-sm mt-4">Browse products</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.items.map((item) => (
                    <div key={item.product_id} className="card !p-4">
                      <div className="flex justify-between gap-2">
                        <Link href={`/products/${item.product_id}`} className="font-medium text-navy hover:underline">
                          {item.product_name}
                        </Link>
                        <button className="text-red-700 text-xs hover:underline" onClick={() => cart.remove(item.product_id)} aria-label={`Remove ${item.product_name}`}>
                          Remove
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <label className="text-xs text-gray" htmlFor={`rfq-qty-${item.product_id}`}>Qty</label>
                        <input
                          id={`rfq-qty-${item.product_id}`}
                          type="number"
                          min={1}
                          className="input !w-24 !py-1"
                          value={item.quantity}
                          onChange={(e) => cart.setQuantity(item.product_id, parseInt(e.target.value, 10) || 1)}
                        />
                      </div>
                      <input
                        className="input !py-1 mt-2"
                        placeholder="Notes for this item (optional)"
                        value={item.notes || ""}
                        onChange={(e) => cart.setNote(item.product_id, e.target.value)}
                        aria-label={`Notes for ${item.product_name}`}
                      />
                    </div>
                  ))}
                  <button className="btn btn-ghost btn-sm" onClick={() => cart.clear()}>Clear all</button>
                  {waSelectionLink && (
                    <a
                      href={waSelectionLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm w-full !bg-[#25D366] !text-white hover:!bg-[#1eb955]"
                    >
                      📲 Send selection via WhatsApp
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Form */}
            <form className="lg:col-span-2 card" onSubmit={submit}>
              <h2 className="font-serif font-bold text-navy text-xl">Your details</h2>
              {error && <p className="text-sm text-red-700 mt-3" role="alert">{error}</p>}
              <div className="mt-4 grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="rfq-name">Full name *</label>
                  <input id="rfq-name" className="input" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="rfq-email">Business email *</label>
                  <input id="rfq-email" type="email" className="input" required value={form.business_email} onChange={(e) => setForm({ ...form, business_email: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="rfq-company">Company *</label>
                  <input id="rfq-company" className="input" required value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="rfq-country">Country *</label>
                  {countries.length > 0 ? (
                    <select id="rfq-country" className="input" required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
                      <option value="">Select…</option>
                      {countries.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  ) : (
                    <input id="rfq-country" className="input" required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Country" />
                  )}
                </div>
                <div>
                  <label className="label" htmlFor="rfq-phone">Phone (optional)</label>
                  <input id="rfq-phone" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="rfq-price">Target price (optional)</label>
                  <input id="rfq-price" className="input" value={form.target_price} onChange={(e) => setForm({ ...form, target_price: e.target.value })} placeholder="e.g. USD 12/unit" />
                </div>
                <div>
                  <label className="label" htmlFor="rfq-timeframe">Delivery timeframe (optional)</label>
                  <input id="rfq-timeframe" className="input" value={form.delivery_timeframe} onChange={(e) => setForm({ ...form, delivery_timeframe: e.target.value })} placeholder="e.g. before Diwali / 6 weeks" />
                </div>
              </div>
              <div className="mt-3">
                <label className="label" htmlFor="rfq-reqs">Additional requirements</label>
                <textarea id="rfq-reqs" rows={4} className="input" value={form.additional_requirements} onChange={(e) => setForm({ ...form, additional_requirements: e.target.value })} placeholder="Finishes, packaging, customisation, shipping destination…" />
              </div>
              <label className="flex items-start gap-2 mt-4 text-sm">
                <input type="checkbox" required className="mt-1 accent-[#172A3A]" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
                <span>
                  I consent to New Look Impex storing this request and contacting me about this
                  quotation. I understand my data is used only to respond to this RFQ.{" "}
                  <a className="link" href="/privacy">Privacy policy</a>
                </span>
              </label>
              <button type="submit" className="btn btn-brass w-full mt-5" disabled={sending || cart.items.length === 0}>
                {sending ? "Submitting…" : `Submit quote request (${cart.count} ${cart.count === 1 ? "item" : "items"})`}
              </button>
              <p className="text-xs text-gray mt-3">
                Duplicate requests (same email + items within 24h) may be rejected with a 409 —
                use your original reference number for follow-ups.
              </p>
            </form>
          </div>
        )}
      </div>
      {cart.items.length === 0 && !result && (
        <div className="container-x pb-4">
          <Loading label="" />
        </div>
      )}
    </>
  );
}
