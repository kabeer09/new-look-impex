import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/request-quote" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}