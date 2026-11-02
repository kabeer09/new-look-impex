"use client";
import { useEffect, useState } from "react";
import { api, API } from "@/lib/api";
import { Loading, ErrorBox } from "@/components/public/States";

export default function Settings() {
  const [msg, setMsg] = useState("");
  const [settings, setSettings] = useState<Record<string, any> | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<Record<string, any>>("/api/settings")
      .then(setSettings)
      .catch((e) => setLoadErr(String(e)));
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setMsg("");
    try {
      await api("/api/settings", { method: "PUT", body: JSON.stringify(settings) });
      setMsg("Settings saved.");
    } catch (err: any) {
      setMsg(String(err));
    } finally {
      setSaving(false);
    }
  };

  const setKV = (key: string, value: any) => setSettings((s) => (s ? { ...s, [key]: value } : s));

  const scalarKeys = settings
    ? Object.entries(settings)
        .filter(([, v]) => typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null)
        .map(([k]) => k)
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="card space-y-2 max-w-md">
        <h2 className="font-semibold">API</h2>
        <p className="text-xs text-gray">API docs: {API}/api/docs · LLM: set LLM_API_KEY/BASE/MODEL or run rule-based.</p>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-3">Business settings (PUT /api/settings)</h2>
        {loadErr && <ErrorBox error={loadErr} />}
        {!loadErr && !settings && <Loading label="Loading settings…" />}
        {settings && (
          <>
            <div className="grid sm:grid-cols-2 gap-3">
              {scalarKeys.map((key) => (
                <div key={key}>
                  <label className="label" htmlFor={`set-${key}`}>{key}</label>
                  {typeof settings[key] === "boolean" ? (
                    <input id={`set-${key}`} type="checkbox" className="accent-[#172A3A]" checked={Boolean(settings[key])} onChange={(e) => setKV(key, e.target.checked)} />
                  ) : (
                    <input id={`set-${key}`} className="input" value={settings[key] ?? ""} onChange={(e) => setKV(key, e.target.value)} />
                  )}
                </div>
              ))}
            </div>
            {msg && <p className="text-sm mt-3">{msg}</p>}
            <button className="btn btn-brass mt-4" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save settings"}</button>
            <p className="text-xs text-gray mt-2">Keys shown are the public-safe subset served at /api/public/settings. announcement_text + announcement_enabled drive the public announcement bar.</p>
          </>
        )}
      </div>
    </div>
  );
}
