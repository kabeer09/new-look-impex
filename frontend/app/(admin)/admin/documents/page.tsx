import Link from "next/link";
export default function DocumentDashboard() {
  const cards = [
    { title: "Manual Quotation (one page)", href: "/admin/documents/manual-quotation", desc: "Your details are pre-filled — just type the buyer and products and click Generate." },
    { title: "Buyer Enquiry Quotation", href: "/admin/documents/buyer-enquiry", desc: "For detailed buyer questions — 10 questions pre-loaded, you type the answers and generate the quotation." },
    { title: "Create New Quotation", href: "/admin/documents/quotation/new", desc: "Build a wholesale quotation from scratch — manual buyer, products, prices and terms." },
    { title: "Create New Invoice", href: "/admin/documents/invoice/new", desc: "Proforma, commercial or sales invoice — for any buyer, even one not in your system." },
    { title: "Quotation History", href: "/admin/documents/quotations", desc: "Search, filter, edit, duplicate and download all quotations." },
    { title: "Invoice History", href: "/admin/documents/invoices", desc: "Track payments, statuses and download invoices." },
    { title: "Document Settings", href: "/admin/documents/settings", desc: "Numbering prefixes, default currency, validity and default terms." },
    { title: "Company Profile", href: "/admin/documents/company", desc: "Company logo, address, GSTIN/IEC and bank details used on every document." },
  ];
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold">Document Studio</h1>
        <p className="text-sm text-gray mt-1">Create professional quotations and invoices manually — no buyer or catalogue record required.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="card hover:border-brass transition-colors">
            <h2 className="font-semibold text-navy">{c.title}</h2>
            <p className="text-sm text-gray mt-2 leading-relaxed">{c.desc}</p>
            <span className="link mt-3 inline-block text-sm">Open →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
