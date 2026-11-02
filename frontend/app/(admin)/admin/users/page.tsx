"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AdminUser } from "@/lib/types";
import { Loading, ErrorBox, EmptyState } from "@/components/public/States";

const ROLES = ["admin", "editor", "viewer"] as const;

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setErr("");
    api<{ items: AdminUser[] }>("/api/users")
      .then((d) => setUsers(d.items || []))
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = async (u: AdminUser, patch: { role?: string; is_active?: boolean }) => {
    setSavingId(u.id);
    setMsg("");
    try {
      const res = await api<AdminUser>(`/api/users/${u.id}/role`, {
        method: "PUT",
        body: JSON.stringify(patch),
      });
      setUsers((us) => us.map((x) => (x.id === u.id ? { ...x, ...res } : x)));
      setMsg(`Updated ${u.email}.`);
    } catch (e) {
      setMsg(String(e));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Users &amp; access</h1>
      {msg && <p className="text-sm">{msg}</p>}
      {loading && <Loading label="Loading users…" />}
      {err && <ErrorBox error={err} retry={load} />}
      {!loading && !err && users.length === 0 && <EmptyState title="No users" hint="No user accounts found." />}
      {!loading && !err && users.length > 0 && (
        <div className="card !p-0 overflow-x-auto">
          <table className="data min-w-[640px]">
            <thead>
              <tr><th>Email</th><th>Name</th><th>Login</th><th>Role</th><th>Active</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.email}</td>
                  <td>{u.display_name || "—"}</td>
                  <td>
                    <span className="badge badge-gray">
                      {u.auth_provider === "google" ? "Google" : "Password"}
                    </span>
                  </td>
                  <td>
                    <select
                      className="input !w-auto !py-1 !text-xs"
                      value={u.role}
                      disabled={savingId === u.id}
                      onChange={(e) => void update(u, { role: e.target.value })}
                      aria-label={`Role for ${u.email}`}
                    >
                      {ROLES.map((r) => (<option key={r} value={r}>{r}</option>))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={u.is_active}
                      disabled={savingId === u.id}
                      onChange={(e) => void update(u, { is_active: e.target.checked })}
                      aria-label={`Active flag for ${u.email}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="help">Admins cannot demote or deactivate themselves. Deactivating a Google user blocks their next sign-in.</p>
    </div>
  );
}
