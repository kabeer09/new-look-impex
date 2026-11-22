"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loading, ErrorBox, EmptyState } from "@/components/public/States";

/**
 * Abandoned RFQ drafts — quote requests buyers started but never sent.
 * Shown on /admin/rfqs so the team can follow up (one gentle reminder email
 * per draft, or dismiss a stale one). Drafts retire automatically the moment
 * the matching RFQ is submitted.
 */
interface DraftItem {
  product_id?: number | null;
  product_name: string;
  quantity: string;
  unit?: string;
  notes?: string;
}

interface RfqDraft {
  id: number;
  status: string;
  full_name: string;
  business_email: string;
  company_name: string;
  country: string;
  phone: string;
  target_price: string;
  delivery_timeframe: string;
  additional_requirements: string;
  preferred_currency: string;
  items: DraftItem[];
  item_count: number;
  reminded_at: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  sent: "Converted",
  dismissed: "Dismissed",
};

export function AbandonedDrafts() {
  const [items, setItems] = useState<RfqDraft[]>([]);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setErr("");
    api<{ total: number; items: RfqDraft[] }>("/api/rfq-drafts?page_size=50")
      .then((d) => {
        setItems(d.items || []);
        setTotal(d.total ?? 0);
      })
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (id: number, status: string) => {
    setBusy(true);
    setMsg("");
    try {
      await api(`/api/rfq-drafts/${id}/status`, { method: "POST", body: JSON.stringify({ status }) });
      setMsg(status === "dismissed" ? `Draft #${id} dismissed.` : `Draft #${id} re-opened.`);
      load();
    } catch (e) {
      setMsg(String(e));
    } finally {
      setBusy(false);
    }
  };

  const remind = async (id: number) => {
    setBusy(true);
    setMsg("");
    try {
      const res = await api<{ sent: boolean; detail: string }>(
        `/api/rfq-drafts/${id}/remind`,
        { method: "POST" }
      );
      setMsg(
        res.sent
          ? `Reminder sent for draft #${id}.`
          : `Not sent — ${res.detail || "email delivery is not configured on this server."}`
      );
      load();
    } catch (e) {
      setMsg(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 mt-8">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold">Abandoned drafts</h2>
          <p className="text-sm text-gray">
            Quote requests buyers started but never sent — follow up before the enquiry goes cold.
          </p>
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-gray">{total} total</span>
      </div>

      {msg && <p className="text-sm">{msg}</p>}
      {loading && <Loading label="Loading drafts…" />}
      {err && <ErrorBox error={err} retry={load} />}
      {!loading && !err && items.length === 0 && (
        <EmptyState
          title="No abandoned drafts"
          hint="When a buyer fills in the quote form but leaves without submitting, the draft appears here."
        />
      )}
      {!loading && !err && items.length > 0 && (
        <div className="card !p-0 overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Company</th><th>Items</th>
                <th>Status</th><th>Last saved</th><th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id}>
                  <td>{d.full_name || <span className="text-gray">—</span>}</td>
                  <td>
                    {d.business_email ? (
                      <a className="link" href={`mailto:${d.business_email}`}>{d.business_email}</a>
                    ) : (
                      <span className="text-gray">—</span>
                    )}
                  </td>
                  <td>{d.company_name || <span className="text-gray">—</span>}</td>
                  <td>{d.item_count}</td>
                  <td>
                    <span
                      className={`badge ${
                        d.status === "open"
                          ? "bg-amber-100 text-amber-800"
                          : d.status === "sent"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {STATUS_LABEL[d.status] || d.status}
                    </span>
                    {d.reminded_at && (
                      <span className="ml-1 text-[10px] text-gray" title={new Date(d.reminded_at).toLocaleString()}>
                        reminded
                      </span>
                    )}
                  </td>
                  <td className="text-gray text-xs">
                    {d.updated_at ? new Date(d.updated_at).toLocaleString() : "—"}
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setOpenId(openId === d.id ? null : d.id)}
                    >
                      {openId === d.id ? "Hide" : "View"}
                    </button>{" "}
                    {d.status === "open" && (
                      <>
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={busy || !d.business_email}
                          title={d.business_email ? "Send one gentle reminder" : "No email saved yet"}
                          onClick={() => void remind(d.id)}
                        >
                          Remind
                        </button>{" "}
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={busy}
                          onClick={() => void setStatus(d.id, "dismissed")}
                        >
                          Dismiss
                        </button>
                      </>
                    )}
                    {d.status === "dismissed" && (
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={busy}
                        onClick={() => void setStatus(d.id, "open")}
                      >
                        Re-open
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Expanded detail — the buyer's in-progress form state */}
          {items.filter((d) => d.id === openId).map((d) => (
            <div key={`detail-${d.id}`} className="border-t border-sand p-4 bg-cream/50">
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray">Phone:</span> {d.phone || "—"}</div>
                <div><span className="text-gray">Country:</span> {d.country || "—"}</div>
                <div><span className="text-gray">Target price:</span> {d.target_price || "—"}</div>
                <div><span className="text-gray">Quote currency:</span> {d.preferred_currency || "—"}</div>
                <div><span className="text-gray">Delivery timeframe:</span> {d.delivery_timeframe || "—"}</div>
                <div><span className="text-gray">Started:</span> {new Date(d.created_at).toLocaleString()}</div>
              </div>
              {d.additional_requirements && (
                <div className="mt-3">
                  <h4 className="font-semibold text-sm">Requirements</h4>
                  <p className="text-sm text-gray mt-1 whitespace-pre-wrap">{d.additional_requirements}</p>
                </div>
              )}
              <h4 className="font-semibold text-sm mt-3">Products selected ({d.item_count})</h4>
              {d.items.length > 0 ? (
                <ul className="text-sm mt-1 space-y-1">
                  {d.items.map((it, i) => (
                    <li key={i}>
                      {it.product_name} — Qty: {it.quantity || "—"}
                      {it.unit ? ` ${it.unit}` : ""}
                      {it.notes ? <span className="text-gray"> · {it.notes}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray mt-1">No products selected yet.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
