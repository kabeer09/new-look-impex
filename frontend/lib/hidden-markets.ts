import type { Metadata } from "next";
import { marketMetaDescription } from "./country-seo";

/**
 * SEO-only market landing pages — the remaining 11 countries from the ranked
 * opportunity list. Deliberately NOT listed in main navigation, the footer,
 * the homepage market strip or the /europe hub. They are discoverable through
 * the sitemap, their reciprocal hreflang cluster and their peer links.
 */
export interface HiddenMarket {
  slug: string;
  path: string;
  name: string;
  hreflang: string;
  h1: string;
  focus: string;
  intro: string[];
  bullets: string[];
  faqs: [string, string][];
  keywords: string;
  hero: string;
  gallery: string[];
  theme: 0 | 1 | 2 | 3;
  accent: string; // Tailwind text colour class for the eyebrow
}

const SITE = "https://www.newlookimpex.store";

export const HIDDEN_MARKETS: HiddenMarket[] = [
  {
    slug: "norway", path: "/europe/norway", name: "Norway", hreflang: "en-no",
    h1: "Premium Brass & Copper Interior Décor Manufacturer for Norway",
    focus: "Premium interior décor",
    intro: [
      "New Look Impex supplies handcrafted brass and copper interior décor to retailers, interior designers and gift buyers in Norway. Our Moradabad-made range — clean-lined brass bowls, hammered copper drinkware and understated decorative accents — suits Norwegian buyers looking for artisan metal pieces for considered interiors.",
      "Every Norwegian enquiry receives an individual written quotation covering specification, finish, quantity, packaging and shipping terms before production. We export from Moradabad, India with documentation handled per order.",
    ],
    bullets: [
      "Understated brass bowls, urlis and decorative accents for Norwegian homeware retailers",
      "Hammered copper drinkware for premium interior and lifestyle collections",
      "Metal lanterns and seasonal accents for gifting programmes",
      "Custom finishes and private label options quoted per enquiry",
      "Written quotations with MOQ, lead time and shipping terms confirmed before production",
    ],
    faqs: [
      ["Do you supply brass and copper décor to Norway?", "Yes. We export handcrafted metal décor from Moradabad, India to buyers in Norway, quoted individually per order."],
      ["Can finishes suit a minimalist Scandinavian range?", "Finish and specification options are discussed per enquiry and confirmed in the written quotation."],
      ["Do you offer private label for Norwegian retailers?", "Private labelling and custom packaging are quoted like any wholesale order."],
      ["How is the minimum order quantity set?", "MOQs vary by product and finish and are listed on each product page; custom and bulk quantities are quoted per enquiry."],
    ],
    keywords: "premium brass interior decor Norway, copperware supplier Norway, Indian handicrafts exporter Norway, brass decorative bowls wholesale Norway, metal home decor manufacturer Norway",
    hero: "/home/journal-styling.jpg",
    gallery: ["/home/material-brass.jpg", "/nli-copper-bottle.jpg", "/home/cat-urlis.jpg"],
    theme: 0, accent: "text-clay",
  },
  {
    slug: "south-africa", path: "/south-africa", name: "South Africa", hreflang: "en-za",
    h1: "Decorative Metalware & Hospitality Supplies Manufacturer for South Africa",
    focus: "Décor · hospitality supplies",
    intro: [
      "New Look Impex supplies decorative metalware and hospitality supplies to retailers, hotels and importers in South Africa. Our Moradabad-made collections — brass lanterns, serving ware, copper drinkware and festive décor — suit both retail and hospitality buyers sourcing handcrafted metal products.",
      "Every South African enquiry receives a written quotation covering specification, finish, quantity, packaging and shipping terms before production. We handle export documentation and ship from Moradabad, India.",
    ],
    bullets: [
      "Brass lanterns, trays and decorative pieces for South African homeware retailers",
      "Serveware and tabletop metalware for hotels, restaurants and hospitality groups",
      "Copper drinkware and gift sets for retail and corporate programmes",
      "Custom packaging and private label options quoted per enquiry",
      "Written quotations with MOQ, lead time and shipping terms confirmed before production",
    ],
    faqs: [
      ["Do you supply decorative metalware to South Africa?", "Yes. We export handcrafted brass and copper products from Moradabad, India to buyers in South Africa, quoted individually."],
      ["Can you supply hospitality tableware?", "Yes. Serveware, lanterns and decorative tabletop pieces are quoted per enquiry with finish and packaging options confirmed in writing."],
      ["Do you offer private label for South African retailers?", "Private labelling and custom packaging are quoted like any wholesale order."],
      ["How is the minimum order quantity set?", "MOQs vary by product and finish and are listed on each product page; custom and bulk quantities are quoted per enquiry."],
    ],
    keywords: "decorative metalware supplier South Africa, brass lanterns wholesale South Africa, hospitality tableware exporter India, copper drinkware supplier South Africa, Indian handicrafts exporter South Africa",
    hero: "/home/export-banner.jpg",
    gallery: ["/gallery-festive-handi.jpg", "/home/cat-cookware.jpg", "/nli-brass-utensils.jpg"],
    theme: 1, accent: "text-gold",
  },
  {
    slug: "new-zealand", path: "/new-zealand", name: "New Zealand", hreflang: "en-nz",
    h1: "Handmade Copperware & Brass Décor Manufacturer for New Zealand",
    focus: "Copperware · handmade décor",
    intro: [
      "New Look Impex supplies handmade copperware and brass décor to retailers, gift buyers and interior designers in New Zealand. Our Moradabad-made range — hammered copper bottles and drinkware, brass bowls and artisanal decorative pieces — suits buyers looking for handcrafted metal goods with a natural, warm finish.",
      "Every New Zealand enquiry receives a written quotation covering specification, finish, quantity, packaging and shipping terms before production. We export from Moradabad, India with documentation handled per order.",
    ],
    bullets: [
      "Hand-hammered copper bottles, jugs and drinkware for New Zealand retail",
      "Brass bowls, urlis and decorative pieces for homeware and gift stores",
      "Artisanal metal accents for interior and lifestyle collections",
      "Custom finishes and gift packaging quoted per enquiry",
      "Written quotations with MOQ, lead time and shipping terms confirmed before production",
    ],
    faqs: [
      ["Do you supply copperware to New Zealand?", "Yes. We export handcrafted copper and brass products from Moradabad, India to buyers in New Zealand, quoted individually."],
      ["Are finishes customisable for lifestyle ranges?", "Finish options are discussed per enquiry and recorded in the written quotation; nothing is assumed."],
      ["Do you offer gift packaging?", "Custom and gift packaging are quoted like any wholesale order — share your requirements in the enquiry."],
      ["How is the minimum order quantity set?", "MOQs vary by product and finish and are listed on each product page; custom and bulk quantities are quoted per enquiry."],
    ],
    keywords: "handmade copperware New Zealand, copper bottles wholesale New Zealand, brass decor supplier New Zealand, Indian handicrafts exporter New Zealand, metal giftware wholesale New Zealand",
    hero: "/gallery-copper-bottles.webp",
    gallery: ["/nli-copper-bottle.jpg", "/home/cat-drinkware.jpg", "/home/material-copper.jpg"],
    theme: 2, accent: "text-clay",
  },
  {
    slug: "south-korea", path: "/south-korea", name: "South Korea", hreflang: "en-kr",
    h1: "Modern Brass Décor & Design Accessories Manufacturer for South Korea",
    focus: "Modern brass décor · design",
    intro: [
      "New Look Impex supplies modern brass décor and design accessories to retailers, design studios and gift buyers in South Korea. Our Moradabad-made range — refined brass bowls, sculptural accents and hammered copper pieces — suits buyers looking for contemporary metal objects with artisan detailing.",
      "Every South Korean enquiry receives a written quotation covering specification, finish, quantity, packaging and shipping terms before production. We export from Moradabad, India with documentation handled per order.",
    ],
    bullets: [
      "Clean-lined brass bowls, trays and sculptural accents for design-led retailers",
      "Hammered copper drinkware for contemporary lifestyle collections",
      "Small metal gift items and seasonal accessories",
      "Custom finishes and private label options quoted per enquiry",
      "Written quotations with MOQ, lead time and shipping terms confirmed before production",
    ],
    faqs: [
      ["Do you supply brass décor to South Korea?", "Yes. We export handcrafted brass and copper products from Moradabad, India to buyers in South Korea, quoted individually."],
      ["Can designs and finishes be customised?", "Design, size and finish options are discussed per enquiry and confirmed in the written quotation."],
      ["Do you support private label programmes?", "Private labelling and custom packaging are quoted like any wholesale order."],
      ["How is the minimum order quantity set?", "MOQs vary by product and finish and are listed on each product page; custom and bulk quantities are quoted per enquiry."],
    ],
    keywords: "modern brass decor South Korea, design accessories supplier South Korea, copperware wholesale South Korea, Indian metal handicrafts exporter South Korea, brass decorative bowls wholesale Korea",
    hero: "/home/cat-urlis.jpg",
    gallery: ["/home/journal-styling.jpg", "/nli-brass-masala-box.jpg", "/gallery-poster-v1.jpg"],
    theme: 3, accent: "text-gold",
  },
  {
    slug: "turkey", path: "/turkey", name: "Turkey", hreflang: "en-tr",
    h1: "Decorative Metal Products & Lantern Manufacturer for Turkey",
    focus: "Decorative metalware · lanterns",
    intro: [
      "New Look Impex supplies decorative metal products and lanterns to retailers, importers and hospitality buyers in Turkey. Our Moradabad-made collections — brass lanterns, decorative bowls, copperware and festive accents — suit buyers sourcing handcrafted metal décor for retail and gifting programmes.",
      "Every Turkish enquiry receives a written quotation covering specification, finish, quantity, packaging and shipping terms before production. We export from Moradabad, India with documentation handled per order.",
    ],
    bullets: [
      "Brass lanterns and decorative lighting for Turkish homeware and hospitality buyers",
      "Hammered copperware and brass bowls for retail collections",
      "Festive accents and gift items for seasonal programmes",
      "Custom sizes, finishes and packaging quoted per enquiry",
      "Written quotations with MOQ, lead time and shipping terms confirmed before production",
    ],
    faqs: [
      ["Do you supply decorative metalware to Turkey?", "Yes. We export handcrafted brass and copper products from Moradabad, India to buyers in Turkey, quoted individually."],
      ["Are lanterns available in custom sizes?", "Custom sizes and finishes are quoted per enquiry and confirmed in the written quotation."],
      ["Do you offer private label for Turkish retailers?", "Private labelling and custom packaging are quoted like any wholesale order."],
      ["How is the minimum order quantity set?", "MOQs vary by product and finish and are listed on each product page; custom and bulk quantities are quoted per enquiry."],
    ],
    keywords: "decorative metal products Turkey, brass lanterns manufacturer India Turkey, copperware supplier Turkey, Indian handicrafts exporter Turkey, metal home decor wholesale Turkey",
    hero: "/home/cat-diyas-lanterns.jpg",
    gallery: ["/home/cat-pooja.jpg", "/nli-gift-set.jpg", "/gallery-poster-v2.jpg"],
    theme: 0, accent: "text-clay",
  },
  {
    slug: "mexico", path: "/mexico", name: "Mexico", hreflang: "en-mx",
    h1: "Metal Décor, Tableware & Wholesale Supplier for Mexico",
    focus: "Metal décor · tableware · wholesale",
    intro: [
      "New Look Impex supplies metal décor and tableware to retailers, distributors and wholesale buyers in Mexico. Our Moradabad-made range — brass serveware, copper drinkware, decorative bowls and lanterns — suits buyers building handcrafted metal collections for home and hospitality markets.",
      "Every Mexican enquiry receives a written quotation covering specification, finish, quantity, packaging and shipping terms before production. We handle export documentation and ship from Moradabad, India.",
    ],
    bullets: [
      "Brass serveware, trays and tableware for Mexican retailers and distributors",
      "Copper bottles, jugs and drinkware for wholesale programmes",
      "Decorative bowls and lanterns for home and hospitality ranges",
      "Mixed-category orders quoted together for importers",
      "Written quotations with MOQ, lead time and shipping terms confirmed before production",
    ],
    faqs: [
      ["Do you supply metal décor and tableware to Mexico?", "Yes. We export handcrafted brass and copper products from Moradabad, India to buyers in Mexico, quoted individually."],
      ["Can we mix tableware and décor in one order?", "Yes. Mixed-category orders are quoted together — list your requirements in the enquiry."],
      ["Do you offer private label for Mexican retailers?", "Private labelling and custom packaging are quoted like any wholesale order."],
      ["How is the minimum order quantity set?", "MOQs vary by product and finish and are listed on each product page; custom and bulk quantities are quoted per enquiry."],
    ],
    keywords: "metal decor wholesale Mexico, brass tableware supplier Mexico, copper drinkware wholesale Mexico, Indian handicrafts exporter Mexico, metal home accessories distributor Mexico",
    hero: "/nli-brass-utensils.jpg",
    gallery: ["/home/cat-tableware.jpg", "/nli-copper-utensils.jpg", "/home/cat-kitchenware.jpg"],
    theme: 1, accent: "text-gold",
  },
  {
    slug: "brazil", path: "/brazil", name: "Brazil", hreflang: "en-br",
    h1: "Home Décor & Decorative Metalware Manufacturer for Brazil",
    focus: "Home décor · decorative metalware",
    intro: [
      "New Look Impex supplies home décor and decorative metalware to retailers, gift buyers and importers in Brazil. Our Moradabad-made collections — brass bowls and urlis, hammered copper pieces, lanterns and gift sets — suit buyers looking for handcrafted metal décor with warm artisanal finishes.",
      "Every Brazilian enquiry receives a written quotation covering specification, finish, quantity, packaging and shipping terms before production. We export from Moradabad, India with documentation handled per order.",
    ],
    bullets: [
      "Brass bowls, urlis and decorative accents for Brazilian homeware retailers",
      "Hammered copper drinkware and serveware for lifestyle collections",
      "Gift sets and festive items for seasonal programmes",
      "Custom finishes and packaging quoted per enquiry",
      "Written quotations with MOQ, lead time and shipping terms confirmed before production",
    ],
    faqs: [
      ["Do you supply home décor to Brazil?", "Yes. We export handcrafted brass and copper décor from Moradabad, India to buyers in Brazil, quoted individually."],
      ["Are gift sets available for seasonal programmes?", "Yes. Gift-boxed sets and festive items are quoted per enquiry with packaging options confirmed in writing."],
      ["Do you support private label?", "Private labelling and custom packaging are quoted like any wholesale order."],
      ["How is the minimum order quantity set?", "MOQs vary by product and finish and are listed on each product page; custom and bulk quantities are quoted per enquiry."],
    ],
    keywords: "home decor metalware Brazil, brass decorative items wholesale Brazil, copperware supplier Brazil, Indian handicrafts exporter Brazil, metal gift sets wholesale Brazil",
    hero: "/home/cat-gift-sets.jpg",
    gallery: ["/gallery-festive-handi.jpg", "/nli-copper-gift-set.jpg", "/home/journal-gifting.jpg"],
    theme: 2, accent: "text-clay",
  },
  {
    slug: "ireland", path: "/europe/ireland", name: "Ireland", hreflang: "en-ie",
    h1: "Home Accessories & Gifting Manufacturer for Ireland",
    focus: "Home accessories · gifting",
    intro: [
      "New Look Impex supplies home accessories and gifting ranges to retailers and gift buyers in Ireland. Our Moradabad-made collection — brass decorative pieces, copper drinkware, lanterns and gift sets — suits Irish buyers looking for handcrafted metal accessories with a timeless finish.",
      "Every Irish enquiry receives a written quotation covering specification, finish, quantity, packaging and shipping terms before production. We export from Moradabad, India with documentation handled per order.",
    ],
    bullets: [
      "Brass home accessories, bowls and decorative pieces for Irish retailers",
      "Copper drinkware and serveware for gifting and lifestyle ranges",
      "Gift sets for seasonal and corporate programmes",
      "Custom packaging and private label options quoted per enquiry",
      "Written quotations with MOQ, lead time and shipping terms confirmed before production",
    ],
    faqs: [
      ["Do you supply home accessories to Ireland?", "Yes. We export handcrafted brass and copper accessories from Moradabad, India to buyers in Ireland, quoted individually."],
      ["Can you supply seasonal gift sets?", "Yes. Gift-boxed sets are quoted per enquiry with packaging and finish options confirmed in writing."],
      ["Do you offer private label for Irish retailers?", "Private labelling and custom packaging are quoted like any wholesale order."],
      ["How is the minimum order quantity set?", "MOQs vary by product and finish and are listed on each product page; custom and bulk quantities are quoted per enquiry."],
    ],
    keywords: "home accessories wholesale Ireland, brass gifting supplier Ireland, copper drinkware wholesale Ireland, Indian handicrafts exporter Ireland, metal gift sets Ireland",
    hero: "/home/festive-christmas.jpg",
    gallery: ["/nli-gift-set.jpg", "/home/cat-corporate-gifting.jpg", "/home/journal-gifting.jpg"],
    theme: 3, accent: "text-gold",
  },
  {
    slug: "portugal", path: "/europe/portugal", name: "Portugal", hreflang: "en-pt",
    h1: "Decorative Metal Products Manufacturer for Portugal",
    focus: "Decorative metalware",
    intro: [
      "New Look Impex supplies decorative metal products to retailers, interior designers and importers in Portugal. Our Moradabad-made range — brass bowls, engraved decorative pieces, copperware and lanterns — suits buyers sourcing handcrafted metal décor with detailed finishes.",
      "Every Portuguese enquiry receives a written quotation covering specification, finish, quantity, packaging and shipping terms before production. We export from Moradabad, India with documentation handled per order.",
    ],
    bullets: [
      "Brass decorative bowls, trays and engraved pieces for Portuguese retailers",
      "Hammered copper drinkware and serveware for homeware collections",
      "Metal lanterns and accents for seasonal programmes",
      "Custom finishes and private label options quoted per enquiry",
      "Written quotations with MOQ, lead time and shipping terms confirmed before production",
    ],
    faqs: [
      ["Do you supply decorative metal products to Portugal?", "Yes. We export handcrafted brass and copper décor from Moradabad, India to buyers in Portugal, quoted individually."],
      ["Are engraved or custom finishes available?", "Finish and engraving options are discussed per enquiry and confirmed in the written quotation."],
      ["Do you support private label?", "Private labelling and custom packaging are quoted like any wholesale order."],
      ["How is the minimum order quantity set?", "MOQs vary by product and finish and are listed on each product page; custom and bulk quantities are quoted per enquiry."],
    ],
    keywords: "decorative metal products Portugal, brass decor supplier Portugal, copperware wholesale Portugal, Indian handicrafts exporter Portugal, engraved brass bowls Portugal",
    hero: "/home/material-brass.jpg",
    gallery: ["/nli-brass-masala-box.jpg", "/home/cat-masala.jpg", "/gallery-poster-v3.jpg"],
    theme: 0, accent: "text-clay",
  },
  {
    slug: "greece", path: "/europe/greece", name: "Greece", hreflang: "en-gr",
    h1: "Mediterranean Décor & Lantern Manufacturer for Greece",
    focus: "Mediterranean décor · lanterns",
    intro: [
      "New Look Impex supplies Mediterranean-style décor and lanterns to retailers, hospitality buyers and gift shops in Greece. Our Moradabad-made range — brass lanterns, decorative bowls, copper drinkware and festive accents — suits buyers looking for warm, handcrafted metal pieces for home and hospitality settings.",
      "Every Greek enquiry receives a written quotation covering specification, finish, quantity, packaging and shipping terms before production. We export from Moradabad, India with documentation handled per order.",
    ],
    bullets: [
      "Brass lanterns and decorative lighting for Greek homeware and hospitality buyers",
      "Copper drinkware and serveware for retail and cafe collections",
      "Decorative bowls and festive accents for gifting programmes",
      "Custom finishes and packaging quoted per enquiry",
      "Written quotations with MOQ, lead time and shipping terms confirmed before production",
    ],
    faqs: [
      ["Do you supply lanterns and décor to Greece?", "Yes. We export handcrafted brass and copper décor from Moradabad, India to buyers in Greece, quoted individually."],
      ["Are lanterns available in different sizes?", "Sizes and finishes are quoted per enquiry and confirmed in the written quotation."],
      ["Do you offer private label for Greek retailers?", "Private labelling and custom packaging are quoted like any wholesale order."],
      ["How is the minimum order quantity set?", "MOQs vary by product and finish and are listed on each product page; custom and bulk quantities are quoted per enquiry."],
    ],
    keywords: "Mediterranean decor supplier Greece, brass lanterns wholesale Greece, copperware supplier Greece, Indian handicrafts exporter Greece, metal decor wholesale Greece",
    hero: "/gallery-poster-v2.jpg",
    gallery: ["/home/cat-diyas-lanterns.jpg", "/home/cat-urlis.jpg", "/nli-brass-utensils.jpg"],
    theme: 1, accent: "text-gold",
  },
  {
    slug: "qatar", path: "/qatar", name: "Qatar", hreflang: "en-qa",
    h1: "Luxury Décor, Hospitality & Gifting Manufacturer for Qatar",
    focus: "Luxury décor · hospitality · gifting",
    intro: [
      "New Look Impex supplies decorative metalware to retailers, hospitality groups and corporate gifting buyers in Qatar. Our Moradabad-made collections — brass lanterns, hammered copperware, decorative bowls and gift-boxed sets — suit buyers sourcing distinctive handcrafted pieces for luxury retail and hospitality settings.",
      "Every Qatari enquiry receives a written quotation covering specification, finish, quantity, packaging and shipping terms before production. We handle export documentation and ship from Moradabad, India.",
    ],
    bullets: [
      "Gift-boxed copper and brass sets for corporate and seasonal gifting",
      "Brass lanterns and decorative pieces for hospitality and majlis styling",
      "Hammered serveware and tabletop pieces for hotels and restaurants",
      "Custom packaging and private label options quoted per enquiry",
      "Written quotations with MOQ, lead time and shipping terms confirmed before production",
    ],
    faqs: [
      ["Do you supply decorative metalware to Qatar?", "Yes. We export handcrafted brass and copper products from Moradabad, India to buyers in Qatar, quoted individually."],
      ["Can you supply corporate gifting programmes?", "Yes. Gift-boxed sets and custom packaging are quoted per enquiry with all details confirmed in writing."],
      ["Do you offer private label for Qatari retailers?", "Private labelling and custom packaging are quoted like any wholesale order."],
      ["How is the minimum order quantity set?", "MOQs vary by product and finish and are listed on each product page; custom and bulk quantities are quoted per enquiry."],
    ],
    keywords: "luxury decor supplier Qatar, brass lanterns wholesale Qatar, corporate gifting manufacturer Qatar, copperware supplier Qatar, Indian handicrafts exporter Qatar",
    hero: "/home/festive-ramadan.jpg",
    gallery: ["/nli-copper-gift-set.jpg", "/gallery-dispenser.webp", "/home/cat-gift-sets.jpg"],
    theme: 2, accent: "text-clay",
  },
];

export const HIDDEN_SLUGS = HIDDEN_MARKETS.map((m) => m.slug);

export function getHiddenMarket(slug: string): HiddenMarket | undefined {
  return HIDDEN_MARKETS.find((m) => m.slug === slug);
}

/** Reciprocal hreflang cluster for the 11 SEO-only market pages. */
export const HIDDEN_LANGUAGES: Record<string, string> = Object.fromEntries(
  HIDDEN_MARKETS.map((m) => [m.hreflang, `${SITE}${m.path}`]),
);

export function hiddenMetadata(cfg: HiddenMarket): Metadata {
  const description = marketMetaDescription(cfg.h1, cfg.bullets, cfg.focus);
  const url = `${SITE}${cfg.path}`;
  return {
    title: cfg.h1,
    description,
    keywords: cfg.keywords,
    alternates: { canonical: url, languages: HIDDEN_LANGUAGES },
    openGraph: { title: `${cfg.h1} — New Look Impex`, description, type: "website", url },
    twitter: { card: "summary_large_image", title: cfg.h1, description },
  };
}
