"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loading, ErrorBox } from "@/components/public/States";

type Report = {
  site: string;
  note: string;
  duplicate_titles: { title: string; count: number; references: string[] }[];
  missing_metadata: Record<string, { id: number; name?: string; slug?: string; path?: string; missing: string[] }[]>;
  internal_link_suggestions: { type: string; slug: string; name: string; suggestion: string }[];
};

const SAMPLE_PATHS = ["/", "/about", "/products", "/categories", "/brass-collection",
  "/copper-collection", "/metal-home-decor", "/craft", "/catalogue", "/usa", "/uk",
  "/uae", "/au", "/canada", "/europe", "/contact", "/wholesale", "/sitemap"];

export default function SeoHealth() {
  const [report, setReport] = useState<Report | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [broken, setBroken] = useState<{ path: string; status: number | null }[] | null>(null);
  const [checking, setChecking] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setErr("");
    api<Report>("/api/seo/health")
      .then(setReport)
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const runBrokenCheck = async () => {
    setChecking(true);
    setBroken(null);
    try {
      const r = await api<{ broken: { path: string; status: number | null }[] }>("/api/seo/broken-links", {
        method: "POST",
        body: JSON.stringify({ paths: SAMPLE_PATHS }),
      });
      setBroken(r.broken || []);
    } catch (e) {
      setErr(String(e));
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">SEO Health</h1>
          <p className="text-sm text-gray mt-1">Read-only checks. Nothing here writes to the catalogue.</p>
        </div>
        <button className="btn btn-sm" onClick={load} disabled={loading}>Refresh</button>
      </div>

      {err && <ErrorBox error={err} />}
      {loading && !report && <Loading label="Scanning catalogue…" />}

      {report && (
        <>
          <p className="text-xs text-gray">{report.note}</p>

          <section className="card">
            <h2 className="font-semibold">Missing metadata</h2>
            {Object.entries(report.missing_metadata).map(([kind, items]) => (
              <div key={kind} className="mt-2">
                <p className="text-sm"><b>{kind}</b>: {items.length} published item{items.length === 1 ? "" : "s"} missing title/description</p>
                {items.length > 0 && (
                  <p className="text-xs text-gray break-all">
                    {items.slice(0, 5).map((i) => `${i.slug || i.path || i.name} (${i.missing.join(", ")})`).join(" · ")}
                  </p>
                )}
              </div>
            ))}
          </section>

          <section className="card">
            <h2 className="font-semibold">Duplicate titles ({report.duplicate_titles.length})</h2>
            {report.duplicate_titles.length === 0 ? (
              <p className="text-sm text-gray mt-2">No duplicate titles found.</p>
            ) : (
              <ul className="text-sm list-disc ml-5 mt-2 space-y-1">
                {report.duplicate_titles.map((d, i) => (
                  <li key={i}><b>{d.title}</b> × {d.count} — {d.references.join(", ")}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">Internal link suggestions</h2>
              <button className="btn btn-sm" onClick={runBrokenCheck} disabled={checking}>
                {checking ? "Checking…" : "Check · Broken links"}
              </button>
            </div>
            {report.internal_link_suggestions.length === 0 ? (
              <p className="text-sm text-gray mt-2">No obvious orphan products.</p>
            ) : (
              <ul className="text-sm list-disc ml-5 mt-2 space-y-1">
                {report.internal_link_suggestions.map((s, i) => (
                  <li key={i}><b>{s.name}</b> ({s.slug}) — {s.suggestion}</li>
                ))}
              </ul>
            )}
            {broken !== null && (
              <div className="mt-3 border-t pt-3 text-sm">
                <p className="font-semibold">Broken links on {SAMPLE_PATHS.length} sampled paths: {broken.length}</p>
                {broken.length === 0 ? (
                  <p className="text-gray">All sampled paths responded OK.</p>
                ) : (
                  <ul className="list-disc ml-5 mt-1">
                    {broken.map((b, i) => <li key={i}>{b.path} → {b.status ?? "network error"}</li>)}
                  </ul>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
