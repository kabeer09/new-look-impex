"use client";
import { SessionProvider, useSession } from "next-auth/react";
import { ReactNode, useEffect } from "react";
import { setApiToken } from "@/lib/api";

function SessionAuth({ children }: { children: ReactNode }) {
  const { data: session } = useSession();

  useEffect(() => {
    const token = session?.user?.accessToken || null;
    setApiToken(token);
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
