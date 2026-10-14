"use client";
import { useState } from "react";
import { PageHero } from "@/components/public/Shared";
import { api, trackEvent } from "@/lib/api";
import type { EnquiryInput } from "@/lib/types";

export default function CustomisationPage() {
  const [sent, setSent] = useState("");
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState<EnquiryInput>({ name: "", email: "", country: "", product_interest: "Custom / OEM", message: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setSent("");
    setSending(true);
    try {
      await api("/api/public/enquiries", { method: "POST", body: JSON.stringify(form) });
      trackEvent({ event_type: "contact_click" });
      setSent("Thank you — your customisation enquiry has been received. We will quote it like a wholesale order.");
      setForm({ name: "", email: "", country: "", product_interest: "Custom / OEM", message: "" });
    } catch (error) {
      setErr(String(error));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <PageHero
        title="Customisation & OEM Enquiries"
        subtitle="Specific sizes, finishes or a design to your brief — quoted like any wholesale order."
      />
      <div className="container-x section">
        <div className="grid md:grid-cols-2 gap-10">
          <div>
            <h2 className="font-serif font-bold text-navy text-2xl">The custom process</h2>
            <ol className="mt-5 space-y-4">
              {[
                ["Send your brief", "Describe the product, dimensions, material, finish, quantity and any design references in the form."],
                ["We confirm feasibility", "We review requirements and confirm what can be made, with MOQ and lead time."],
                ["Written quote", "You receive a per-order quotation — price, MOQ, lead time, packaging and shipping terms."],
                ["Production & dispatch", "On your confirmation, production begins under the quoted terms."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="w-8 h-8 rounded-full bg-navy text-gold-light font-bold flex items-center justify-center shrink-0 text-sm">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold">{t}</p>
                    <p className="text-sm text-gray mt-0.5">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
            <h2 className="font-serif font-bold text-navy text-2xl mt-10">What to include in your brief</h2>
            <ul className="text-sm text-gray mt-3 list-disc pl-5 space-y-1.5">
              <li>Product type (e.g. urli, diya, lantern, homeware piece)</li>
              <li>Material and finish preferences</li>
              <li>Dimensions or a sketch/photo reference</li>
              <li>Target quantity and delivery timeframe</li>
              <li>Destination country</li>
            </ul>
            <p className="text-sm text-gray mt-4">
              For catalogued products, you can also add them to the{" "}
              <a className="link" href="/request-quote">RFQ cart</a> and note your custom
              requirements per item.
            </p>
          </div>

          <div className="card">
            <h2 className="font-serif font-bold text-navy text-xl">Custom / OEM enquiry</h2>
            {sent && <p className="text-sm text-green-700 mt-3">{sent}</p>}
            {err && <p className="text-sm text-red-700 mt-3">{err}</p>}
            <form className="mt-4 space-y-3" onSubmit={submit}>
              <div>
                <label className="label" htmlFor="cu-name">Full name *</label>
                <input id="cu-name" className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="cu-email">Business email *</label>
                <input id="cu-email" type="email" className="input" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="cu-country">Country</label>
                <input id="cu-country" className="input" value={form.country || ""} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              </div>
              <input type="hidden" name="product_interest" value={form.product_interest} />
              <div>
                <label className="label" htmlFor="cu-msg">Requirements / design brief *</label>
                <textarea id="cu-msg" rows={7} className="input" required value={form.message || ""} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Product type, dimensions, material, finish, quantity, timeframe…" />
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={sending}>
                {sending ? "Sending…" : "Send customisation enquiry"}
              </button>
              <p className="text-xs text-gray">We only use your details to respond to this enquiry. See <a className="link" href="/privacy">privacy policy</a>.</p>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
