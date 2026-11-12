import type { Metadata } from "next";
import { AdminShell } from "./AdminShell";

// Admin dashboard must never appear in search results.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
