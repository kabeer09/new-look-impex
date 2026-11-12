import type { Metadata } from "next";

// Admin security monitor must never appear in search results.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminToolsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
