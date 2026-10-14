"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * OAuth landing page for Google Sign-In.
 * Backend redirects here as /admin/auth/callback?token=<jwt> (success)
 * or ?error=<code> (failure). The token is moved to localStorage immediately
 * and stripped from the URL so it never lingers in history.
 */
function GoogleCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [msg, setMsg] = useState("Completing Google sign-in…");

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");
    if (token) {
      try {
        localStorage.setItem("nli_token", token);
      } catch {
        setMsg("Could not store the session (browser storage blocked).");
        return;
      }
      router.replace("/admin/overview");
    } else if (error) {
      router.replace(`/admin/login?error=${encodeURIComponent(error)}`);
    } else {
      setMsg("No sign-in result found. Please try logging in again.");
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-ivory p-4">
      <div className="card w-full max-w-md text-center">
        <h1 className="font-serif font-bold text-navy text-xl">Google sign-in</h1>
        <p className="text-sm text-gray mt-2" role="status">{msg}</p>
        <a href="/admin/login" className="btn btn-ghost btn-sm mt-4">Back to login</a>
      </div>
    </div>
  );
}

export default function GoogleCallback() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-ivory p-4"><p className="text-sm text-gray">Loading…</p></div>}>
      <GoogleCallbackInner />
    </Suspense>
  );
}
