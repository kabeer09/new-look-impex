"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, apiUpload } from "@/lib/api";

type Action = { tool: string; status: string; message?: string; published?: boolean; change_id?: number; label?: string; proposed?: Record<string, unknown>; error?: string };
type Message = { id: number; role: "user" | "assistant"; content: string; actions: Action[]; attachments: { url: string; name: string }[]; created_at: string };
type Change = { id: number; entity_type: string; entity_id: string; label: string; status: string; previous: Record<string, unknown>; proposed: Record<string, unknown>; created_at: string };
type Session = { id: number; title: string; updated_at: string };
type View = "chat" | "activity" | "changes" | "overview" | "settings";

export default function AIManagerPage() {
  const [view, setView] = useState<View>("chat");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<{ url: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [changes, setChanges] = useState<Change[]>([]);
  const [activity, setActivity] = useState<{ id: number; tool: string; status: string; created_at: string; error: string }[]>([]);
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);
  const [autoPublish, setAutoPublish] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadSessions = useCallback(() => {
    api<{ items: Session[] }>("/api/ai-manager/sessions").then((d) => setSessions(d.items || [])).catch(() => undefined);
  }, []);
  const loadChanges = useCallback(() => {
    api<{ items: Change[] }>("/api/ai-manager/changes?status=pending").then((d) => setChanges(d.items || [])).catch(() => undefined);
  }, []);
  const loadActivity = useCallback(() => {
    api<{ items: { id: number; tool: string; status: string; created_at: string; error: string }[] }>("/api/ai-manager/actions?limit=50")
      .then((d) => setActivity(d.items || [])).catch(() => undefined);
  }, []);

  useEffect(() => {
    loadSessions(); loadChanges(); loadActivity();
    api<Record<string, unknown>>("/api/ai-manager/overview").then(setOverview).catch(() => undefined);
  }, [loadSessions, loadChanges, loadActivity]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  function openSession(id: number) {
    setSessionId(id); setView("chat"); setError("");
    api<{ items: Message[] }>(`/api/ai-manager/sessions/${id}/messages`)
      .then((d) => setMessages(d.items || [])).catch((e) => setError(String(e)));
  }

  function newChat() {
    setSessionId(null); setMessages([]); setView("chat"); setError(""); setFiles([]);
  }

  async function upload(file: File) {
    setError("");
    const fd = new FormData(); fd.append("file", file); fd.append("rights", "own");
    try {
      const r = await apiUpload<{ url: string; filename: string }>("/api/ai-manager/upload", fd);
      setFiles((f) => [...f, { url: r.url, name: file.name }]);
    } catch (e) { setError(`Upload failed: ${String(e)}`); }
  }

  async function send() {
    if (!input.trim() || busy) return;
    setBusy(true); setError("");
    const attachments = files;
    const text = input.trim();
    setMessages((m) => [...m, { id: Date.now(), role: "user", content: text, actions: [], attachments, created_at: "" }]);
    setInput(""); setFiles([]);
    try {
      const r = await api<{ session_id: number; reply: string; actions: Action[]; configured: boolean }>(
        "/api/ai-manager/chat",
        { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, message: text, attachments, auto_publish: autoPublish }) });
      setSessionId(r.session_id);
      setMessages((m) => [...m, { id: Date.now() + 1, role: "assistant", content: r.reply, actions: r.actions || [], attachments: [], created_at: "" }]);
      loadSessions(); loadChanges(); loadActivity();
    } catch (e) { setError(String(e)); }
    finally { setBusy(false); }
  }

  async function publishChange(id: number) {
    try {
      await api(`/api/ai-manager/changes/${id}/publish`, { method: "POST" });
      loadChanges(); loadActivity();
      setMessages((m) => m.map((x) => ({ ...x, actions: (x.actions || []).map((a) => a.change_id === id ? { ...a, published: true, status: "ok" } : a) })));
    } catch (e) { setError(String(e)); }
  }
  async function rollbackChange(id: number) {
    try {
      await api(`/api/ai-manager/changes/${id}/rollback`, { method: "POST" });
      loadChanges(); loadActivity();
    } catch (e) { setError(String(e)); }
  }

  const nav: { key: View; label: string }[] = [
    { key: "chat", label: "New Chat" }, { key: "activity", label: "AI Activity" },
    { key: "changes", label: changes.length ? `Pending Changes (${changes.length})` : "Pending Changes" },
    { key: "overview", label: "Website Overview" }, { key: "settings", label: "Settings" },
  ];

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[600px] gap-0 overflow-hidden rounded-xl border border-clay/20 bg-white">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-clay/15 bg-ivory md:flex">
        <div className="border-b border-clay/15 p-4">
          <p className="font-serif text-lg font-bold text-espresso">AI Website Manager</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-clay">New Look Impex</p>
        </div>
        <button onClick={newChat} className="m-3 rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white hover:bg-navy-dark">+ New chat</button>
        <nav className="px-3">
          {nav.map((n) => (
            <button key={n.key} onClick={() => setView(n.key)}
              className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm ${view === n.key ? "bg-navy/10 font-semibold text-navy" : "text-gray hover:bg-navy/5"}`}>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="mt-4 border-t border-clay/15 px-4 py-3">
          <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-gray">Chat history</p>
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {sessions.map((s) => (
              <button key={s.id} onClick={() => openSession(s.id)}
                className={`block w-full truncate rounded px-2 py-1.5 text-left text-xs ${sessionId === s.id ? "bg-navy/10 text-navy" : "text-gray hover:bg-navy/5"}`}>
                {s.title}
              </button>
            ))}
            {!sessions.length && <p className="text-xs text-gray">No conversations yet.</p>}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-clay/15 px-3 py-2 md:hidden">
          {nav.map((n) => (<button key={n.key} onClick={() => setView(n.key)} className={`rounded px-2 py-1 text-xs ${view === n.key ? "bg-navy/10 font-semibold" : "text-gray"}`}>{n.label}</button>))}
        </div>

        {error && <p className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</p>}

        {view === "chat" && (
          <>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
              {!messages.length && (
                <div className="mx-auto max-w-2xl rounded-xl border border-gold/25 bg-ivory p-6">
                  <h2 className="font-serif text-2xl text-espresso">Manage your website by chatting</h2>
                  <p className="mt-2 text-sm text-gray">Ask me to update products, homepage content, banners, SEO or create pages. Upload images and files in the chat. Major changes are previewed before publishing.</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray">
                    {["Update my homepage headline", "Create a Christmas wholesale banner", "Improve SEO for copper bottles", "Add this product to my catalogue"].map((s) => (
                      <button key={s} onClick={() => setInput(s)} className="rounded-full border border-clay/25 px-3 py-1.5 hover:border-clay">{s}</button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm md:max-w-[75%] ${m.role === "user" ? "bg-navy text-white" : "border border-clay/15 bg-white text-charcoal"}`}>
                    {m.attachments?.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {m.attachments.map((a) => <a key={a.url} href={a.url} target="_blank" rel="noreferrer" className="rounded border border-current/20 px-2 py-1 text-xs underline">{a.name}</a>)}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    {m.actions?.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {m.actions.map((a, i) => (
                          <div key={i} className="rounded-lg border border-gold/25 bg-ivory p-3 text-xs text-espresso">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold">{a.tool}</span>
                              <span className={a.status === "failed" ? "text-red-600" : a.published ? "text-emerald-700" : "text-clay"}>
                                {a.status === "failed" ? "failed" : a.published ? "published" : "preview"}
                              </span>
                            </div>
                            {a.message && <p className="mt-1 text-gray">{a.message}</p>}
                            {a.error && <p className="mt-1 text-red-600">{a.error}</p>}
                            {a.change_id && !a.published && (
                              <button onClick={() => publishChange(a.change_id!)} className="mt-2 rounded bg-emerald px-3 py-1 font-semibold text-white">Publish now</button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {busy && <p className="text-sm text-gray">AI is working…</p>}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-clay/15 bg-white p-3 md:p-4">
              {files.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {files.map((f) => <span key={f.url} className="rounded-full bg-ivory px-3 py-1 text-xs text-gray">{f.name}</span>)}
                </div>
              )}
              <div className="flex items-end gap-2">
                <button onClick={() => fileRef.current?.click()} title="Attach files" className="rounded-lg border border-clay/25 px-3 py-2 text-lg text-gray hover:border-clay">+</button>
                <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.csv,.txt,.docx" className="hidden"
                  onChange={(e) => { Array.from(e.target.files || []).forEach(upload); e.target.value = ""; }} />
                <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  rows={2} placeholder="Tell the AI what to change on your website…" className="input min-h-[48px] flex-1 resize-none" />
                <button onClick={send} disabled={busy || !input.trim()} className="btn btn-primary h-12 px-5 disabled:opacity-50">Send</button>
              </div>
              <label className="mt-2 flex items-center gap-2 text-xs text-gray">
                <input type="checkbox" checked={autoPublish} onChange={(e) => setAutoPublish(e.target.checked)} /> Auto-publish simple changes
              </label>
            </div>
          </>
        )}

        {view === "changes" && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <h2 className="mb-4 font-serif text-2xl text-espresso">Pending changes</h2>
            {!changes.length && <p className="text-sm text-gray">No pending changes.</p>}
            <div className="space-y-3">
              {changes.map((c) => (
                <div key={c.id} className="rounded-lg border border-gold/25 p-4">
                  <div className="flex items-center justify-between"><span className="font-semibold">{c.label}</span><span className="text-xs text-clay">{c.entity_type}</span></div>
                  <pre className="mt-2 max-h-40 overflow-auto rounded bg-ivory p-2 text-xs">{JSON.stringify(c.proposed, null, 2)}</pre>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => publishChange(c.id)} className="btn btn-primary btn-sm">Publish</button>
                    <button onClick={() => rollbackChange(c.id)} className="btn btn-ghost btn-sm">Discard</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === "activity" && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <h2 className="mb-4 font-serif text-2xl text-espresso">AI activity</h2>
            {!activity.length && <p className="text-sm text-gray">No actions logged yet.</p>}
            <div className="space-y-2">
              {activity.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded border border-clay/15 p-3 text-sm">
                  <span className="font-medium">{a.tool}</span>
                  <span className={a.status === "failed" ? "text-red-600" : a.status === "pending" ? "text-clay" : "text-emerald-700"}>{a.status}</span>
                  <span className="text-xs text-gray">{a.created_at}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === "overview" && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <h2 className="mb-4 font-serif text-2xl text-espresso">Website overview</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {overview && Object.entries(overview).map(([k, v]) => (
                <div key={k} className="rounded-lg border border-clay/15 p-4"><p className="text-xs uppercase tracking-wide text-gray">{k}</p><p className="mt-1 text-xl font-bold text-espresso">{String(v)}</p></div>
              ))}
            </div>
          </div>
        )}

        {view === "settings" && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <h2 className="mb-4 font-serif text-2xl text-espresso">AI Manager settings</h2>
            <p className="text-sm text-gray">API credentials stay server-side. Auto-publish is per-message in the chat input.</p>
            <div className="mt-4 rounded-lg border border-clay/15 p-4 text-sm">
              <p><span className="text-gray">AI provider:</span> {overview ? "configured via backend env" : "checking…"}</p>
              <p className="mt-1"><span className="text-gray">Allowed files:</span> images, PDF, CSV, TXT, DOCX (max 8 MB)</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
