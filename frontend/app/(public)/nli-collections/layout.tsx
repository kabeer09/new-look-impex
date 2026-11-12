import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/nli-collections" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}