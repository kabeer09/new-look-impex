export interface CountryConfig {
  slug: string;
  name: string;
  h1: string;
  intro: string[];
  bullets: string[];
  categories: string[];
  faqs: [string, string][];
  keywords: string;
}

export const COUNTRIES: Record<string, CountryConfig> = {
  uk: {
    slug: "uk",
    name: "United Kingdom",
    h1: "Wholesale Copper & Brassware Manufacturer & Exporter UK",
    intro: [
      "New Look Impex supplies premium hand-hammered copper and brass kitchenware, drinkware and home décor to wholesale buyers across the United Kingdom. As a Moradabad-based manufacturer and exporter, we supply copper water bottles, brass kitchenware, urlis, diyas, lanterns and festive gifting sets to retailers, importers, distributors and corporate buying programmes throughout England, Scotland, Wales and Northern Ireland.",
      "Every order is quoted individually in writing — product specifications, finish options, quantity, packaging and shipping terms are confirmed before production. We handle export documentation and ship from Moradabad, India to the UK with reliable logistics.",
    ],
    bullets: [
      "Copper water bottles, jugs, tumblers and drinkware for UK retail and gifting markets",
      "Brass cookware, utensils, dinnerware and serveware for UK homeware retailers",
      "Hand-hammered brass urlis, diyas, lanterns and festive décor for seasonal gifting programmes",
      "Custom packaging and private label options for UK retailers and importers",
      "Written quotations with MOQ, lead time and shipping terms confirmed before production",
    ],
    categories: ["copper-bottles", "copper-kitchenware", "brass-kitchenware", "decorative-bowls"],
    faqs: [
      ["Do you ship copper and brassware to the UK?", "Yes. We export handcrafted copper and brass products from Moradabad, India to buyers across the United Kingdom. Every order is quoted individually with shipping, customs documentation and delivery terms confirmed before production."],
      ["What is the minimum order quantity for UK buyers?", "MOQs vary by product and finish. Each product page lists its MOQ; custom and bulk quantities are quoted per enquiry."],
      ["Can you provide custom packaging for UK retail?", "Yes. We offer custom packaging options including gift boxes and private labelling for UK retail buyers. Discuss your requirements when requesting a quote."],
      ["How long does shipping to the UK take?", "Shipping times depend on order size and destination. We confirm delivery timelines in your written quotation before production begins."],
    ],
    keywords: "copperware wholesale UK, brassware manufacturer India UK, copper kitchenware wholesale UK, brass cookware supplier UK, copper bottle bulk supplier UK, brass cutlery wholesale UK, Indian copper utensils exporter UK, copper and brass kitchenware distributor UK",
  },
  uae: {
    slug: "uae",
    name: "United Arab Emirates",
    h1: "Wholesale Copper & Brassware UAE — Manufacturer & Exporter",
    intro: [
      "New Look Impex supplies hand-hammered copper and brass products to retailers, hospitality groups and gifting companies across the United Arab Emirates. From copper drinkware and brass kitchenware to festive urlis, diyas and lanterns, our Moradabad-made collections serve Dubai, Abu Dhabi, Sharjah and all Emirates.",
      "Every UAE enquiry receives a written quotation with product specifications, finish options, quantity, packaging and shipping terms confirmed before production. We handle export documentation and ship from Moradabad, India to the UAE with reliable logistics.",
    ],
    bullets: [
      "Gift-boxed copper jug and bottle sets for Ramadan, Eid and corporate gifting programmes",
      "Hammered brass serveware and pitchers for hotel tabletop and majlis styling",
      "Brass urlis, diyas and lanterns for festive and decorative programmes",
      "Custom packaging and private label options for UAE retailers and corporate buyers",
      "Written quotations with MOQ, lead time and shipping terms confirmed before production",
    ],
    categories: ["copper-bottles", "copper-jugs-pitchers", "brass-kitchenware", "copper-kitchenware", "decorative-bowls"],
    faqs: [
      ["Do you ship copper and brassware to the UAE?", "Yes. We export handcrafted copper and brass products from Moradabad, India to buyers across the UAE including Dubai, Abu Dhabi, Sharjah and all Emirates. Every order receives a written quotation with shipping and documentation details."],
      ["What is the MOQ for UAE buyers?", "MOQs vary by product and finish. Each product page lists its MOQ; custom and bulk quantities are quoted per enquiry."],
      ["Can you provide custom packaging for UAE retail?", "Yes. We offer custom packaging options including gift boxes and private labelling for UAE retailers and corporate buyers. Discuss your requirements when requesting a quote."],
      ["Do you ship to all Emirates?", "Yes, we ship to Dubai, Abu Dhabi, Sharjah, Ajman, Fujairah, Ras Al Khaimah and Umm Al Quwain. Shipping terms are confirmed per order."],
    ],
    keywords: "copper bottle wholesale UAE, brass kitchenware supplier UAE, copperware exporter India UAE, brassware wholesale Dubai, copper utensils supplier Abu Dhabi, brass cookware distributor UAE, copper kitchen accessories wholesale UAE",
  },
  usa: {
    slug: "usa",
    name: "United States",
    h1: "Wholesale Copper & Brassware Manufacturer — USA Exporter",
    intro: [
      "New Look Impex supplies hand-hammered copper and brass products to retailers, wholesalers and importers across the United States. From copper drinkware and kitchenware to brass serveware and festive décor, our Moradabad-made collections serve American retailers, interior designers and corporate gifting programmes.",
      "Every US enquiry receives a written quotation with product specifications, finish options, quantity, packaging and shipping terms confirmed before production. We handle export documentation and ship from Moradabad, India to the USA with reliable logistics.",
    ],
    bullets: [
      "Copper water bottles, pitchers and drinkware for US retail and gift markets",
      "Brass cookware, utensils and dinnerware for US homeware retailers",
      "Hand-hammered brass urlis, diyas and lanterns for festive and temple markets",
      "Custom packaging and private label options for US retailers and importers",
      "Written quotations with MOQ, lead time and shipping terms confirmed before production",
    ],
    categories: ["copper-bottles", "copper-kitchenware", "brass-kitchenware", "decorative-bowls"],
    faqs: [
      ["Do you ship copper and brassware to the USA?", "Yes. We export handcrafted copper and brass products from Moradabad, India to buyers across the United States. Every order receives a written quotation with shipping and documentation details."],
      ["What is the MOQ for US buyers?", "MOQs vary by product and finish. Each product page lists its MOQ; custom and bulk quantities are quoted per enquiry."],
      ["Can you provide custom packaging for US retail?", "Yes. We offer custom packaging options including gift boxes and private labelling for US retailers and importers. Discuss your requirements when requesting a quote."],
      ["How long does shipping to the USA take?", "Shipping times depend on order size and destination. We confirm delivery timelines in your written quotation before production."],
    ],
    keywords: "copperware wholesale USA, Indian brassware supplier USA, copper kitchenware manufacturer India USA, brass cookware wholesale USA, copper bottles bulk supplier USA, brass cutlery distributor USA, copper utensils exporter India USA",
  },
  au: {
    slug: "au",
    name: "Australia",
    h1: "Wholesale Copper & Brassware Australia — Manufacturer & Exporter",
    intro: [
      "New Look Impex supplies hand-hammered copper and brass products to retailers, wholesalers and importers across Australia. From copper drinkware and brass kitchenware to festive urlis and lanterns, our Moradabad-made collections serve Australian retailers, importers and corporate gifting programmes.",
      "Every Australian enquiry receives a written quotation with product specifications, finish options, quantity, packaging and shipping terms confirmed before production. We handle export documentation and ship from Moradabad, India to Australia with reliable logistics.",
    ],
    bullets: [
      "Copper water bottles, jugs, tumblers and drinkware for Australian retail and gifting markets",
      "Brass cookware, utensils and dinnerware for Australian homeware retailers",
      "Hand-hammered brass urlis, diyas and lanterns for festive and temple markets",
      "Custom packaging and private label options for Australian retailers and importers",
      "Written quotations with MOQ, lead time and shipping terms confirmed before production",
    ],
    categories: ["copper-bottles", "copper-kitchenware", "brass-kitchenware", "decorative-bowls"],
    faqs: [
      ["Do you ship copper and brassware to Australia?", "Yes. We export handcrafted copper and brass products from Moradabad, India to buyers across Australia. Every order receives a written quotation with shipping and documentation details."],
      ["What is the MOQ for Australian buyers?", "MOQs vary by product and finish. Each product page lists its MOQ; custom and bulk quantities are quoted per enquiry."],
      ["Can you provide custom packaging for Australian retail?", "Yes. We offer custom packaging options including gift boxes and private labelling for Australian retailers and importers. Discuss your requirements when requesting a quote."],
      ["How long does shipping to Australia take?", "Shipping times depend on order size and destination. We confirm delivery timelines in your written quotation before production."],
    ],
    keywords: "copperware wholesale Australia, brass kitchenware supplier Australia, copper bottles bulk Australia, Indian brassware exporter Australia, copper utensils wholesale Australia, brass cookware supplier Melbourne, copper kitchenware distributor Sydney",
  },
  canada: {
    slug: "canada",
    name: "Canada",
    h1: "Wholesale Copper & Brassware Canada — Manufacturer & Exporter",
    intro: [
      "New Look Impex supplies hand-hammered copper and brass products to retailers, importers and wholesalers across Canada. From copper drinkware and brass kitchenware to festive urlis and lanterns, our Moradabad-made collections serve Canadian retailers, wholesalers and corporate gifting programmes.",
      "Every Canadian enquiry receives a written quotation with product specifications, finish options, quantity, packaging and shipping terms confirmed before production. We handle export documentation and ship from Moradabad, India to Canada with reliable logistics.",
    ],
    bullets: [
      "Copper water bottles, jugs, tumblers and drinkware for Canadian retail and gifting markets",
      "Brass cookware, utensils and dinnerware for Canadian homeware retailers",
      "Hand-hammered brass urlis, diyas and lanterns for festive and decorative markets",
      "Custom packaging and private label options for Canadian retailers and importers",
      "Written quotations with MOQ, lead time and shipping terms confirmed before production",
    ],
    categories: ["copper-bottles", "copper-kitchenware", "brass-kitchenware", "decorative-bowls"],
    faqs: [
      ["Do you ship copper and brassware to Canada?", "Yes. We export handcrafted copper and brass products from Moradabad, India to buyers across Canada. Every order receives a written quotation with shipping and documentation details."],
      ["What is the MOQ for Canadian buyers?", "MOQs vary by product and finish. Each product page lists its MOQ; custom and bulk quantities are quoted per enquiry."],
      ["Can you provide custom packaging for Canadian retail?", "Yes. We offer custom packaging options including gift boxes and private labelling for Canadian retailers and importers. Discuss your requirements when requesting a quote."],
      ["How long does shipping to Canada take?", "Shipping times depend on order size and destination. We confirm delivery timelines in your written quotation before production."],
    ],
    keywords: "copperware wholesale Canada, brassware manufacturer India Canada, copper kitchenware bulk supplier Canada, copper bottle wholesale Toronto, brass utensils supplier Vancouver, brass cookware wholesale Canada, Indian copperware exporter Canada",
  },
  europe: {
    slug: "europe",
    name: "Europe",
    h1: "Wholesale Copper & Brassware Europe — Manufacturer & Exporter",
    intro: [
      "New Look Impex supplies hand-hammered copper and brass products to retailers, wholesalers and importers across Europe. From copper drinkware and brass kitchenware to festive urlis, diyas and lanterns, our Moradabad-made collections serve European retailers, interior designers and corporate gifting programmes.",
      "Every European enquiry receives a written quotation with product specifications, finish options, quantity, packaging and shipping terms confirmed before production. We handle export documentation and ship from Moradabad, India to Europe with reliable logistics.",
    ],
    bullets: [
      "Copper water bottles, jugs, tumblers and drinkware for European retail and gifting markets",
      "Brass cookware, utensils and dinnerware for European homeware retailers",
      "Hand-hammered brass urlis, diyas and lanterns for festive and temple markets",
      "Custom packaging and private label options for European retailers and importers",
      "Written quotations with MOQ, lead time and shipping terms confirmed before production",
    ],
    categories: ["copper-bottles", "copper-kitchenware", "brass-kitchenware", "decorative-bowls"],
    faqs: [
      ["Do you ship copper and brassware to Europe?", "Yes. We export handcrafted copper and brass products from Moradabad, India to buyers across Europe. Every order receives a written quotation with shipping and documentation details."],
      ["What is the MOQ for European buyers?", "MOQs vary by product and finish. Each product page lists its MOQ; custom and bulk quantities are quoted per enquiry."],
      ["Can you provide custom packaging for European retail?", "Yes. We offer custom packaging options including gift boxes and private labelling for European retailers and importers. Discuss your requirements when requesting a quote."],
      ["How long does shipping to Europe take?", "Shipping times depend on order size and destination. We confirm delivery timelines in your written quotation before production."],
    ],
    keywords: "copperware wholesale Europe, brassware manufacturer India Europe, copper kitchenware wholesale Germany, brass kitchenware wholesale Netherlands, copper bottle importer France, brass cookware supplier Italy, Indian copper utensils exporter Europe, brass cutlery wholesale EU",
  },
  "saudi-arabia": {
    slug: "saudi-arabia",
    name: "Saudi Arabia",
    h1: "Wholesale Copper & Brassware Manufacturer & Exporter Saudi Arabia",
    intro: [
      "New Look Impex supplies hand-hammered copper and brass products to retailers, hospitality groups and gifting companies across the Kingdom of Saudi Arabia. From gift-boxed copper drinkware and brass serveware to lanterns, urlis and festive décor, our Moradabad-made collections serve buyers in Riyadh, Jeddah, Dammam, Makkah, Madinah and across the Kingdom.",
      "Every Saudi enquiry receives a written quotation covering product specifications, finish options, quantity, packaging and shipping terms before production. We handle export documentation and ship from Moradabad, India, with all terms confirmed in writing.",
    ],
    bullets: [
      "Gift-boxed copper bottle and jug sets for Ramadan, Eid and corporate gifting programmes",
      "Brass lanterns, urlis and decorative pieces for majlis and hospitality styling",
      "Hammered brass serveware and tabletop pieces for hotels and restaurants",
      "Custom packaging and private label options for Saudi retailers and corporate buyers",
      "Written quotations with MOQ, lead time and shipping terms confirmed before production",
    ],
    categories: ["copper-bottles", "brass-kitchenware", "copper-kitchenware", "decorative-bowls"],
    faqs: [
      ["Do you ship copper and brassware to Saudi Arabia?", "Yes. We export handcrafted copper and brass products from Moradabad, India to buyers across the Kingdom of Saudi Arabia. Every order receives a written quotation with shipping and documentation details."],
      ["Can you supply gifting for Ramadan and Eid?", "Yes. Gift-boxed copper and brass sets, lanterns and decorative pieces are quoted for seasonal and corporate gifting programmes. Share your requirements in the enquiry."],
      ["Do you offer custom packaging for Saudi retailers?", "Yes. Custom packaging and private labelling are quoted like any wholesale order; packaging options are confirmed in the written quotation."],
      ["What is the minimum order quantity for Saudi buyers?", "MOQs vary by product and finish. Each product page lists its MOQ; custom and bulk quantities are quoted per enquiry."],
    ],
    keywords: "copperware wholesale Saudi Arabia, brassware supplier Saudi Arabia, copper bottles wholesale Riyadh, brass lanterns supplier Jeddah, brass serveware wholesale KSA, gift sets wholesale Saudi Arabia, Indian handicrafts exporter Saudi Arabia",
  },
  japan: {
    slug: "japan",
    name: "Japan",
    h1: "Handcrafted Brass & Copperware Manufacturer for Japan",
    intro: [
      "New Look Impex supplies handcrafted brass and copperware to retailers, design studios and gift buyers in Japan. Our Moradabad-made range — clean-lined brass décor, hammered copper drinkware, decorative bowls and urlis — suits buyers looking for artisan metal pieces with considered, understated finishes.",
      "Every Japanese enquiry receives an individual written quotation covering specification, finish, quantity, packaging and shipping terms before production. We export from Moradabad, India with documentation handled per order.",
    ],
    bullets: [
      "Minimalist brass décor, bowls and urlis for Japanese homeware and lifestyle retailers",
      "Hand-hammered copper drinkware and kitchenware for premium retail collections",
      "Small decorative accents and gift items for seasonal and gifting programmes",
      "Custom finishes and packaging quoted per enquiry",
      "Written quotations with MOQ, lead time and shipping terms confirmed before production",
    ],
    categories: ["decorative-bowls", "copper-bottles", "copper-kitchenware"],
    faqs: [
      ["Do you supply brass and copperware to Japan?", "Yes. We export handcrafted brass and copper products from Moradabad, India to buyers in Japan, quoted individually per order."],
      ["Are understated finishes available for Japanese retailers?", "Finish and specification options are discussed per enquiry and confirmed in the written quotation; nothing is assumed."],
      ["Can you support small gift and lifestyle items?", "Yes. Share the product types and quantities you need and we will quote them together in one written quotation."],
      ["How is the minimum order quantity set?", "MOQs vary by product and finish and are listed on each product page; custom and bulk quantities are quoted per enquiry."],
    ],
    keywords: "handcrafted brassware supplier Japan, copperware wholesale Japan, minimalist brass decor Japan, Indian metal handicrafts exporter Japan, brass bowls wholesale Japan, hammered copper drinkware supplier Japan",
  },
  singapore: {
    slug: "singapore",
    name: "Singapore",
    h1: "Wholesale Brass & Copper Décor Supplier for Singapore",
    intro: [
      "New Look Impex supplies handcrafted brass and copper décor to retailers, hospitality groups and corporate gifting buyers in Singapore. Our Moradabad-made collections — brass lanterns, decorative bowls, urlis and hammered copperware — serve buyers looking for distinctive metal pieces for retail, hotels and gifting programmes.",
      "Every Singapore enquiry receives an individual written quotation covering specification, finish, quantity, packaging and shipping terms before production. We export from Moradabad, India with documentation handled per order.",
    ],
    bullets: [
      "Brass lanterns, urlis and decorative pieces for Singapore homeware and hospitality buyers",
      "Hammered copper drinkware and serveware for retail and gifting collections",
      "Corporate gifting options with custom packaging and private labelling quoted per enquiry",
      "Mixed-category orders quoted together for distributors and importers",
      "Written quotations with MOQ, lead time and shipping terms confirmed before production",
    ],
    categories: ["decorative-bowls", "copper-kitchenware", "copper-bottles"],
    faqs: [
      ["Do you supply brass and copper décor to Singapore?", "Yes. We export handcrafted brass and copper products from Moradabad, India to buyers in Singapore, quoted individually per order."],
      ["Can you support hospitality and corporate gifting orders?", "Yes. Hospitality tabletop pieces and gift-boxed sets are quoted per enquiry with packaging options confirmed in writing."],
      ["Do you offer private label for Singapore retailers?", "Private labelling and custom packaging are quoted like any wholesale order."],
      ["How is the minimum order quantity set?", "MOQs vary by product and finish and are listed on each product page; custom and bulk quantities are quoted per enquiry."],
    ],
    keywords: "brass decor wholesale Singapore, copperware supplier Singapore, brass lanterns wholesale Singapore, corporate gifting supplier Singapore, Indian handicrafts exporter Singapore, metal home decor wholesale Singapore",
  },
};