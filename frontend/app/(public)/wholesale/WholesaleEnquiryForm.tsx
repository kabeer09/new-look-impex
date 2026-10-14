"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, trackEvent } from "@/lib/api";
import type { EnquiryInput, PublicSettings } from "@/lib/types";

/** Buyer enquiry form (POST /api/public/enquiries) for the wholesale page sidebar. */
export function WholesaleEnquiryForm() {
  const [form, setForm] = useState<EnquiryInput>({ name: "", email: "", country: "", product_interest: "", message: "" });
  const [countries, setCountries] = useState<string[]>([]);
  const [sent, setSent] = useState("");
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api<PublicSettings>("/api/public/settings")
      .then((s) => setCountries(s.countries || []))
      .catch(() => undefined);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setSent("");
    setSending(true);
    try {
      await api("/api/public/enquiries", { method: "POST", body: JSON.stringify(form) });
      trackEvent({ event_type: "contact_click" });
      setSent("Thank you — your enquiry has been received. We will respond by email.");
      setForm({ name: "", email: "", country: "", product_interest: "", message: "" });
    } catch (e) {
      setErr(String(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="card">
      <h2 className="font-serif font-bold text-navy text-xl">Buyer enquiry</h2>
      <p className="text-sm text-gray mt-1">Tell us what you need — we reply with a wholesale quote.</p>
      {sent && <p className="text-sm text-green-700 mt-3" role="status">{sent}</p>}
      {err && <p className="text-sm text-red-700 mt-3" role="alert">{err}</p>}
      <form className="mt-4 space-y-3" onSubmit={submit}>
        <div>
          <label className="label" htmlFor="ws-name">Full name *</label>
          <input id="ws-name" className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="ws-email">Business email *</label>
          <input id="ws-email" type="email" className="input" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="ws-country">Country</label>
            {countries.length > 0 ? (
              <select id="ws-country" className="input" value={form.country || ""} onChange={(e) => setForm({ ...form, country: e.target.value })}>
                <option value="">Select…</option>
                {countries.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            ) : (
              <input id="ws-country" className="input" value={form.country || ""} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            )}
          </div>
          <div>
            <label className="label" htmlFor="ws-interest">Product interest</label>
            <input id="ws-interest" className="input" value={form.product_interest || ""} onChange={(e) => setForm({ ...form, product_interest: e.target.value })} placeholder="e.g. Brass urlis" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="ws-msg">Requirements</label>
          <textarea id="ws-msg" rows={4} className="input" value={form.message || ""} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Products, quantities, destination…" />
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={sending}>
          {sending ? "Sending…" : "Send enquiry"}
        </button>
        <p className="text-xs text-gray">
          We only use your details to respond to this enquiry. See <Link className="link" href="/privacy">privacy policy</Link>.
        </p>
      </form>
    </div>
  );
}
