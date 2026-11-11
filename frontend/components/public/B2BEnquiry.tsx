"use client";

import { useState } from "react";
import Link from "next/link";

type Fields = {
  name: string;
  email: string;
  company: string;
  country: string;
  product: string;
  quantity: string;
  customisation: string;
  message: string;
};

export function B2BEnquiry() {
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus("idle");

    // In production, this would POST to an API endpoint
    // For now, simulate submission
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setSubmitting(false);
    setStatus("success");

    // Reset form after 3 seconds
    const timeout = setTimeout(() => {
      setStatus("idle");
      clearTimeout(timeout);
    }, 3000);
  };

  if (status === "success") {
    return (
      <div className="max-w-md mx-auto py-24 text-center">
        <div className="bg-antiqueGold text-charcoal p-8 rounded-2xl mb-6">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#A7834E" strokeWidth="1.5" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M19 21l-4-4l-4 4l-5-5l5-5l5 5l4 4l4-4z" />
          </svg>
          <h3 className="mt-4 text-xl font-medium text-charcoal">Enquiry Submitted</h3>
          <p className="mt-2 text-charcoal/70">
            We'll get back to you within 24 hours with a written quotation.
          </p>
        </div>
        <p className="text-charcoal/60 text-sm mt-4">
          Reference number: NLI-{Math.random().toString(36).substr(2, 8).toUpperCase()}
        </p>
      </div>
    );
  }

  return (
    <section className="py-24 md:py-32 lg:py-40 bg-cream">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-charcoal mb-8">
          B2B Enquiry
        </h2>
        <p className="mb-8 text-charcoal/70">
          Request a wholesale quotation for our copper and brass collections. Please include your requirements and we'll respond with a detailed written quotation within 24 hours.
        </p>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 p-6 rounded-2xl bg-charcoal/5 border border-cream/20"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">
                Full Name
              </label>
              <input
                type="text"
                required
                value=""
                onChange={(e) => {}}
                className="w-full px-4 py-3 rounded border border-cream/20 text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-clay/30 transition-colors"
                aria-required="true"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">
                Business Email
              </label>
              <input
                type="email"
                required
                value=""
                onChange={(e) => {}}
                className="w-full px-4 py-3 rounded border border-cream/20 text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-clay/30 transition-colors"
                aria-required="true"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">
              Company
              <span className="text-charcoal/60 text-xs">(Optional)</span>
            </label>
            <input
              type="text"
              value=""
              onChange={(e) => {}}
              className="w-full px-4 py-3 rounded border border-cream/20 text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-clay/30 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">
                Country
              </label>
              <select
                value=""
                onChange={(e) => {}}
                className="w-full px-4 py-3 rounded border border-cream/20 text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-clay/30 transition-colors"
              >
                <option value="India" selected>
                  India
                </option>
                <option value="USA">USA</option>
                <option value="UK">UK</option>
                <option value="UAE">UAE</option>
                <option value="Australia">Australia</option>
                <option value="Canada">Canada</option>
                <option value="Europe">Europe</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">
                Product Interest
              </label>
              <select
                value=""
                onChange={(e) => {}}
                className="w-full px-4 py-3 rounded border border-cream/20 text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-clay/30 transition-colors"
              >
                <option value="select" selected>
                  Select a product
                </option>
                <option value="copper-collection">Copper Collection</option>
                <option value="brass-collection">Brass Collection</option>
                <option value="home-decor">Home Décor</option>
                <option value="gifting">Festive & Gifting</option>
                <option value="custom">Custom Manufacturing</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">
              Quantity
              <span className="text-charcoal/60 text-xs">(Optional)</span>
            </label>
            <input
              type="number"
              value=""
              onChange={(e) => {}}
              className="w-full px-4 py-3 rounded border border-cream/20 text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-clay/30 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">
              Customisation Requirements
              <span className="text-charcoal/60 text-xs">
                (Engraving, finishes, private label, etc.)
              </span>
            </label>
            <textarea
              rows={3}
              value=""
              onChange={(e) => {}}
              className="w-full px-4 py-3 rounded border border-cream/20 text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-clay/30 transition-colors resize-none"
              aria-required="true"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">
              Message
              <span className="text-charcoal/60 text-xs">(Optional)</span>
            </label>
            <textarea
              rows={4}
              value=""
              onChange={(e) => {}}
              className="w-full px-4 py-3 rounded border border-cream/20 text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-clay/30 transition-colors resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-charcoal text-white py-4 rounded text-playfair font-medium hover:bg-charcoal/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            {submitting ? "Sending…" : "Submit Enquiry"}
          </button>
        </form>

        {status !== "idle" && status !== "error" && (
          <p className="mt-6 text-center text-charcoal/60 text-sm">
            We'll get back to you within 24 hours with a written quotation.
          </p>
        )}
      </div>
    </section>
  );
}