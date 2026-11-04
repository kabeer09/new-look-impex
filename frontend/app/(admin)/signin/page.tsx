"use client";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ivory">
      <div className="w-full max-w-md p-6 bg-white rounded-2xl shadow-xl border border-sand">
        <div className="flex items-center gap-2 mb-6">
          <span className="w-10 h-10 rounded-lg bg-gold text-navy font-serif font-bold flex items-center justify-center">N</span>
          <span>
            <span className="block font-bold text-navy text-lg">New Look Impex</span>
            <span className="block text-[11px] text-clay">Admin Access — Locked</span>
          </span>
        </div>
        <h2 className="font-serif font-bold text-navy text-2xl mb-2">Admin Login</h2>
        <p className="text-sm text-clay mb-6">
          Sign in with your business email to access the New Look Impex admin dashboard.
        </p>
        <button
          onClick={() => signIn("google")}
          className="w-full py-3 bg-navy text-ivory rounded-xl font-bold text-center hover:bg-clay-dark transition-colors"
        >
          Sign in with Google
        </button>
        <p className="mt-6 text-center text-xs text-clay/50">
          Restricted to: newlookimpex130@gmail.com
        </p>
        <div className="mt-4 text-center">
          <Link href="/" className="text-xs text-clay hover:text-navy underline underline-offset-2">
            ← Back to public site
          </Link>
        </div>
      </div>
    </div>
  );
}
