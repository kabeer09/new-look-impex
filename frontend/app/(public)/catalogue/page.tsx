"use client";
import { useEffect, useState } from "react";
import { PageHero } from "@/components/public/Shared";
import { Loading, ErrorBox } from "@/components/public/States";
import { api, trackEvent, downloadFile } from "@/lib/api";
import type { CatalogueMeta } from "@/lib/types";

export default function CataloguePage() {
  const [meta, setMeta] = useState<CatalogueMeta | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [dlErr, setDlErr] = useState("");

  useEffect(() => {
    api<CatalogueMeta>("/api/public/catalogue/meta")
      .then(setMeta)
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const download = async () => {
    setDlErr("");
    setDownloading(true);
    trackEvent({ event_type: "catalogue_download" });
    try {
      await downloadFile("/api/public/catalogue.pdf", "new-look-impex-catalogue.pdf");
    } catch (e) {
      // Fallback: open in a new tab if blob download fails.
      try {
        window.open("/api/public/catalogue.pdf", "_blank");
      } catch {
        setDlErr(String(e));
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <PageHero
        title="Product Catalogue"
        subtitle="The complete wholesale catalogue, generated from live product data."
      />
      <div className="container-x section">
        <div className="grid md:grid-cols-2 gap-10 items-start">
          <div>
            <h2 className="font-serif font-bold text-navy text-2xl">About the catalogue</h2>
            <p className="text-gray mt-3">
              The PDF is generated from published products only. Materials, finishes, dimensions,
              MOQs and lead times are shown where the catalogue provides them.
            </p>
            <p className="text-gray mt-3">
              Prices appear only where products are not price-on-request — otherwise pricing is
              quoted per wholesale order via an RFQ.
            </p>
            {loading && <Loading label="Loading catalogue information…" />}
            {err && <ErrorBox error={err} />}
            {!loading && !err && meta && (
              <dl className="mt-5 space-y-2 text-sm">
                <div className="flex gap-2">
                  <dt className="text-gray w-40">Products included</dt>
                  <dd className="font-semibold">{meta.product_count}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-gray w-40">Generated</dt>
                  <dd>{new Date(meta.generated_at).toLocaleString()}</dd>
                </div>
                {meta.includes && meta.includes.length > 0 && (
                  <div className="flex gap-2">
                    <dt className="text-gray w-40">Includes</dt>
                    <dd>{meta.includes.join(", ")}</dd>
                  </div>
                )}
              </dl>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <button className="btn btn-brass" onClick={download} disabled={downloading}>
                {downloading ? "Preparing PDF…" : "Download catalogue (PDF)"}
              </button>
              <a className="btn btn-outline" href="/api/public/catalogue.pdf" target="_blank" rel="noopener noreferrer">
                Open in new tab
              </a>
            </div>
            {dlErr && <p className="text-sm text-red-700 mt-3">{dlErr}</p>}
          </div>

          <div className="space-y-6">
            <div className="card">
              <h3 className="font-serif font-bold text-navy text-xl">Prefer a quoted order?</h3>
              <p className="text-sm text-gray mt-2">
                Add products to your RFQ cart and request a written quote with MOQ, lead time
                and packaging.
              </p>
              <div className="flex gap-2 mt-4">
                <a className="btn btn-primary btn-sm" href="/request-quote">Request a quote</a>
                <a className="btn btn-ghost btn-sm" href="/products">Browse products</a>
              </div>
            </div>
            <div className="card">
              <h3 className="font-serif font-bold text-navy text-xl">Need a specific range?</h3>
              <p className="text-sm text-gray mt-2">
                The catalogue can be filtered by category or collection when you request it —
                mention your interest in an enquiry.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <a className="btn btn-outline btn-sm" href="/brass-collection">Brass</a>
                <a className="btn btn-outline btn-sm" href="/copper-collection">Copper</a>
                <a className="btn btn-outline btn-sm" href="/urlis">Urlis</a>
                <a className="btn btn-outline btn-sm" href="/diyas-lanterns">Diyas &amp; Lanterns</a>
              </div>
            </div>
            <div className="card">
              <h3 className="font-serif font-bold text-navy text-xl">Questions</h3>
              <p className="text-sm text-gray mt-2">
                Email <a className="link" href="mailto:newlookimpex@gmail.com">newlookimpex@gmail.com</a>{" "}
                or WhatsApp <a className="link" href="https://wa.me/918218251238" target="_blank" rel="noopener noreferrer">+91 8218251238</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
