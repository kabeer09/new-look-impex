"use client";
import { SessionProvider, useSession } from "next-auth/react";
import { ReactNode, useEffect } from "react";
import { setApiToken, setAuthFailureCategory, getAuthFailureCategory } from "@/lib/api";

function SessionAuth({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  useEffect(() => {
    // 🔑 Extract token using the PRIMARY method only:
    // session.user.accessToken set by NextAuth jwt/session callbacks
    let token: string | null = null;

    // Method 1: Direct accessToken from session.user.accessToken (primary)
    // This is what NextAuth's jwt callback sets and session callback transfers
    if (
      session?.user?.accessToken &&
      typeof session.user.accessToken === "string" &&
      session.user.accessToken.length > 0
    ) {
      token = session.user.accessToken;
    }

    // If token is still missing, report diagnostics (but don't generate JWT in browser)
    setApiToken(token);

    // 🔍 Set auth failure category for diagnostics
    // This helps identify why the token might be missing without exposing secrets
    if (!token) {
      setAuthFailureCategory("missing_header");
    } else {
      setAuthFailureCategory("none");
    }
  }, [session]);

  return <>{children}</>;
}

export function SessionProviderWrapper({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SessionAuth>{children}</SessionAuth>
    </SessionProvider>
  );
}