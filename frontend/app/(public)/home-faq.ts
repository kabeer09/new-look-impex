/**
 * Homepage FAQ copy — single source of truth shared by the visible accordion
 * (HomeClient) and the FAQPage JSON-LD (page.tsx), so structured data always
 * matches what a visitor can read on the page.
 *
 * Every answer must reflect the real site policies (/terms, /shipping-export,
 * /wholesale) — never invent prices, guarantees or certifications.
 */
export const HOME_FAQ: { q: string; a: string }[] = [
  { q: "Do you accept international wholesale orders?", a: "Yes. We handle bulk and export enquiries from buyers worldwide. Each order receives a written quotation with price, MOQ, lead time, and shipping terms." },
  { q: "What is your minimum order quantity (MOQ)?", a: "MOQs vary by product and finish. Each product page lists its MOQ. Custom and bulk quantities are quoted per enquiry." },
  { q: "Can products be customized?", a: "Yes. Custom sizes, finishes, engravings, and private labelling are available. Customization is quoted like any wholesale order." },
  { q: "Do you offer private labelling?", a: "Yes. Private label and OEM manufacturing are available for bulk orders. Discuss your requirements via Request a Quote." },
  { q: "Can buyers request samples?", a: "Sample availability and terms are confirmed per product on enquiry. Ask for samples when you request a quote." },
  { q: "What packaging options are available?", a: "Standard export packaging is used. Gift-box presentation is available on selected sets. Custom packaging is quoted per order." },
  { q: "Which countries do you export to?", a: "We export to USA, UK, UAE, Australia, Canada, Europe, Saudi Arabia, and other international markets." },
  { q: "How can buyers request a quotation?", a: "Browse the catalogue, add items to your enquiry list with quantities, and submit a Request a Quote. You receive a reference number and a written quotation." },
];
