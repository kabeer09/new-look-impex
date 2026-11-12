import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/brass-collection" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}