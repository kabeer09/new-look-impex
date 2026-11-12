import type { Metadata } from "next";

// Admin sign-in must never appear in search results.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminAuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
