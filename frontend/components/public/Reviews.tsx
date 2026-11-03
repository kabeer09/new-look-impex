"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Review = { id: number; name: string; rating: number; title: string; body: string; date: string | null };

export function Reviews({ slug }: { slug: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);
  const [form, setForm] = useState({ name: "", email: "", rating: 5, title: "", body: "" });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => {
    api<{ count: number; average: number; items: Review[] }>(`/api/public/products/${slug}/reviews`)
      .then((d) => { setReviews(d.items); setAvg(d.average); setCount(d.count); })
      .catch(() => undefined);
  };

  useEffect(() => { load(); }, [slug]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg("");
    try {
      await api(`/api/public/products/${slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setMsg("Review submitted for moderation. Thank you!");
      setForm({ name: "", email: "", rating: 5, title: "", body: "" });
    } catch (err: any) {
      setMsg(err?.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="section !pt-0" aria-labelledby="reviews">
      <h2 id="reviews" className="font-serif font-bold text-espresso text-2xl mb-4">
        Customer Reviews {count > 0 && <span className="text-gray text-base font-normal">({count} · {avg}★)</span>}
      </h2>

      {reviews.length === 0 ? (
        <p className="text-sm text-gray">No reviews yet. Be the first to review this product!</p>
      ) : (
        <div className="space-y-4 mb-6">
          {reviews.map((r) => (
            <div key={r.id} className="card">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-gold">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                <span className="text-xs text-gray">{r.name}</span>
                {r.date && <span className="text-xs text-gray">· {new Date(r.date).toLocaleDateString()}</span>}
              </div>
              {r.title && <p className="font-semibold text-espresso text-sm">{r.title}</p>}
              {r.body && <p className="text-sm text-gray mt-1">{r.body}</p>}
            </div>
          ))}
        </div>
      )}

      <details className="card">
        <summary className="cursor-pointer font-semibold text-espresso text-sm">Write a review</summary>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <input className="input" placeholder="Your name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input className="input" placeholder="Email (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray">Rating:</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} onClick={() => setForm({ ...form, rating: n })}
                className={`text-xl ${n <= form.rating ? "text-gold" : "text-gray/30"}`}>★</button>
            ))}
          </div>
          <input className="input" placeholder="Review title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className="input" rows={3} placeholder="Your review..." value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          {msg && <p className="text-sm text-clay">{msg}</p>}
          <button type="submit" className="btn btn-clay btn-sm" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      </details>
    </section>
  );
}