"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { setAuthFailureCategory, getAuthFailureCategory } from "@/lib/api";

const NAV_ITEMS = [
  { key: "overview", label: "Overview", href: "/admin" },
  { key: "products", label: "Products & Catalogue", href: "/admin/products" },
  { key: "categories", label: "Categories", href: "/admin/categories" },
  { key: "collections", label: "Collections", href: "/admin/collections" },
  { key: "homepage", label: "Homepage Manager", href: "/admin/homepage" },
  { key: "pages", label: "Website Pages", href: "/admin/pages" },
  { key: "markets", label: "International Markets", href: "/admin/markets" },
  { key: "seo", label: "SEO Manager", href: "/admin/seo" },
  { key: "media", label: "Media Library", href: "/admin/media" },
  { key: "enquiries", label: "Enquiries & Leads", href: "/admin/enquiries" },
  { key: "buyers", label: "Buyers & Companies", href: "/admin/buyers" },
  { key: "gmail", label: "Gmail & Communication", href: "/admin/gmail" },
  { key: "analytics", label: "Analytics & Reports", href: "/admin/analytics" },
  { key: "integrations", label: "Integrations & API", href: "/admin/integrations" },
  { key: "users", label: "Users & Permissions", href: "/admin/users" },
  { key: "settings", label: "Website Settings", href: "/admin/settings" },
  { key: "activity", label: "Activity Log", href: "/admin/activity" },
];

export function SidebarNavigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isActive = (href: string) => pathname === href;

  return null;
}