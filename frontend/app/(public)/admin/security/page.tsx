"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function SecurityMonitoringPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      api<any>("/api/security/events?days=7&limit=100").catch(() => ({ events: [] })),
      api<any>("/api/security/login-attempts?days=7").catch(() => ({ attempts: [] })),
      api<any>("/api/security/blocked-ips").catch(() => ({ blocks: [] })),
      api<any>("/api/security/sessions").catch(() => ({ sessions: [] })),
    ]).then(([ev, at, bl, ss]) => {
      if (ev.status === "fulfilled") setEvents(ev.value.events || []);
      if (at.status === "fulfilled") setAttempts(at.value.attempts || []);
      if (bl.status === "fulfilled") setBlocks(bl.value.blocks || []);
      if (ss.status === "fulfilled") setSessions(ss.value.sessions || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const severityColor = (s: string) => {
    switch (s) {
      case "critical": return "text-red-700 bg-red-100";
      case "high": return "text-orange-700 bg-orange-100";
      case "medium": return "text-yellow-700 bg-yellow-100";
      default: return "text-gray-700 bg-gray-100";
    }
  };

  if (loading) {
    return (
      <div className="container-x section">
        <div className="card text-center py-20"><div className="card"><p>Loading security data…</p></div></div>
      </div>
    );
  }

  return (
    <div className="container-x section">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif font-bold text-navy text-3xl">Security Monitoring</h1>
          <p className="text-gray mt-2">Security events, login attempts, blocked IPs, and active sessions.</p>
        </div>
        <Link href="/admin/overview" className="btn btn-outline btn-sm">← Back to Admin</Link>
      </div>

      {err && <div className="card bg-red-50 border-red-200 p-4 mb-6"><p className="text-red-700 text-sm">{err}</p></div>}

      {/* Security Events */}
      <section className="mb-10">
        <h2 className="font-serif font-bold text-navy text-xl mb-4">Security Events (Last 7 Days)</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-sand/30">
                <th className="px-4 py-3 text-left text-xs text-gray">Time</th>
                <th className="px-4 py-3 text-left text-xs text-gray">Type</th>
                <th className="px-4 py-3 text-left text-xs text-gray">IP</th>
                <th className="px-4 py-3 text-left text-xs text-gray">User</th>
                <th className="px-4 py-3 text-left text-xs text-gray">Severity</th>
                <th className="px-4 py-3 text-left text-xs text-gray">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand/30">
              {events.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray">No security events recorded.</td></tr>
              )}
              {events.slice(0, 50).map((e) => (
                <tr key={e.id} className="hover:bg-sand/50">
                  <td className="px-4 py-3 text-xs text-gray">{new Date(e.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs font-mono text-navy">{e.event_type}</td>
                  <td className="px-4 py-3 text-xs text-gray">{e.ip_address}</td>
                  <td className="px-4 py-3 text-xs text-gray">{e.user_email || "—"}</td>
                  <td className="px-4 py-3 text-xs"><span className={`px-2 py-1 rounded ${severityColor(e.severity)}`}>{e.severity}</span></td>
                  <td className="px-4 py-3 text-xs text-gray">{e.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Login Attempts */}
      <section className="mb-10">
        <h2 className="font-serif font-bold text-navy text-xl mb-4">Login Attempts (Last 7 Days)</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-sand/30">
                <th className="px-4 py-3 text-left text-xs text-gray">Time</th>
                <th className="px-4 py-3 text-left text-xs text-gray">Email</th>
                <th className="px-4 py-3 text-left text-xs text-gray">IP</th>
                <th className="px-4 py-3 text-left text-xs text-gray">Result</th>
                <th className="px-4 py-3 text-left text-xs text-gray">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand/30">
              {attempts.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray">No login attempts recorded.</td></tr>
              )}
              {attempts.slice(0, 50).map((a) => (
                <tr key={a.id} className="hover:bg-sand/50">
                  <td className="px-4 py-3 text-xs text-gray">{new Date(a.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-gray">{a.email}</td>
                  <td className="px-4 py-3 text-xs text-gray">{a.ip_address}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className={`px-2 py-1 rounded ${a.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {a.success ? "✓" : "✗"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray">{a.failure_reason || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Blocked IPs */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif font-bold text-navy text-xl">Blocked IP Addresses</h2>
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-sand/30">
                <th className="px-4 py-3 text-left text-xs text-gray">IP Address</th>
                <th className="px-4 py-3 text-left text-xs text-gray">Reason</th>
                <th className="px-4 py-3 text-left text-xs text-gray">Blocked At</th>
                <th className="px-4 py-3 text-left text-xs text-gray">Expires</th>
                <th className="px-4 py-3 text-left text-xs text-gray">Blocked By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand/30">
              {blocks.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray">No blocked IPs.</td></tr>
              )}
              {blocks.map((b) => (
                <tr key={b.id} className="hover:bg-sand/50">
                  <td className="px-4 py-3 text-xs font-mono text-navy">{b.ip_address}</td>
                  <td className="px-4 py-3 text-xs text-gray">{b.reason}</td>
                  <td className="px-4 py-3 text-xs text-gray">{new Date(b.blocked_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-gray">{b.expires_at ? new Date(b.expires_at).toLocaleString() : "Never (permanent)"}</td>
                  <td className="px-4 py-3 text-xs text-gray">{b.blocked_by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Active Sessions */}
      <section className="mb-10">
        <h2 className="font-serif font-bold text-navy text-xl mb-4">Active Admin Sessions</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-sand/30">
                <th className="px-4 py-3 text-left text-xs text-gray">User ID</th>
                <th className="px-4 py-3 text-left text-xs text-gray">IP</th>
                <th className="px-4 py-3 text-left text-xs text-gray">Created</th>
                <th className="px-4 py-3 text-left text-xs text-gray">Last Activity</th>
                <th className="px-4 py-3 text-left text-xs text-gray">Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand/30">
              {sessions.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray">No active sessions.</td></tr>
              )}
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-sand/50">
                  <td className="px-4 py-3 text-xs text-gray">{s.user_id}</td>
                  <td className="px-4 py-3 text-xs text-gray">{s.ip_address}</td>
                  <td className="px-4 py-3 text-xs text-gray">{new Date(s.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-gray">{new Date(s.last_activity).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-gray">{new Date(s.expires_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
