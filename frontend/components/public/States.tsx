export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="card text-sm text-gray flex items-center gap-2" role="status" aria-live="polite">
      <span className="inline-block w-4 h-4 border-2 border-brass border-t-transparent rounded-full animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorBox({ error, retry }: { error: string; retry?: () => void }) {
  return (
    <div className="card border-red-200" role="alert">
      <p className="text-sm text-red-700">{error}</p>
      {retry && (
        <button className="btn btn-ghost btn-sm mt-3" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title = "Nothing to show", hint, action }: { title?: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="card text-center py-10">
      <p className="font-semibold text-charcoal">{title}</p>
      {hint && <p className="text-sm text-gray mt-1">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const s = status || "draft";
  const cls =
    s === "published" || s === "verified" || s === "won" || s === "interested"
      ? "badge-green"
      : s === "archived" || s === "unverified" || s === "lost" || s === "not_interested" || s === "do_not_contact"
        ? "badge-gray"
        : s === "draft" || s === "new" || s === "pending"
          ? "badge-brass"
          : s === "contacted" || s === "quoted" || s === "replied"
            ? "badge-navy"
            : "badge-gray";
  return <span className={`badge ${cls}`}>{s}</span>;
}

export function formatPrice(price: number | null, currency: string | null): string {
  if (price == null) return "";
  const cur = currency || "USD";
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: cur, maximumFractionDigits: price % 1 === 0 ? 0 : 2 }).format(price);
  } catch {
    return `${cur} ${price}`;
  }
}
