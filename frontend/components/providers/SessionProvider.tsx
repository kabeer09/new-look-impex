"use client";
import { SessionProvider, useSession } from "next-auth/react";
import { ReactNode, useEffect } from "react";
import { setApiToken, setAuthFailureCategory, getAuthFailureCategory } from "@/lib/api";

function SessionAuth({ children }: { children: ReactNode }) {
  const { data: session } = useSession();

  // Set the token during render, not only in useEffect. Child components mount
  // and run their data-fetching effects AFTER this parent render, so this avoids
  // the first-request 401 race on admin pages (children previously fired
  // before the effect copied the NextAuth token into the API module).
  let token: string | null = null;
  if (
    session?.user?.accessToken &&
    typeof session.user.accessToken === "string" &&
    session.user.accessToken.length > 0
  ) {
    token = session.user.accessToken;
  }
  setApiToken(token);
  setAuthFailureCategory(token ? "none" : "missing_header");

  useEffect(() => {
    // Keep the module token in sync on later session refreshes.
    setApiToken(token);
  }, [session, token]);

  return <>{children}</>;
}

export function SessionProviderWrapper({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SessionAuth>{children}</SessionAuth>
    </SessionProvider>
  );
}