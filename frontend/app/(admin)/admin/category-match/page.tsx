"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loading, ErrorBox } from "@/components/public/States";

type Row = {
  product_id: number; name: string; sku: string; material: string;
  current: { id: number; slug: string; name: string } | null;
  suggested: { id: number; slug: string; name: string; confidence: string } | null;
  mismatch: boolean;
};
type Audit = { total: number; mismatches: number; rows: Row[]; note: string };

export default function CategoryMatch() {
  const [audit, setAudit] = useState<Audit | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [onlyMismatch, setOnlyMismatch] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    setLoading(true); setErr(""); setMsg("");
    api<Audit>("/api/admin/category-audit")
      .then(setAudit).catch((e) => setErr(String(e))).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const apply = async (productId: number, categoryId: number) => {
    setBusy(productId); setMsg("");
    try {
      const r = await api<{ category: string }>("/api/admin/category-match/apply", {
        method: "POST",
        body: JSON.stringify({ product_id: productId, category_id: categoryId }),
      });
      setMsg(`Applied: product ${productId} → ${r.category}.`);
      load();
    } catch (e) {
      setMsg(`Failed: ${String(e)}`);
    } finally {
      setBusy(null);
    }
  };

  const rows = audit ? (onlyMismatch ? audit.rows.filter((r) => r.mismatch) : audit.rows) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Category Match</h1>
          <p className="text-sm text-gray mt-1">AI-assisted categorisation — copper with copper, brass with brass. Suggestions only; you review and apply.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={onlyMismatch} onChange={(e) => setOnlyMismatch(e.target.checked)} />
            Possible mismatches only
          </label>
          <button className="btn btn-sm" onClick={load} disabled={loading}>Refresh</button>
        </div>
      </div>

      {err && <ErrorBox error={err} />}
      {msg && <p className="text-sm">{msg}</p>}
      {loading && !audit && <Loading label="Auditing categories…" />}

      {audit && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="card"><p className="text-xs text-gray">Published products</p><p className="text-2xl font-bold">{audit.total}</p></div>
            <div className="card"><p className="text-xs text-gray">Possible mismatches</p><p className="text-2xl font-bold">{audit.mismatches}</p></div>
            <div className="card col-span-2 sm:col-span-1"><p className="text-xs text-gray">Mode</p><p className="text-sm font-semibold mt-1">Rule-based · review before apply</p></div>
          </div>
          <p className="text-xs text-gray">{audit.note}</p>

          <div className="card overflow-x-auto">
            <table className="data w-full">
              <thead>
                <tr>
                  <th>Product</th><th>Material</th><th>Current category</th>
                  <th>Suggested category</th><th>Confidence</th><th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.product_id}>
                    <td className="max-w-[220px]">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-gray">{r.sku || `#${r.product_id}`}</div>
                    </td>
                    <td>{r.material || "—"}</td>
                    <td>{r.current?.name || <span className="text-gray">Uncategorised</span>}</td>
                    <td>
                      {r.suggested ? (
                        <span className={r.mismatch ? "font-semibold text-brass-dark" : ""}>{r.suggested.name}</span>
                      ) : <span className="text-gray">No suggestion</span>}
                    </td>
                    <td>{r.suggested?.confidence || "—"}</td>
                    <td className="text-right">
                      {r.suggested && (!r.current || r.current.id !== r.suggested.id) ? (
                        <button
                          className="btn btn-sm"
                          disabled={busy === r.product_id}
                          onClick={() => apply(r.product_id, r.suggested!.id)}
                        >
                          {busy === r.product_id ? "Applying…" : "Apply"}
                        </button>
                      ) : (
                        <span className="text-xs text-gray">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <p className="text-sm text-gray py-4">No products to show.</p>}
          </div>
        </>
      )}
    </div>
  );
}
