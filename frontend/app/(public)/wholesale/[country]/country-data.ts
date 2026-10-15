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
  usa: {
    slug: "usa",
    name: "United States",
    h1: "Wholesale Copper Products for USA Buyers",
    intro: [
      "New Look Impex supplies hammered copper drinkware and brass kitchenware to retail, hospitality and gifting buyers across the United States. Our copper bottles, jugs, tumblers and barware suit home-goods stores, bottle shops, yoga and wellness retailers, and hotel minibar and tabletop programmes.",
      "Every order is quoted individually in writing — product, finish, quantity, packaging and shipping terms — before anything is committed. There are no published prices, no stock guarantees and no blanket delivery promises: terms are confirmed per order for US destinations.",
    ],
    bullets: [
      "Copper bottles, jugs, tumblers and barware in hammered, matte and diamond-cut finishes",
      "Gift-boxed jug and bottle sets for corporate and festive gifting programmes",
      "Brass kadai cookware, mortar and pestle for speciality kitchenware assortments",
      "Written quotations with MOQ, lead time and packaging confirmed per order",
    ],
    categories: ["copper-bottles", "copper-jugs-pitchers", "copper-mugs-tumblers", "copper-kitchenware"],
    faqs: [
      ["How do US wholesale orders work?", "Add products to an enquiry list or submit a request for quotation with quantities and your US delivery state. We reply with a written quote covering price, MOQ, lead time, packaging and shipping terms."],
      ["Do you hold stock in the USA?", "No. All products are made to order in Moradabad, India, and shipped per order. We do not claim US warehousing, local stock or fixed transit times."],
      ["Can we request custom finishes or gift packaging?", "Yes — customisation and gift-box presentation are quoted like any wholesale order. Describe your brief in the enquiry form."],
    ],
    keywords: "copper bottles wholesale USA, copper drinkware importer USA, brass kitchenware wholesale",
  },
  uk: {
    slug: "uk",
    name: "United Kingdom",
    h1: "Wholesale Copper & Brass Décor for UK Buyers",
    intro: [
      "New Look Impex works with home and gift retailers, garden centres and hospitality buyers across the United Kingdom. Copper drinkware suits the UK's strong gifting seasons — Christmas, Diwali and wedding lists — while brass kitchenware fits speciality cookshops and farm-shop assortments.",
      "Quotations are prepared per order for UK destinations, covering product, finish, quantity, packaging and shipping in writing. We make no claims about UK stock, local delivery networks or fixed lead times.",
    ],
    bullets: [
      "Copper bottles and tumblers for gift, home and department-store assortments",
      "Brass kadai, mortar and pestle for speciality kitchenware ranges",
      "Gift-boxed jug and bottle sets for Christmas and Diwali gifting",
      "Per-order written quotes: price, MOQ, lead time and packaging",
    ],
    categories: ["copper-bottles", "copper-mugs-tumblers", "brass-kitchenware", "copper-jugs-pitchers"],
    faqs: [
      ["How do UK wholesale orders work?", "Submit an enquiry list or RFQ with quantities and your UK delivery postcode area. We confirm price, MOQ, lead time, packaging and shipping in writing before production."],
      ["Do you stock products in the UK?", "No. Products are made to order in Moradabad, India. We do not operate UK warehousing or fixed delivery schedules."],
      ["Are your products suitable for gift retailers?", "Yes — gift-boxed presentation is available on jug and bottle sets, quoted per order with your quantities and timelines."],
    ],
    keywords: "copper bottles wholesale UK, brass home décor wholesale UK, Indian handicrafts wholesale UK",
  },
  uae: {
    slug: "uae",
    name: "United Arab Emirates",
    h1: "Wholesale Copper & Brass for UAE Buyers",
    intro: [
      "New Look Impex supplies copper drinkware and brass serveware to retailers, hospitality groups and gifting companies in the United Arab Emirates. Gift-boxed jug and bottle sets suit Ramadan, Eid, Diwali and corporate gifting programmes, while hammered serveware fits hotel tabletop and majlis styling.",
      "Each UAE enquiry receives a written per-order quotation covering product, finish, quantity, packaging and shipping. We do not claim local offices, UAE stock or guaranteed delivery dates.",
    ],
    bullets: [
      "Gift-boxed copper jug and bottle sets for Ramadan, Eid and corporate gifting",
      "Hammered serveware and pitchers for hospitality tabletop programmes",
      "Brass kadai and kitchen pieces for speciality retail",
      "Written per-order quotes with MOQ, lead time and packaging",
    ],
    categories: ["copper-jugs-pitchers", "copper-bottles", "brass-kitchenware", "corporate-gifting"],
    faqs: [
      ["How do UAE wholesale orders work?", "Send an enquiry with products, quantities and emirate. We reply with a written quote covering price, MOQ, lead time, packaging and shipping terms."],
      ["Do you have a UAE office or warehouse?", "No. We operate from Moradabad, India, and ship per order. We make no claim of local presence or stock."],
      ["Can you support large corporate gifting orders?", "Yes — gift-boxed sets are quoted per order against your quantities and event dates. Share timelines early so they can be confirmed in writing."],
    ],
    keywords: "copper gifts wholesale UAE, brass décor supplier UAE, corporate gifting supplier",
  },
  australia: {
    slug: "australia",
    name: "Australia",
    h1: "Wholesale Copper Homeware for Australian Buyers",
    intro: [
      "New Look Impex supplies copper drinkware and brass home décor to Australian homewares stores, gift shops and outdoor-living retailers. Copper bottles and tumblers suit active, design-led assortments, while pitchers and serveware fit entertaining and tabletop ranges.",
      "Australian orders are quoted per order in writing — product, finish, quantity, packaging and shipping — with timelines confirmed before production. We hold no Australian stock and promise no fixed transit times.",
    ],
    bullets: [
      "Copper bottles, tumblers and pitchers for homewares and gift assortments",
      "Diamond-cut and hammered finishes for design-led ranges",
      "Brass kitchen pieces for speciality cookshops",
      "Per-order written quotes with MOQ, lead time and packaging",
    ],
    categories: ["copper-bottles", "copper-mugs-tumblers", "copper-jugs-pitchers", "brass-kitchenware"],
    faqs: [
      ["How do Australian wholesale orders work?", "Submit an RFQ with quantities and your delivery city. We confirm price, MOQ, lead time, packaging and shipping in writing before anything is committed."],
      ["Do you stock products in Australia?", "No. Everything is made to order in Moradabad, India, and shipped per order."],
      ["Which products suit outdoor and entertaining ranges?", "Copper pitchers, tumblers and barware photograph well for outdoor-living assortments — request the catalogue to review the current range."],
    ],
    keywords: "copper bottles wholesale Australia, brass home décor supplier Australia, Indian handicrafts wholesale",
  },
  canada: {
    slug: "canada",
    name: "Canada",
    h1: "Wholesale Copper Products for Canadian Buyers",
    intro: [
      "New Look Impex works with Canadian gift, home and wellness retailers on copper drinkware and brass décor assortments. Bottles and tumblers suit holiday gifting peaks, while pitchers and serveware fit tabletop and entertaining ranges from Toronto to Vancouver.",
      "Canadian enquiries receive written per-order quotations covering product, finish, quantity, packaging and shipping. We claim no Canadian warehousing, local stock or fixed delivery schedules.",
    ],
    bullets: [
      "Copper bottles and tumblers for gift and wellness assortments",
      "Gift-boxed sets for holiday and corporate gifting peaks",
      "Pitchers and serveware for tabletop and entertaining ranges",
      "Written per-order quotes with MOQ, lead time and packaging",
    ],
    categories: ["copper-bottles", "copper-mugs-tumblers", "copper-jugs-pitchers", "corporate-gifting"],
    faqs: [
      ["How do Canadian wholesale orders work?", "Send an enquiry list or RFQ with quantities and province. We reply with a written quote covering price, MOQ, lead time, packaging and shipping terms."],
      ["Do you hold stock in Canada?", "No. Products ship per order from Moradabad, India. Plan seasonal gifting orders early so timelines can be confirmed in writing."],
      ["Can packaging be customised for retail?", "Gift-box presentation is available on selected sets and custom requests are quoted like any wholesale order."],
    ],
    keywords: "copper bottles wholesale Canada, Indian home décor wholesaler Canada, corporate gifting supplier",
  },
};


export const COUNTRY_SLUGS = Object.keys(COUNTRIES);
