"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const AUTHORIZED_EMAIL = "newlookimpex130@gmail.com";
const STORAGE_KEY = "nli_admin_email";

const NAV: { label: string; href: string; section?: string }[] = [
  { label: "Overview", href: "/admin/overview", section: "Workspace" },
  { label: "Products", href: "/admin/products", section: "Catalogue" },
  { label: "Categories", href: "/admin/categories", section: "Catalogue" },
  { label: "Collections", href: "/admin/collections", section: "Catalogue" },
  { label: "Media", href: "/admin/media", section: "Catalogue" },
  { label: "AI Product Import", href: "/admin/ai-import", section: "Catalogue" },
  { label: "AI Catalogue", href: "/admin/ai-catalogue", section: "Catalogue" },
  { label: "CSV Import", href: "/admin/csv-import", section: "Catalogue" },
  { label: "Banners", href: "/admin/banners", section: "Catalogue" },
  { label: "Product Catalogue (public)", href: "/catalogue", section: "Catalogue" },
  { label: "RFQs", href: "/admin/rfqs", section: "Orders" },
  { label: "Enquiries", href: "/admin/enquiries", section: "Orders" },
  { label: "Buyers (CRM)", href: "/admin/buyers", section: "Orders" },
  { label: "Keywords", href: "/admin/keywords", section: "SEO" },
  { label: "Opportunities", href: "/admin/opportunities", section: "SEO" },
  { label: "Search-to-Page", href: "/admin/search-to-page", section: "SEO" },
  { label: "SEO Audits", href: "/admin/audits", section: "SEO" },
  { label: "Recommendations", href: "/admin/recommendations", section: "SEO" },
  { label: "Content Studio", href: "/admin/content", section: "SEO" },
  { label: "SEO Page Metadata", href: "/admin/seo-pages", section: "SEO" },
  { label: "Publishing", href: "/admin/publishing", section: "SEO" },
  { label: "Integrations", href: "/admin/integrations", section: "SEO" },
  { label: "Analytics", href: "/admin/analytics", section: "SEO" },
  { label: "Automation", href: "/admin/automation", section: "SEO" },
  { label: "Users & Access", href: "/admin/users", section: "System" },
  { label: "Settings", href: "/admin/settings", section: "System" },
];

const SECTIONS = ["Workspace", "Catalogue", "Orders", "SEO", "System"];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginErr, setLoginErr] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    setAuthenticated(saved === AUTHORIZED_EMAIL);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginEmail.trim().toLowerCase() === AUTHORIZED_EMAIL) {
      localStorage.setItem(STORAGE_KEY, AUTHORIZED_EMAIL);
      setAuthenticated(true);
      setLoginErr("");
      setLoginEmail("");
    } else {
      setLoginErr("Only newlookimpex130@gmail.com can access the admin panel.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAuthenticated(false);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <div className="w-full max-w-md p-6 bg-white rounded-2xl shadow-xl border border-sand">
          <div className="flex items-center gap-2 mb-6">
            <span className="w-10 h-10 rounded-lg bg-gold text-navy font-serif font-bold flex items-center justify-center">N</span>
            <span>
              <span className="block font-bold text-navy text-lg">New Look Impex</span>
              <span className="block text-[11px] text-clay">Admin Access — Locked</span>
            </span>
          </div>
          <h2 className="font-serif font-bold text-navy text-2xl mb-2">Admin Login</h2>
          <p className="text-sm text-clay mb-6">
            Enter your business email to access the New Look Impex admin dashboard.
          </p>
          <form onSubmit={handleLogin} className="space-y-3">
            <label className="block text-xs font-semibold text-clay uppercase tracking-wider">Email address</label>
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="newlookimpex130@gmail.com"
              className="w-full px-4 py-3 bg-cream border border-sand rounded-xl text-navy focus:ring-2 focus:ring-gold outline-none"
              required
            />
            {loginErr && (
              <p className="text-xs text-red-700 font-medium">{loginErr}</p>
            )}
            <button
              type="submit"
              className="w-full py-3 bg-navy text-ivory rounded-xl font-bold hover:bg-clay-dark transition-colors"
            >
              Unlock Admin
            </button>
          </form>
          <p className="mt-6 text-center text-xs text-clay/50">
            Restricted to: newlookimpex130@gmail.com
          </p>
          <div className="mt-4 text-center">
            <Link href="/" className="text-xs text-clay hover:text-navy underline underline-offset-2">
              ← Back to public site
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory">
      {/* Top bar with logout */}
      <header className="hidden md:flex fixed inset-y-0 right-0 w-60 bg-navy text-ivory flex-col z-30 border-l border-ivory/10">
        <div className="px-4 py-4 border-b border-ivory/10">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gold text-navy font-serif font-bold flex items-center justify-center">N</span>
            <span>
              <span className="block font-bold text-white text-sm">New Look Impex</span>
              <span className="block text-[10px] text-ivory/60">Admin · Moradabad</span>
            </span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {SECTIONS.map((section) => (
            <div key={section} className="mt-3 first:mt-0">
              <p className="px-3 text-[10px] uppercase tracking-widest text-brass-light font-semibold">{section}</p>
              {NAV.filter((n) => n.section === section).map((n) => (
                <Link key={n.href} href={n.href} className={`nav-link ${pathname === n.href || (n.href !== "/admin/overview" && pathname.startsWith(n.href)) ? "active" : ""} !text-ivory/80 hover:!bg-ivory/10 ${pathname === n.href || pathname.startsWith(n.href) ? "!bg-brass/25 !text-white" : ""}`}>
                  {n.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-ivory/10 space-y-2">
          <Link href="/" className="block text-center text-xs text-brass-light hover:text-white border border-ivory/20 rounded-lg py-2">
            View public site ↗
          </Link>
          <button
            onClick={handleLogout}
            className="block w-full text-center text-xs text-red-500 hover:bg-red-50 rounded-lg py-2 border border-red-50/20"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-30 bg-navy text-ivory">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button className="btn !px-2 !py-1 text-white" onClick={() => setMobileOpen((v) => !v)} aria-expanded={mobileOpen} aria-label="Menu">
            ☰
          </button>
          <Link href="/admin/overview" className="font-bold text-sm text-white">New Look Impex Admin</Link>
          <span className="flex-1" />
          <button onClick={handleLogout} className="text-xs text-brass-light hover:text-white">
            Sign out
          </button>
        </div>
        {mobileOpen && (
          <nav className="px-3 pb-3 grid grid-cols-2 gap-1 max-h-[70vh] overflow-y-auto">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`text-xs px-2 py-1.5 rounded ${pathname === n.href ? "bg-brass/30 text-white" : "text-ivory/70"}`}
                onClick={() => setMobileOpen(false)}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        )}
      </div>

      <main className="md:ml-60 md:mr-60">
        <div className="container-x !px-4 md:!px-8 py-6 md:py-8 max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
