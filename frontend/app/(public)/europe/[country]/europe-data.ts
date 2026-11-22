/**
 * Europe Markets country data — one genuinely distinct page per market.
 *
 * Honesty rules (same as the rest of the site):
 *  - No invented certifications, export history, testimonials or achievements.
 *  - No prices, MOQs or lead times here — those are confirmed in a written quote.
 *  - Copy is unique per country (market focus, buyer questions, keywords) so the
 *    pages are useful resources, not doorway pages with the country name swapped.
 */
export interface EuropeCountry {
  slug: string;
  name: string;
  h1: string;
  focus: string;
  intro: string[];
  bullets: string[];
  keywords: string;
  faqs: [string, string][];
  categories: string[];
}

export const EUROPE_COUNTRIES: EuropeCountry[] = [
  {
    slug: "germany",
    name: "Germany",
    h1: "Indian Copperware & Brass Handicrafts Manufacturer for Germany",
    focus: "Copperware · brass décor · handicrafts",
    intro: [
      "New Look Impex supplies hand-hammered copperware and brass handicrafts to wholesalers, importers and homeware retailers in Germany. From copper drinkware and kitchenware to decorative brass urlis, diyas and lanterns, our Moradabad-made collections are quoted individually for German buyers.",
      "Every enquiry receives a written quotation covering product specifications, finish, quantity, packaging and shipping terms before production. We handle export documentation and ship from Moradabad, India.",
    ],
    bullets: [
      "Copper bottles, jugs and drinkware for German retail and gifting programmes",
      "Brass home décor, decorative bowls and lanterns for homeware buyers",
      "Hand-hammered handicrafts with finish options confirmed per order",
      "Custom packaging and private label options for German importers",
      "Written quotations with MOQ, lead time and shipping terms confirmed before production",
    ],
    keywords: "Indian copperware manufacturer Germany, brass handicrafts wholesale Germany, copper bottles supplier Germany, brass home decor wholesale Germany, Indian handicraft exporter Germany",
    faqs: [
      ["Do you supply copperware and brass handicrafts to Germany?", "Yes. We export handcrafted copper and brass products from Moradabad, India to buyers in Germany. Every order is quoted individually with shipping and documentation details."],
      ["Can products be made to a custom finish for the German market?", "Finish options and custom specifications are discussed per enquiry and confirmed in your written quotation. No finish is assumed."],
      ["Do you offer private label for German retailers?", "Yes. Private labelling and custom packaging are quoted like any wholesale order — share your requirements in the enquiry."],
      ["How is the minimum order quantity set?", "MOQs vary by product and finish and are listed on each product page; custom and bulk quantities are quoted per enquiry."],
    ],
    categories: ["copper-bottles", "copper-kitchenware", "decorative-bowls"],
  },
  {
    slug: "france",
    name: "France",
    h1: "Indian Brass Home Décor Supplier for France — Metalware Manufacturer",
    focus: "Luxury home décor · brass décor",
    intro: [
      "New Look Impex supplies Indian brass home décor and metalware to decorators, retailers and importers in France. Our Moradabad-made range — brass urlis, decorative bowls, lanterns and hammered copper pieces — is positioned for buyers seeking handcrafted metal décor with a premium finish.",
      "Every French enquiry receives an individual written quotation covering specification, finish, quantity, packaging and shipping terms before production. We export from Moradabad, India with documentation handled per order.",
    ],
    bullets: [
      "Brass décor, decorative bowls and urlis for French homeware buyers",
      "Hand-hammered copper pieces for premium décor collections",
      "Metal lanterns and festive accents for seasonal programmes",
      "Custom finishes and private label options quoted per enquiry",
      "Written quotations with MOQ, lead time and shipping terms confirmed before production",
    ],
    keywords: "Indian brass home decor supplier France, luxury metal home decor, brass decorative items wholesale France, Indian handicraft manufacturer France, copperware exporter France",
    faqs: [
      ["Do you supply brass home décor to France?", "Yes. We export handcrafted brass and copper décor from Moradabad, India to buyers in France, with each order quoted individually."],
      ["Can the finish be customised for premium décor ranges?", "Yes. Finish options are discussed per enquiry and recorded in the written quotation; nothing is assumed."],
      ["Do you offer gift packaging for French retailers?", "Custom packaging and private labelling are quoted like any wholesale order. Share your requirements in the enquiry."],
      ["How is the minimum order quantity set?", "MOQs vary by product and finish and are listed on each product page; custom and bulk quantities are quoted per enquiry."],
    ],
    categories: ["decorative-bowls", "copper-bottles"],
  },
  {
    slug: "italy",
    name: "Italy",
    h1: "Handmade Copper Products & Indian Metal Décor Manufacturer for Italy",
    focus: "Premium metalware · decorative products",
    intro: [
      "New Look Impex supplies handmade copper products and Indian metal décor to retailers, distributors and design buyers in Italy. Our Moradabad-made collections — hammered copper drinkware, brass décor and decorative bowls — suit buyers looking for artisan metalware with detailed finishes.",
      "Every Italian enquiry receives a written quotation covering specification, finish, quantity, packaging and shipping terms before production. We export from Moradabad, India with documentation handled per order.",
    ],
    bullets: [
      "Hand-hammered copper drinkware and kitchenware for Italian retailers",
      "Brass décor, decorative bowls and urlis for design-led collections",
      "Metal lanterns and accents for homeware programmes",
      "Custom finishes and private label options quoted per enquiry",
      "Written quotations with MOQ, lead time and shipping terms confirmed before production",
    ],
    keywords: "handmade copper products wholesale Italy, Indian metal decor manufacturer Italy, brass decorative items wholesale Italy, copperware supplier Italy, Indian handicraft exporter Italy",
    faqs: [
      ["Do you supply handmade copper products to Italy?", "Yes. We export handcrafted copper and brass products from Moradabad, India to buyers in Italy, quoted individually per order."],
      ["Are custom finishes available for Italian design buyers?", "Yes. Finish and specification options are confirmed in the written quotation; share your brief in the enquiry."],
      ["Do you support private label programmes?", "Private labelling and custom packaging are quoted like any wholesale order."],
      ["How is the minimum order quantity set?", "MOQs vary by product and finish and are listed on each product page; custom and bulk quantities are quoted per enquiry."],
    ],
    categories: ["copper-bottles", "copper-kitchenware", "decorative-bowls"],
  },
  {
    slug: "netherlands",
    name: "Netherlands",
    h1: "Indian Handicrafts Wholesale Supplier & Copperware Exporter for the Netherlands",
    focus: "Wholesale handicrafts · copperware",
    intro: [
      "New Look Impex supplies Indian handicrafts and copperware to wholesalers, distributors and retailers in the Netherlands. Our Moradabad-made range covers copper drinkware, brass home décor, urlis, diyas and lanterns for buyers serving the Dutch and wider European market.",
      "Every Dutch enquiry receives a written quotation covering specification, finish, quantity, packaging and shipping terms before production. We export from Moradabad, India with documentation handled per order.",
    ],
    bullets: [
      "Copper bottles, jugs and drinkware for Dutch wholesale buyers",
      "Brass home décor and festive items for distributors",
      "Hand-hammered handicrafts with finish options confirmed per order",
      "Custom packaging and private label options quoted per enquiry",
      "Written quotations with MOQ, lead time and shipping terms confirmed before production",
    ],
    keywords: "Indian handicrafts wholesale supplier Netherlands, copperware exporter Netherlands, brass handicrafts wholesale Netherlands, copper bottles wholesale Netherlands, Indian metal decor supplier Netherlands",
    faqs: [
      ["Do you supply wholesale handicrafts to the Netherlands?", "Yes. We export handcrafted copper and brass handicrafts from Moradabad, India to buyers in the Netherlands, quoted individually."],
      ["Can we consolidate mixed categories in one order?", "Yes. Mixed orders across copperware, décor and festive ranges are quoted together — list your requirements in the enquiry."],
      ["Do you offer private label for Dutch distributors?", "Private labelling and custom packaging are quoted like any wholesale order."],
      ["How is the minimum order quantity set?", "MOQs vary by product and finish and are listed on each product page; custom and bulk quantities are quoted per enquiry."],
    ],
    categories: ["copper-bottles", "copper-kitchenware", "decorative-bowls"],
  },
  {
    slug: "spain",
    name: "Spain",
    h1: "Brass Decorative Items Wholesale & Indian Handicraft Manufacturer for Spain",
    focus: "Home décor · lanterns · metalware",
    intro: [
      "New Look Impex supplies brass decorative items and Indian handicrafts to retailers and importers in Spain. Our Moradabad-made collections — brass lanterns, urlis, decorative bowls and hammered copperware — serve Spanish home décor and gifting buyers.",
      "Every Spanish enquiry receives a written quotation covering specification, finish, quantity, packaging and shipping terms before production. We export from Moradabad, India with documentation handled per order.",
    ],
    bullets: [
      "Brass lanterns and decorative items for Spanish homeware buyers",
      "Copper drinkware and kitchenware for retail and gifting",
      "Hand-hammered urlis and bowls for decorative programmes",
      "Custom packaging and private label options quoted per enquiry",
      "Written quotations with MOQ, lead time and shipping terms confirmed before production",
    ],
    keywords: "brass decorative items wholesale Spain, Indian handicraft manufacturer Spain, brass lanterns wholesale Spain, copperware supplier Spain, metal home decor wholesale Spain",
    faqs: [
      ["Do you supply brass decorative items to Spain?", "Yes. We export handcrafted brass and copper products from Moradabad, India to buyers in Spain, quoted individually per order."],
      ["Are lanterns and décor available in custom sizes?", "Custom sizes and finishes are quoted per enquiry and confirmed in the written quotation."],
      ["Do you support private label programmes?", "Private labelling and custom packaging are quoted like any wholesale order."],
      ["How is the minimum order quantity set?", "MOQs vary by product and finish and are listed on each product page; custom and bulk quantities are quoted per enquiry."],
    ],
    categories: ["decorative-bowls", "copper-bottles", "copper-kitchenware"],
  },
  {
    slug: "belgium",
    name: "Belgium",
    h1: "Metal Home Accessories Wholesale & Indian Brass Handicrafts for Belgium",
    focus: "Wholesale home accessories",
    intro: [
      "New Look Impex supplies metal home accessories and Indian brass handicrafts to wholesalers and retailers in Belgium. Our Moradabad-made range — copper drinkware, brass décor, urlis and lanterns — serves Belgian homeware and gifting buyers.",
      "Every Belgian enquiry receives a written quotation covering specification, finish, quantity, packaging and shipping terms before production. We export from Moradabad, India with documentation handled per order.",
    ],
    bullets: [
      "Copper drinkware and kitchenware for Belgian homeware buyers",
      "Brass home accessories, bowls and urlis for retail programmes",
      "Hand-hammered handicrafts with finish options confirmed per order",
      "Custom packaging and private label options quoted per enquiry",
      "Written quotations with MOQ, lead time and shipping terms confirmed before production",
    ],
    keywords: "metal home accessories wholesale Belgium, Indian brass handicrafts Belgium, copperware wholesale Belgium, brass home decor supplier Belgium, Indian handicraft exporter Belgium",
    faqs: [
      ["Do you supply metal home accessories to Belgium?", "Yes. We export handcrafted brass and copper home accessories from Moradabad, India to buyers in Belgium, quoted individually."],
      ["Can orders mix copperware and brass décor?", "Yes. Mixed-category orders are quoted together — list your requirements in the enquiry."],
      ["Do you offer private label for Belgian retailers?", "Private labelling and custom packaging are quoted like any wholesale order."],
      ["How is the minimum order quantity set?", "MOQs vary by product and finish and are listed on each product page; custom and bulk quantities are quoted per enquiry."],
    ],
    categories: ["decorative-bowls", "copper-bottles", "copper-kitchenware"],
  },
  {
    slug: "poland",
    name: "Poland",
    h1: "Indian Metal Décor & Brass Handicrafts Wholesale for Poland",
    focus: "Metal décor · home accessories",
    intro: [
      "New Look Impex supplies Indian metal décor and brass handicrafts to wholesalers, distributors and retailers in Poland. Our Moradabad-made collections — brass décor, copper drinkware, urlis and lanterns — serve Polish homeware and gifting buyers.",
      "Every Polish enquiry receives a written quotation covering specification, finish, quantity, packaging and shipping terms before production. We export from Moradabad, India with documentation handled per order.",
    ],
    bullets: [
      "Brass home décor and decorative bowls for Polish retailers",
      "Copper bottles, jugs and drinkware for wholesale programmes",
      "Hand-hammered lanterns and festive items",
      "Custom packaging and private label options quoted per enquiry",
      "Written quotations with MOQ, lead time and shipping terms confirmed before production",
    ],
    keywords: "metal decor wholesale Poland, Indian brass handicrafts Poland, copperware supplier Poland, brass home decor wholesale Poland, Indian metal decor manufacturer Poland",
    faqs: [
      ["Do you supply metal décor to Poland?", "Yes. We export handcrafted brass and copper décor from Moradabad, India to buyers in Poland, quoted individually."],
      ["Can the finish be customised for Polish retailers?", "Finish options are confirmed in the written quotation; share your requirements in the enquiry."],
      ["Do you support private label programmes?", "Private labelling and custom packaging are quoted like any wholesale order."],
      ["How is the minimum order quantity set?", "MOQs vary by product and finish and are listed on each product page; custom and bulk quantities are quoted per enquiry."],
    ],
    categories: ["decorative-bowls", "copper-bottles", "copper-kitchenware"],
  },
  {
    slug: "sweden",
    name: "Sweden",
    h1: "Premium Metal Home Décor & Copperware Manufacturer for Sweden",
    focus: "Minimalist · premium home décor",
    intro: [
      "New Look Impex supplies premium metal home décor and copperware to retailers and design buyers in Sweden. Our Moradabad-made range — clean-lined brass décor, hammered copper drinkware and decorative bowls — suits buyers seeking artisan metal pieces for considered interiors.",
      "Every Swedish enquiry receives a written quotation covering specification, finish, quantity, packaging and shipping terms before production. We export from Moradabad, India with documentation handled per order.",
    ],
    bullets: [
      "Brass décor and decorative bowls for Swedish homeware buyers",
      "Hammered copper drinkware for premium retail collections",
      "Hand-hammered lanterns and accents for seasonal ranges",
      "Custom finishes and private label options quoted per enquiry",
      "Written quotations with MOQ, lead time and shipping terms confirmed before production",
    ],
    keywords: "premium metal home decor Sweden, Indian brass home decor supplier Sweden, copperware wholesale Sweden, brass decorative bowls Sweden, Indian handicraft exporter Sweden",
    faqs: [
      ["Do you supply metal home décor to Sweden?", "Yes. We export handcrafted brass and copper décor from Moradabad, India to buyers in Sweden, quoted individually."],
      ["Are understated finishes available for premium ranges?", "Finish options are discussed per enquiry and confirmed in the written quotation; nothing is assumed."],
      ["Do you offer private label for Swedish retailers?", "Private labelling and custom packaging are quoted like any wholesale order."],
      ["How is the minimum order quantity set?", "MOQs vary by product and finish and are listed on each product page; custom and bulk quantities are quoted per enquiry."],
    ],
    categories: ["decorative-bowls", "copper-bottles"],
  },
  {
    slug: "denmark",
    name: "Denmark",
    h1: "Scandinavian-Style Metal Décor & Brass Handicrafts for Denmark",
    focus: "Scandinavian-style metal décor",
    intro: [
      "New Look Impex supplies metal décor and brass handicrafts to retailers and design buyers in Denmark. Our Moradabad-made collections — brass bowls, copper drinkware and hand-hammered accents — serve Danish buyers looking for functional, artisan metal pieces.",
      "Every Danish enquiry receives a written quotation covering specification, finish, quantity, packaging and shipping terms before production. We export from Moradabad, India with documentation handled per order.",
    ],
    bullets: [
      "Brass bowls and decorative décor for Danish homeware buyers",
      "Copper drinkware for design-led retail collections",
      "Hand-hammered lanterns and functional accents",
      "Custom finishes and private label options quoted per enquiry",
      "Written quotations with MOQ, lead time and shipping terms confirmed before production",
    ],
    keywords: "Scandinavian metal decor Denmark, brass handicrafts wholesale Denmark, copperware supplier Denmark, brass decorative bowls Denmark, Indian handicraft exporter Denmark",
    faqs: [
      ["Do you supply metal décor to Denmark?", "Yes. We export handcrafted brass and copper décor from Moradabad, India to buyers in Denmark, quoted individually."],
      ["Can finishes suit a minimalist range?", "Finish and specification options are discussed per enquiry and confirmed in the written quotation."],
      ["Do you support private label programmes?", "Private labelling and custom packaging are quoted like any wholesale order."],
      ["How is the minimum order quantity set?", "MOQs vary by product and finish and are listed on each product page; custom and bulk quantities are quoted per enquiry."],
    ],
    categories: ["decorative-bowls", "copper-bottles", "copper-kitchenware"],
  },
  {
    slug: "austria",
    name: "Austria",
    h1: "Premium Handicrafts & Metal Home Décor Manufacturer for Austria",
    focus: "Premium handicrafts · home décor",
    intro: [
      "New Look Impex supplies premium handicrafts and metal home décor to retailers and importers in Austria. Our Moradabad-made range — hammered copperware, brass décor, urlis and lanterns — serves Austrian homeware and gifting buyers seeking handcrafted metal products.",
      "Every Austrian enquiry receives a written quotation covering specification, finish, quantity, packaging and shipping terms before production. We export from Moradabad, India with documentation handled per order.",
    ],
    bullets: [
      "Hammered copperware and drinkware for Austrian retail",
      "Brass décor, urlis and decorative bowls for homeware programmes",
      "Hand-hammered lanterns and festive accents",
      "Custom packaging and private label options quoted per enquiry",
      "Written quotations with MOQ, lead time and shipping terms confirmed before production",
    ],
    keywords: "premium handicrafts Austria, Indian brass home decor supplier Austria, copperware wholesale Austria, metal home decor manufacturer Austria, Indian handicraft exporter Austria",
    faqs: [
      ["Do you supply handicrafts to Austria?", "Yes. We export handcrafted brass and copper products from Moradabad, India to buyers in Austria, quoted individually."],
      ["Are custom finishes available for premium ranges?", "Finish options are confirmed in the written quotation; share your requirements in the enquiry."],
      ["Do you offer private label for Austrian retailers?", "Private labelling and custom packaging are quoted like any wholesale order."],
      ["How is the minimum order quantity set?", "MOQs vary by product and finish and are listed on each product page; custom and bulk quantities are quoted per enquiry."],
    ],
    categories: ["decorative-bowls", "copper-kitchenware", "copper-bottles"],
  },
  {
    slug: "switzerland",
    name: "Switzerland",
    h1: "Premium Brass & Copper Home Décor Manufacturer for Switzerland",
    focus: "Premium décor · luxury gifting",
    intro: [
      "New Look Impex supplies premium brass and copper home décor to retailers, interior designers and gifting buyers in Switzerland. Our Moradabad-made range — decorative bowls, urlis, lanterns and hammered copper pieces — suits buyers seeking handcrafted metal décor with refined finishes.",
      "Every Swiss enquiry receives an individual written quotation covering specification, finish, quantity, packaging and shipping terms before production. We export from Moradabad, India with documentation handled per order.",
    ],
    bullets: [
      "Brass décor, decorative bowls and urlis for Swiss homeware and interior buyers",
      "Hammered copper drinkware and serveware for premium retail collections",
      "Metal lanterns and accents for seasonal and gifting programmes",
      "Custom finishes and private label options quoted per enquiry",
      "Written quotations with MOQ, lead time and shipping terms confirmed before production",
    ],
    keywords: "premium brass home decor Switzerland, copperware supplier Switzerland, Indian handicrafts exporter Switzerland, brass decorative bowls wholesale Switzerland, luxury metal gifting Switzerland",
    faqs: [
      ["Do you supply brass and copper décor to Switzerland?", "Yes. We export handcrafted brass and copper décor from Moradabad, India to buyers in Switzerland, quoted individually per order."],
      ["Are refined finishes available for premium ranges?", "Finish options are discussed per enquiry and confirmed in the written quotation; nothing is assumed."],
      ["Do you offer private label for Swiss retailers?", "Private labelling and custom packaging are quoted like any wholesale order."],
      ["How is the minimum order quantity set?", "MOQs vary by product and finish and are listed on each product page; custom and bulk quantities are quoted per enquiry."],
    ],
    categories: ["decorative-bowls", "copper-bottles"],
  },
];

export const EUROPE_SLUGS = EUROPE_COUNTRIES.map((c) => c.slug);

export function getEuropeCountry(slug: string): EuropeCountry | undefined {
  return EUROPE_COUNTRIES.find((c) => c.slug === slug);
}
