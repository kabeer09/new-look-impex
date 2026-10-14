"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, API, getToken } from "@/lib/api";
import { logout } from "@/lib/auth";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/admin/overview";
  const oauthError = searchParams.get("error");
  const [email, setEmail] = useState("admin@newlookimpex.example");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleState, setGoogleState] = useState<{ enabled: boolean; reason: string } | null>(null);

  // Already logged in → go to dashboard.
  useEffect(() => {
    if (getToken()) router.replace(next);
  }, [next, router]);

  // Google Sign-In availability (shown only when the backend enables it).
  useEffect(() => {
    api<{ enabled: boolean; reason: string }>("/api/auth/google/status")
      .then(setGoogleState)
      .catch(() => setGoogleState(null));
  }, []);

  useEffect(() => {
    if (oauthError) {
      const friendly: Record<string, string> = {
        not_allowed: "This Google account is not authorised for admin access.",
        email_unverified: "Google did not verify this email address.",
        no_code: "Google sign-in was cancelled or returned no code.",
        token_exchange_failed: "Could not complete Google sign-in. Try again.",
        userinfo_failed: "Could not read your Google profile. Try again.",
        account_disabled: "This account has been disabled.",
      };
      setMsg(`Google sign-in failed: ${friendly[oauthError] || oauthError}`);
    }
  }, [oauthError]);

  const googleLogin = async () => {
    setMsg("");
    setBusy(true);
    try {
      const r = await api<{ auth_url: string }>("/api/auth/google/url");
      window.location.href = r.auth_url;
    } catch (err) {
      setMsg(String(err));
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setBusy(true);
    try {
      const r = await api<{ access_token: string; role?: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password: pw }),
      });
      localStorage.setItem("nli_token", r.access_token);
      router.replace(next);
    } catch (err) {
      setMsg(String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ivory p-4">
      <div className="card w-full max-w-md">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-lg bg-navy text-gold-light font-serif font-bold flex items-center justify-center text-xl">N</span>
          <div>
            <h1 className="font-serif font-bold text-navy text-xl">Admin login</h1>
            <p className="text-xs text-gray">New Look Impex · Moradabad</p>
          </div>
        </div>
        {msg && <p className="text-sm text-red-700 mt-3" role="alert">{msg}</p>}
        <form className="mt-5 space-y-3" onSubmit={submit}>
          <div>
            <label className="label" htmlFor="login-email">Email</label>
            <input id="login-email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="login-pw">Password</label>
            <input id="login-pw" type="password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy ? "Signing in…" : "Log in"}
          </button>
        </form>
        {googleState?.enabled ? (
          <div className="mt-4">
            <div className="flex items-center gap-3 text-xs text-gray">
              <span className="flex-1 border-t border-sand" />
              <span>or</span>
              <span className="flex-1 border-t border-sand" />
            </div>
            <button type="button" className="btn btn-outline w-full mt-3" onClick={googleLogin} disabled={busy}>
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className="inline-block">
                <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.1 3.5 2.7.2.1c2.2-2 3.8-5 3.8-8.9z" />
                <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.1.1-3.6 2.8v.1C3.5 21.3 7.5 24 12 24z" />
                <path fill="#FBBC05" d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.1-3.6-2.8H1.4C.5 8.3 0 10.1 0 12s.5 3.7 1.4 5.3l3.8-2.9z" />
                <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.5 0 3.5 2.7 1.4 6.7l3.8 2.9c1-2.8 3.7-4.9 6.8-4.9z" />
              </svg>
              <span className="ml-2">Continue with Google</span>
            </button>
          </div>
        ) : null}
        <p className="text-xs text-gray mt-4">
          API: {API}/api/docs · Default admin credentials from server env (ADMIN_EMAIL / ADMIN_PASSWORD).
        </p>
        <button
          className="btn btn-ghost btn-sm mt-2"
          onClick={() => {
            logout();
            setMsg("Cleared stored token.");
          }}
        >
          Clear stored token
        </button>
      </div>
    </div>
  );
}

export default function AdminLogin() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-ivory p-4"><p className="text-sm text-gray">Loading…</p></div>}>
      <AdminLoginForm />
    </Suspense>
  );
}
