"use client";
import { useEffect, useState } from "react";
import { PageHero } from "@/components/public/Shared";
import { api, trackEvent, BUSINESS_EMAIL, BUSINESS_PHONES, WHATSAPP_URL, BUSINESS_LOCATION } from "@/lib/api";
import type { EnquiryInput, PublicSettings } from "@/lib/types";

export default function ContactPage() {
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [sent, setSent] = useState("");
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState<EnquiryInput>({ name: "", email: "", country: "", product_interest: "", message: "" });

  // Contact details come from settings when available; known constants are the fallback.
  useEffect(() => {
    api<PublicSettings>("/api/public/settings")
      .then(setSettings)
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
    } catch (error) {
      setErr(String(error));
    } finally {
      setSending(false);
    }
  };

  const email = settings?.email || BUSINESS_EMAIL;
  const phones = settings?.phones && settings.phones.length > 0 ? settings.phones : BUSINESS_PHONES;
  const location = settings?.location || BUSINESS_LOCATION;

  return (
    <>
      <PageHero title="Contact" subtitle="Wholesale enquiries — email, phone, WhatsApp or the form below." />
      <div className="container-x section">
        <div className="card max-w-2xl">
          <h2 className="font-serif font-bold text-navy text-xl">Send an enquiry</h2>
          {sent && <p className="text-sm text-green-700 mt-3">{sent}</p>}
          {err && <p className="text-sm text-red-700 mt-3">{err}</p>}
          <form className="mt-4 space-y-3" onSubmit={submit}>
            <div>
              <label className="label" htmlFor="ct-name">Full name *</label>
              <input id="ct-name" className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="ct-email">Business email *</label>
              <input id="ct-email" type="email" className="input" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="ct-country">Country</label>
                <input id="ct-country" className="input" value={form.country || ""} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="ct-interest">Product interest</label>
                <input id="ct-interest" className="input" value={form.product_interest || ""} onChange={(e) => setForm({ ...form, product_interest: e.target.value })} placeholder="e.g. Brass urlis" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="ct-msg">Message *</label>
              <textarea id="ct-msg" rows={6} className="input" required value={form.message || ""} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={sending}>
              {sending ? "Sending…" : "Send enquiry"}
            </button>
            <p className="text-xs text-gray">We only use your details to respond to this enquiry. See <a className="link" href="/privacy">privacy policy</a>.</p>
          </form>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-10">
          <div className="card">
            <h2 className="font-serif font-bold text-navy text-lg">Email</h2>
            <p className="text-sm text-gray mt-2">
              <a className="link" href={`mailto:${email}`}>{email}</a>
            </p>
            <p className="text-xs text-gray mt-2">We reply to wholesale enquiries within business days.</p>
          </div>
          <div className="card">
            <h2 className="font-serif font-bold text-navy text-lg">Phone</h2>
            <ul className="text-sm text-gray mt-2 space-y-1">
              {phones.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h2 className="font-serif font-bold text-navy text-lg">WhatsApp &amp; location</h2>
            <p className="text-sm text-gray mt-2">
              <a className="link" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                WhatsApp +91 8218251238
              </a>
            </p>
            <p className="text-sm text-gray mt-2">{location}</p>
          </div>
        </div>
      </div>
    </>
  );
}
