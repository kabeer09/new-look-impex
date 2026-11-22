import Link from "next/link";

const CARDS = [
  { title: "Sales & Campaigns", href: "/admin/site-control/campaigns", desc: "Create sales with start/end dates. They switch on and off automatically on the live site." },
  { title: "Coupons & Discounts", href: "/admin/site-control/coupons", desc: "Create and manage discount codes, including validity dates and usage limits." },
  { title: "Homepage Content", href: "/admin/site-control/content", desc: "Edit the images and text shown on your homepage — hero, cards, banners and more." },
  { title: "Banners", href: "/admin/banners", desc: "Manage banner media and links." },
  { title: "Site Settings", href: "/admin/settings", desc: "Phone, WhatsApp, address, announcement bar and other site-wide settings." },
  { title: "SEO Page Metadata", href: "/admin/seo-pages", desc: "Titles, descriptions and social images for your pages." },
];

export default function SiteControlHome() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Site Control</h1>
        <p className="text-sm text-gray mt-1">Everything here updates the live website directly. No rebuild needed.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <Link key={c.href} href={c.href} className="card hover:border-brass transition-colors">
            <h2 className="font-semibold text-navy">{c.title}</h2>
            <p className="text-sm text-gray mt-2 leading-relaxed">{c.desc}</p>
            <span className="link mt-3 inline-block text-sm">Open →</span>
          </Link>
        ))}
      </div>
      <div className="card bg-ivory">
        <p className="text-sm text-navy"><b>How live updates work:</b> saved changes are served by the website immediately. The public site fetches these settings fresh on every page load.</p>
      </div>
    </div>
  );
}
