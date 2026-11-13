/**
 * Blog article data — single source of truth for /blog (index) and
 * /blog/[slug] (detail). Both pages import from here so titles, descriptions
 * and dates can never drift between listing and detail views.
 *
 * Rules for this file:
 * - Original content only. Never copy competitor text.
 * - No banned claims: certifications, food-safe, "made in India", dishwasher/
 *   microwave safety, pure/100% copper, guarantees, superlatives (#1/Top/Best),
 *   factory-direct, invented lead times, prices or capacities.
 * - Commercial answers must match the real policies: RFQ-only pricing
 *   (/request-quote), shipping quoted per order (/shipping-export), terms (/terms).
 * - Every post links to real, existing internal pages and ends with an
 *   enquiry CTA rendered by the detail page.
 */

export type BlogLink = { label: string; href: string; blurb: string };
export type BlogSection = { h2: string; paras: string[] };

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  /** ISO date shown on the index card and used as datePublished in schema. */
  date: string;
  sections: BlogSection[];
  /** Contextual internal links (product categories + service pages). */
  links: BlogLink[];
};

export const POSTS: BlogPost[] = [
  {
    slug: "sourcing-brass-decor-moradabad",
    title: "How to Source Brass & Copper Décor from Moradabad: A Buyer's Guide",
    description:
      "Moradabad is India's brass and copper handicraft capital. Learn how to find reliable manufacturers, evaluate quality, and place wholesale orders with confidence.",
    date: "2026-01-15",
    sections: [
      {
        h2: "Why buyers source from Moradabad",
        paras: [
          "Moradabad, Uttar Pradesh, is known as the brass city of India — a centre for handcrafted metalware with centuries of craft tradition. Buyers worldwide source urlis, diyas, lanterns, bottles, kitchenware and home décor from Moradabad manufacturers.",
          "For a first-time buyer, the advantage is range: brass and copper pieces across décor, kitchenware, drinkware and gifting can be consolidated with one cluster of suppliers, which simplifies sampling, packing and freight.",
        ],
      },
      {
        h2: "How to find the right manufacturer",
        paras: [
          "Start by identifying the product range you need: copper drinkware, brass kitchenware, decorative urlis, or gifting sets. Shortlist suppliers whose published catalogue actually covers those categories, then request SKU-level details including material, finish, dimensions, weight, MOQ and packaging.",
          "Ask how each product is produced and finished, which processes are handled in-house and which come from partner workshops. A supplier that answers this clearly is easier to plan a repeat programme with.",
        ],
      },
      {
        h2: "Evaluating quality before you commit",
        paras: [
          "Always request samples before committing to bulk orders. Check finish consistency across pieces, weight against the stated specification, engraving detail, and how the product is packed for transit.",
          "Confirm lead times, export packaging standards, and whether customisation (size, finish, private label) is available for the designs you selected. Keep a written record of the specification you approved — it becomes the reference for production.",
        ],
      },
      {
        h2: "Placing the order",
        paras: [
          "Get everything in writing: price, MOQ, lead time, packaging and shipping terms. New Look Impex quotes every wholesale order individually through a written quotation — submit your list through the RFQ form and you receive a reference number covering those terms.",
          "Once the quotation is agreed, confirm the packing list, documentation and delivery route for your destination before production starts.",
        ],
      },
    ],
    links: [
      { label: "Brass collection", href: "/brass-collection", blurb: "The full wholesale brass range" },
      { label: "Copper collection", href: "/copper-collection", blurb: "Wholesale copper products in one view" },
      { label: "Custom manufacturing", href: "/customisation", blurb: "Sizes, finishes and private label to your brief" },
      { label: "Request a wholesale quote", href: "/request-quote", blurb: "Written quotation with price, MOQ and lead time" },
    ],
  },
  {
    slug: "copper-vs-brass-homeware",
    title: "Copper vs Brass Homeware: Which Is Right for Your Store?",
    description:
      "Understanding the differences between copper and brass — appearance, maintenance, and customer appeal — to make better sourcing decisions.",
    date: "2026-01-20",
    sections: [
      {
        h2: "Appearance and market positioning",
        paras: [
          "Copper and brass are both popular metals for home décor, but they serve different markets. Copper has a warm reddish tone and is often associated with wellness and hydration (copper bottles). Brass has a golden hue and suits traditional and festive décor.",
          "Copper drinkware — bottles, jugs, tumblers — appeals to health-conscious and design-led customers. Brass items — diyas, urlis, lanterns — suit festive, traditional and gifting markets.",
        ],
      },
      {
        h2: "Care and maintenance",
        paras: [
          "Maintenance differs: copper develops a patina over time (some buyers prefer this look), while brass can be polished to maintain its golden shine. Both are durable, long-lasting materials with no moving parts — a simple story to tell customers at the shelf.",
          "Care instructions vary by finish, so ask your supplier for the correct guidance for each SKU and include it with the product. That small detail reduces after-sales questions.",
        ],
      },
      {
        h2: "Choosing for your assortment",
        paras: [
          "For wholesale buyers, the choice depends on your customer base and price point — many retailers carry both metals side by side. A practical approach: copper for drinkware and kitchen categories, brass for festive, pooja and decorative ranges.",
          "Compare the two collections side by side before ordering. Request a quote with mixed quantities across both metals — mixed orders are quoted as one programme.",
        ],
      },
    ],
    links: [
      { label: "Copper collection", href: "/copper-collection", blurb: "Bottles, jugs, kitchenware and more" },
      { label: "Brass collection", href: "/brass-collection", blurb: "Diyas, urlis, lanterns and décor" },
      { label: "Copper bottles", href: "/copper-bottles", blurb: "Wholesale drinkware range" },
      { label: "Request a wholesale quote", href: "/request-quote", blurb: "Written quotation for mixed orders" },
    ],
  },
  {
    slug: "wholesale-ordering-checklist",
    title: "Wholesale Sourcing Checklist: Questions to Ask Your Handicraft Supplier",
    description:
      "Before placing a bulk order, confirm MOQ, samples, specifications, packaging, lead time, and written quotations. A practical checklist for B2B buyers.",
    date: "2026-01-25",
    sections: [
      {
        h2: "Before you enquire",
        paras: [
          "A little preparation makes the first exchange with any supplier much faster. Have ready: the product categories you need, rough quantities per design, target ship date, destination port or address, and any branding or packaging requirements.",
          "With that list, a supplier can respond with a real quotation instead of a round of clarifying questions — and you can compare offers like for like.",
        ],
      },
      {
        h2: "The checklist: what to confirm",
        paras: [
          "1. Minimum Order Quantity (MOQ) — varies by product and finish.",
          "2. Samples — availability, cost, and lead time for samples before bulk production.",
          "3. Specifications — material, dimensions, weight, finish, and any documentation relevant to your market.",
          "4. Packaging — export packaging standards, gift-box options, and labelling.",
          "5. Lead time — production time from order confirmation to shipment.",
          "6. Written quotation — price, MOQ, lead time, packaging, and shipping terms in writing.",
          "7. Customisation — whether sizes, finishes, or private labelling are available.",
        ],
      },
      {
        h2: "After the quotation arrives",
        paras: [
          "Compare quotations on the same basis: quantity assumed, packaging included, freight terms, and what happens if the specification changes. Ask which document set accompanies the shipment (commercial invoice, packing list, and any certificate of origin required by your market).",
          "New Look Impex provides written per-order quotations covering all of the above, and the shipping page explains how freight is arranged for each destination.",
        ],
      },
    ],
    links: [
      { label: "Request a wholesale quote", href: "/request-quote", blurb: "Submit your list, get a written quotation" },
      { label: "Shipping & export", href: "/shipping-export", blurb: "How freight and documentation work" },
      { label: "Bulk orders", href: "/bulk-orders", blurb: "Planning a larger quantity programme" },
      { label: "Terms of supply", href: "/terms", blurb: "Commercial terms in plain language" },
    ],
  },
  {
    slug: "seasonal-gifting-programme",
    title: "Planning a Seasonal Gifting Programme with Indian Handicrafts",
    description:
      "What to confirm early when sourcing décor for festive or corporate gifting: quantities, finishes, packaging, and timelines.",
    date: "2026-02-01",
    sections: [
      {
        h2: "Work backwards from your event date",
        paras: [
          "Seasonal gifting — Diwali, Christmas, Eid, corporate events — requires early planning. Start by identifying your product range: diyas, lanterns, urlis, or gift-boxed sets, then fix the date the gifts must be in your customers' hands.",
          "From that date, allow time for sampling, production, packing, freight and customs. Confirm quantities and timelines with your supplier well in advance — gift-box presentation, custom branding and special packaging should all be discussed during the enquiry stage, not after production starts.",
        ],
      },
      {
        h2: "Choose the range and presentation",
        paras: [
          "Match the piece to the audience: brass diyas and lanterns for festive retail, urlis and bowls for decorative gifting, copper drinkware sets for corporate programmes. Decide early whether items ship loose in export cartons or in gift boxes — it affects unit cost, packing time and freight volume.",
          "Request samples of both the product and the proposed packaging, so what you approve is what ships.",
        ],
      },
      {
        h2: "Quotation, inspection and transit",
        paras: [
          "Request a written quotation covering price, MOQ, lead time, packaging and shipping for the full quantity. Plan for quality inspection before shipment and allow buffer time for customs and transit — peak-season freight is rarely the fastest route of the year.",
          "New Look Impex supports corporate and festive gifting programmes with gift-boxed copper and brass sets. Contact us early to plan your next gifting season.",
        ],
      },
    ],
    links: [
      { label: "Gifting range", href: "/gifting", blurb: "Corporate and festival gifting in one view" },
      { label: "Corporate gifting", href: "/categories/corporate-gifting", blurb: "Programmes at wholesale volume" },
      { label: "Festival décor", href: "/categories/festival-decor", blurb: "Seasonal metalware range" },
      { label: "Request a wholesale quote", href: "/request-quote", blurb: "Written quotation with lead time" },
    ],
  },
  {
    slug: "copper-bottles-wholesale-guide",
    title: "Copper Bottles Wholesale: A Guide for International Buyers",
    description:
      "Everything you need to know before sourcing copper bottles wholesale — MOQ, packaging, export shipping, and suppliers from Moradabad, India.",
    date: "2026-03-01",
    sections: [
      {
        h2: "What to look for in a copper bottle range",
        paras: [
          "Copper bottles are a staple wholesale category for homeware, gift and wellness retailers. Before placing your first bulk order, understand what to look for in a manufacturer and how the export process works.",
          "Start by identifying your target product range: plain copper bottles, hammered finish, diamond-cut, matte, or gift-boxed sets. Request SKU-level details including dimensions, weight, capacity, MOQ and packaging for each design you are considering.",
        ],
      },
      {
        h2: "Samples, MOQ and customisation",
        paras: [
          "Always request samples before committing to bulk orders. Check the finish, the cap fitting, the shape consistency across bottles, and how each unit is protected for transit.",
          "Confirm lead times, export packaging standards, and whether customisation (size, finish, engraving, private label) is available. MOQ differs by design and is quoted with the order — mixed designs can usually be combined into one programme.",
        ],
      },
      {
        h2: "Shipping and paperwork",
        paras: [
          "Get everything in writing — price, MOQ, lead time and shipping terms — and agree the document set for your destination. Freight is quoted per order depending on volume and route, so share your destination early for an accurate landed-cost picture.",
          "New Look Impex manufactures and exports copper bottles and drinkware from Moradabad, India, with a written quotation for every order. Contact us to discuss your requirements.",
        ],
      },
    ],
    links: [
      { label: "Copper bottles category", href: "/copper-bottles", blurb: "Wholesale bottle range and specifications" },
      { label: "Copper collection", href: "/copper-collection", blurb: "All copper drinkware and kitchenware" },
      { label: "Shipping & export", href: "/shipping-export", blurb: "Freight and documentation per order" },
      { label: "Request a wholesale quote", href: "/request-quote", blurb: "Written quotation with MOQ and lead time" },
    ],
  },
  {
    slug: "copper-kitchenware-sourcing-india",
    title: "How to Source Copper Kitchenware from India",
    description:
      "A practical buyer's guide to sourcing copper cookware, pots, pans and serveware from Indian manufacturers — quality checks, custom options and shipping.",
    date: "2026-03-15",
    sections: [
      {
        h2: "The copper kitchenware opportunity",
        paras: [
          "Copper kitchenware — cookware, pots, pans, serveware and tabletop pieces — combines traditional craftsmanship with modern kitchen needs. Indian manufacturers, particularly from Moradabad, specialise in hand-hammered copper kitchenware for wholesale buyers.",
          "The category works across three channels: specialist kitchen retailers, homeware stores, and gifting programmes. Decide which channel you are buying for — it shapes the finishes, packaging and price band you should request.",
        ],
      },
      {
        h2: "Evaluating quality and specifications",
        paras: [
          "When evaluating suppliers, check material quality, finish consistency, dimensions and weight specifications against the sample you approved. Ask for the exact specification of each SKU in writing — it protects you when reorder time comes.",
          "Request samples of the pieces you intend to order in volume, and check them under the lighting conditions your customers will see them in. Hammered surfaces vary between pieces by nature; agree what variation is acceptable before production.",
        ],
      },
      {
        h2: "Customisation, lead times and shipping",
        paras: [
          "Confirm lead times and whether customisation (size, finish, engraving, private label) is available for your target market. Get written quotations covering price, MOQ, lead time, packaging and shipping terms.",
          "New Look Impex manufactures and exports copper kitchenware from Moradabad, India. We provide written per-order quotations and support export documentation for international buyers.",
        ],
      },
    ],
    links: [
      { label: "Copper kitchenware", href: "/copper-kitchenware", blurb: "Cookware and serveware at wholesale" },
      { label: "Brass kitchenware", href: "/brass-collection", blurb: "Dinner sets and table pieces in brass" },
      { label: "Custom manufacturing", href: "/customisation", blurb: "Bespoke sizes and finishes" },
      { label: "Request a wholesale quote", href: "/request-quote", blurb: "Written quotation with MOQ and lead time" },
    ],
  },
  {
    slug: "brass-handicrafts-moradabad-buyer-guide",
    title: "Brass Handicrafts from Moradabad: A Buyer Guide",
    description:
      "Discover traditional Moradabad brass handicrafts — urlis, diyas, lanterns and décor. Learn how to evaluate quality, finish and craftsmanship before placing bulk orders.",
    date: "2026-04-01",
    sections: [
      {
        h2: "The Moradabad brass tradition",
        paras: [
          "Moradabad, Uttar Pradesh, is internationally recognised for its brass handicrafts. The region's artisans craft brass pieces across generations — urlis, diyas, lanterns, vases and decorative home accents that reach retailers worldwide.",
          "The same cluster supplies a broad wholesale range, which is why buyers can consolidate festive décor, kitchenware and gifting pieces with one set of suppliers.",
        ],
      },
      {
        h2: "Evaluating quality and craftsmanship",
        paras: [
          "When sourcing brass handicrafts, evaluate the finish quality, weight, engraving detail, and consistency across pieces. Request samples to assess craftsmanship before placing bulk orders — photograph them alongside your existing assortment to check the tone works for your customers.",
          "Ask which finishes the supplier offers on each design (polished, hammered, antiqued) and how each finish ages. That answer shapes the care instructions you give your own customers.",
        ],
      },
      {
        h2: "From sample to shipment",
        paras: [
          "Confirm MOQ, lead time, packaging standards for export, and whether customisation (size, finish, engraving, private label) is available. Get written quotations for all terms before approving production.",
          "New Look Impex manufactures brass handicrafts from Moradabad and exports globally. We support retailers, importers, distributors and corporate gifting programmes with written quotations and export documentation.",
        ],
      },
    ],
    links: [
      { label: "Brass collection", href: "/brass-collection", blurb: "The full wholesale brass range" },
      { label: "Brass handicrafts", href: "/brass-handicrafts", blurb: "Manufacturer's brass catalogue page" },
      { label: "The craft of Moradabad", href: "/craft", blurb: "How the pieces are made and finished" },
      { label: "Request a wholesale quote", href: "/request-quote", blurb: "Written quotation with MOQ and lead time" },
    ],
  },
  {
    slug: "brass-home-decor-retail-guide",
    title: "How to Select Brass Home Décor for Retail Stores",
    description:
      "Curating brass home décor for your retail assortment — urlis, vases, lanterns and serveware. Style directions, price points and supplier evaluation tips.",
    date: "2026-04-15",
    sections: [
      {
        h2: "Building the assortment",
        paras: [
          "Brass home décor — urlis, diyas, lanterns, vases, planters and serveware — suits both traditional and contemporary retail assortments. Golden tones, hand-hammered textures and festive appeal make brass a steady category for gift and homeware stores.",
          "A balanced shelf usually mixes sizes: a few statement pieces (large urlis, floor lanterns) alongside smaller impulse items (diyas, bowls). Check that the pieces you select photograph well — much of the selling now happens online or through catalogue images.",
        ],
      },
      {
        h2: "Style directions and price points",
        paras: [
          "When curating your assortment, consider your target customer, price points, and display requirements. Request product images, dimensions and weight specifications for each SKU — weight in particular matters for freight and for how the piece feels in hand.",
          "Gift-box presentation and custom branding can add value for retail customers; decide early which SKUs warrant packaging and which ship better in standard export cartons.",
        ],
      },
      {
        h2: "Choosing a supplier",
        paras: [
          "Evaluate suppliers on MOQ, lead time, packaging quality and customisation options. Ask for a written quotation that states exactly what is included, and compare offers on the same quantity so the comparison is meaningful.",
          "New Look Impex supplies brass home décor to retailers worldwide, with wholesale pricing quoted per order and support for custom finishes and private labelling.",
        ],
      },
    ],
    links: [
      { label: "Metal home décor", href: "/metal-home-decor", blurb: "Vases, trays, planters and wall pieces" },
      { label: "Urlis range", href: "/urlis", blurb: "Brass and copper centrepieces" },
      { label: "Gifting", href: "/gifting", blurb: "Gift-ready pieces and programmes" },
      { label: "Request a wholesale quote", href: "/request-quote", blurb: "Wholesale pricing per order" },
    ],
  },
  {
    slug: "brass-lanterns-wholesale-guide",
    title: "Brass Lanterns: Wholesale Sourcing Guide",
    description:
      "Sourcing brass lanterns and festive lighting from India — styles, finishes, MOQ, packaging and export considerations for wholesale buyers.",
    date: "2026-05-01",
    sections: [
      {
        h2: "Styles, sizes and finishes",
        paras: [
          "Brass lanterns are popular for festive seasons, outdoor entertaining, and traditional home décor. From Diwali to Christmas, they serve gifting, hospitality and retail markets worldwide.",
          "When sourcing brass lanterns, consider style (traditional, contemporary, minimalist), size range, finish (hammered, polished, matte, antique), and whether they are intended for indoor or outdoor display. Ask whether glass panels are included — that varies by design.",
        ],
      },
      {
        h2: "MOQ, packaging and lead time",
        paras: [
          "Lanterns are volumetric products — packaging directly affects freight cost. Confirm the packed dimensions and carton quantity with your supplier, and ask for gift-box options if the pieces are going to retail shelves.",
          "Confirm MOQ, lead time and export packaging, and get a written quotation covering price and shipping terms for your destination. Festival orders should be placed with your required date in the enquiry so lead time can be confirmed before you commit.",
        ],
      },
      {
        h2: "Compliance for your market",
        paras: [
          "If lanterns will hold candles or lighting components, check what your market requires for labelling and safety documentation, and ask your supplier which components are supplied with each design. Get the agreed specification in writing before production.",
          "New Look Impex manufactures brass lanterns and festive lighting from Moradabad, India, and supplies wholesale buyers globally with written quotations.",
        ],
      },
    ],
    links: [
      { label: "Diyas & lanterns", href: "/diyas-lanterns", blurb: "Festive lighting in one view" },
      { label: "Brass lanterns", href: "/brass-lanterns", blurb: "Lantern landing page with range details" },
      { label: "Festival décor", href: "/categories/festival-decor", blurb: "The complete seasonal range" },
      { label: "Request a wholesale quote", href: "/request-quote", blurb: "Written quotation with MOQ and lead time" },
    ],
  },
  {
    slug: "private-label-copper-brass-products",
    title: "Private Label Copper and Brass Products",
    description:
      "OEM and private label manufacturing for copper and brass products — custom finishes, engravings, branding and packaging for your retail brand.",
    date: "2026-05-15",
    sections: [
      {
        h2: "What private label covers",
        paras: [
          "Private label manufacturing allows retailers to sell copper and brass products under their own brand name. From custom finishes and engravings to branded packaging, OEM solutions help differentiate your assortment from the shelf next door.",
          "Typical scope: an existing catalogue piece rebranded to your specification, or a bespoke design developed from your drawing. Both routes start with the same question — what exactly should the finished product look like?",
        ],
      },
      {
        h2: "How a private label project runs",
        paras: [
          "Define your requirements clearly: product range, custom finishes, engraving or branding details, packaging design, MOQ and lead time. Share artwork in a usable format (vector files for engraving, print-ready files for packaging) and request samples before production.",
          "Every stage — sampling, tooling if required, packaging, bulk production — is confirmed through a written quotation. Nothing begins until you have approved the sample and the terms in writing.",
        ],
      },
      {
        h2: "What to prepare before you enquire",
        paras: [
          "Have ready: your brand guidelines, the SKUs or designs you want to start with, target quantities, destination, and your required date. With that information a supplier can respond with a realistic quotation and timeline instead of a series of questions.",
          "New Look Impex works with retailers, importers and distributors on private label copper and brass programmes. Contact us to discuss your requirements — we provide written quotations covering sampling, MOQ, lead time and shipping terms.",
        ],
      },
    ],
    links: [
      { label: "Custom manufacturing & OEM", href: "/customisation", blurb: "How custom projects run" },
      { label: "Custom orders", href: "/custom-orders", blurb: "Ordering bespoke pieces" },
      { label: "Corporate gifting", href: "/categories/corporate-gifting", blurb: "Branded gift programmes" },
      { label: "Request a wholesale quote", href: "/request-quote", blurb: "Written quotation for your brief" },
    ],
  },
  {
    slug: "questions-ask-indian-handicrafts-exporter",
    title: "Questions to Ask an Indian Handicrafts Exporter",
    description:
      "Before placing your first bulk order with an Indian handicrafts exporter — MOQ, samples, packaging, lead time and payment terms checklist.",
    date: "2026-06-01",
    sections: [
      {
        h2: "Supplier and capability questions",
        paras: [
          "Sourcing handicrafts from India requires careful supplier evaluation. Before placing your first bulk order, ask these key questions to ensure a reliable partnership.",
          "1. Which product categories do you manufacture directly, and which do you source from partner workshops?",
          "2. What is your MOQ for each product, and does it vary by finish or customisation?",
          "3. Can you provide samples before bulk production, and what are the sample costs and lead times?",
        ],
      },
      {
        h2: "Commercial and logistics questions",
        paras: [
          "4. What are your lead times for production and shipping to my destination?",
          "5. What packaging standards do you use for export, and is gift-box presentation available?",
          "6. Do you provide written quotations covering price, MOQ, lead time, packaging and shipping terms?",
          "7. Can you support customisation — size, finish, engraving, or private label?",
        ],
      },
      {
        h2: "Documentation and payment questions",
        paras: [
          "8. What documentation do you provide for export (commercial invoice, packing list, certificate of origin)?",
          "9. What are your payment terms, and at which stage of production are they due?",
          "10. How are quality issues or transit damage handled after shipment?",
          "New Look Impex welcomes these questions from every buyer. We provide written quotations, transparent terms, and support throughout the sourcing process — start with the RFQ form or the contact page.",
        ],
      },
    ],
    links: [
      { label: "Export information", href: "/export", blurb: "How export orders are handled" },
      { label: "Shipping & export", href: "/shipping-export", blurb: "Freight, packing and documentation" },
      { label: "Terms of supply", href: "/terms", blurb: "Commercial terms in plain language" },
      { label: "Contact us", href: "/contact", blurb: "Email, phone and WhatsApp" },
    ],
  },
];

export const POST_MAP: Record<string, BlogPost> = Object.fromEntries(
  POSTS.map((p) => [p.slug, p])
);
