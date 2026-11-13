/**
 * Per-category editorial content for /categories/[slug].
 *
 * Rendered server-side by page.tsx so the copy is present in crawlable HTML
 * (not loaded by JavaScript). Every FAQ answer must reflect the real site
 * policies (/terms, /shipping-export, /request-quote) — never invent prices,
 * certifications, guarantees or lead times.
 *
 * Banned claims (kept out deliberately): certifications, food-safe/lead-free,
 * "made in India", dishwasher/microwave safety, pure/100% copper, guarantees.
 */

export type CategoryEditorial = {
  heading: string;
  paragraphs: string[];
  faqs: { q: string; a: string }[];
  links: { label: string; href: string; blurb: string }[];
};

export const CATEGORY_EDITORIAL: Record<string, CategoryEditorial> = {
  "copper-bottles": {
    heading: "Wholesale copper bottles from Moradabad",
    paragraphs: [
      "New Look Impex manufactures and supplies wholesale copper water bottles for retailers, gifting programmes and distributors. Capacity, finish, dimensions and MOQ are listed on each product page so buyers can compare designs before enquiring.",
      "Bulk orders can include custom engraving or private label packaging. Add the bottle designs and quantities you need to your enquiry and we respond with a written quotation covering price, lead time and shipping terms.",
    ],
    faqs: [
      { q: "What finishes are available on copper bottles?", a: "Hammered, polished and antiqued finishes appear across the range. Check each product page for the exact specification, and ask about custom finishes when you request a quote." },
      { q: "What is the minimum order quantity for copper bottles?", a: "MOQ differs by design and is listed on each product page. Larger quantities and private label runs are quoted per enquiry." },
      { q: "Can bottles be engraved or branded?", a: "Engraving and branding are available on bulk orders. Describe your artwork and quantity in the custom manufacturing enquiry — it is quoted like any wholesale order." },
    ],
    links: [
      { label: "Copper collection", href: "/copper-collection", blurb: "All wholesale copper products in one view" },
      { label: "Copper kitchenware", href: "/copper-kitchenware", blurb: "Hand-hammered cookware and serveware" },
      { label: "Custom manufacturing", href: "/customisation", blurb: "Sizes, finishes and private label to your brief" },
      { label: "Request a wholesale quote", href: "/request-quote", blurb: "Written quotation with MOQ and lead time" },
    ],
  },
  "copper-jugs-pitchers": {
    heading: "Copper jugs and pitchers — wholesale supply",
    paragraphs: [
      "Our wholesale copper jugs and pitchers cover traditional serving shapes and contemporary profiles for retail shelves, hospitality buyers and gifting programmes. Specifications and MOQ are published on each product page.",
      "Finishes and handle details vary between designs — request a written quotation for the exact specification, packaging and lead time for your order quantity.",
    ],
    faqs: [
      { q: "Do jugs come in different capacities?", a: "Yes — the range includes several sizes. Each product page lists the dimensions and capacity of that design." },
      { q: "Is there a minimum order quantity?", a: "MOQ varies by jug design and is shown on the product page. Custom quantities are quoted per enquiry." },
      { q: "Can I order a sample before a bulk order?", a: "Sample availability is confirmed per product when you enquire. Mention the sample in your quote request and we respond with terms." },
    ],
    links: [
      { label: "Copper collection", href: "/copper-collection", blurb: "Browse the full copper range" },
      { label: "Copper mugs & tumblers", href: "/copper-mugs-tumblers", blurb: "Matching drinkware for retail sets" },
      { label: "Request a wholesale quote", href: "/request-quote", blurb: "Written quotation with MOQ and lead time" },
    ],
  },
  "copper-mugs-tumblers": {
    heading: "Wholesale copper mugs and tumblers",
    paragraphs: [
      "New Look Impex supplies wholesale copper mugs and tumblers for retailers, bars, hospitality buyers and corporate gifting. Each listing shows finish, dimensions and MOQ.",
      "Quantity breaks, engraving and gift packaging are quoted per order. Add the designs and quantities you need to an enquiry and we reply with a written quotation.",
    ],
    faqs: [
      { q: "What finishes are available?", a: "Hammered and polished finishes appear across the range. Check each product page, or ask about a specific finish when you enquire." },
      { q: "Can mugs be supplied as gift sets?", a: "Gift-ready presentation is available on selected sets. Custom packaging requirements are quoted per order." },
      { q: "What is the minimum order quantity?", a: "MOQ is listed per design on the product page. Bulk quantities above it are quoted individually." },
    ],
    links: [
      { label: "Copper bottles", href: "/copper-bottles", blurb: "Complementary drinkware for retail" },
      { label: "Gifting", href: "/gifting", blurb: "Corporate and festival gifting programmes" },
      { label: "Request a wholesale quote", href: "/request-quote", blurb: "Written quotation with MOQ and lead time" },
    ],
  },
  "copper-kitchenware": {
    heading: "Copper kitchenware manufacturer and exporter",
    paragraphs: [
      "This wholesale copper kitchenware range covers hand-hammered cookware, serveware and table pieces manufactured in Moradabad for export buyers and domestic retailers. Dimensions, finish and MOQ are listed per product.",
      "Custom sizes, handle styles and private label packaging are available on bulk orders. Send your specification with the quote request and we confirm pricing and lead time in writing.",
    ],
    faqs: [
      { q: "Can kitchenware be made to a custom specification?", a: "Yes — custom sizes, finishes and details are quoted like any wholesale order. Share your drawing or reference image with the enquiry." },
      { q: "What is the minimum order quantity?", a: "MOQ varies by piece and is shown on each product page. Mixed orders across designs are quoted per enquiry." },
      { q: "How is kitchenware packed for shipping?", a: "Standard export packaging is used for all orders. Custom or gift packaging is quoted per order — see the shipping page for how freight is arranged." },
    ],
    links: [
      { label: "Copper collection", href: "/copper-collection", blurb: "All wholesale copper products" },
      { label: "Brass kitchenware", href: "/brass-kitchenware", blurb: "Dinner sets and serveware in brass" },
      { label: "Custom manufacturing", href: "/customisation", blurb: "Bespoke sizes and private label" },
      { label: "Request a wholesale quote", href: "/request-quote", blurb: "Written quotation with MOQ and lead time" },
    ],
  },
  "brass-kitchenware": {
    heading: "Brass kitchenware and dinner sets — wholesale",
    paragraphs: [
      "New Look Impex manufactures wholesale brass kitchenware — dinner sets, serveware and table pieces — in Moradabad for retailers, hospitality buyers and exporters. Each product page lists finish, dimensions and MOQ.",
      "Custom engraving, finishing and gift packaging are available on bulk quantities. Request a written quotation with your quantities and we confirm price, MOQ and lead time before production.",
    ],
    faqs: [
      { q: "What finishes are available on brass kitchenware?", a: "Polished, hammered and antiqued finishes appear across the range. The exact finish for each design is shown on its product page." },
      { q: "Can pieces be engraved or branded?", a: "Yes — engraving and private label are available on bulk orders and are quoted with the order." },
      { q: "How do I get a quotation?", a: "Add the items and quantities to your enquiry list and submit a request for quotation. You receive a reference number and a written quote." },
    ],
    links: [
      { label: "Brass collection", href: "/brass-collection", blurb: "The full wholesale brass range" },
      { label: "Copper kitchenware", href: "/copper-kitchenware", blurb: "Hand-hammered copper cookware" },
      { label: "Corporate gifting", href: "/gifting", blurb: "Bulk gift programmes" },
      { label: "Request a wholesale quote", href: "/request-quote", blurb: "Written quotation with MOQ and lead time" },
    ],
  },
  "brass-urlis": {
    heading: "Brass urlis — the traditional Moradabad water vessel",
    paragraphs: [
      "The urli is one of Moradabad's most recognised brass crafts — a broad, shallow vessel used as a decorative centrepiece, for floating flowers or in pooja rooms. Our wholesale brass urlis come in hammered and polished finishes across several diameters.",
      "Dimensions and MOQ are listed on each product page. Custom diameters, finishes and engraving are quoted per enquiry — send your requirement for a written quotation.",
    ],
    faqs: [
      { q: "What sizes do brass urlis come in?", a: "The range covers small tabletop diameters through large decorative pieces. Exact dimensions are listed on each product page." },
      { q: "Can I order a custom diameter or finish?", a: "Custom sizes and finishes are quoted per enquiry. Share the diameter and finish you need in your quote request." },
      { q: "Are urlis suitable for retail and gifting?", a: "Yes — urlis are a staple of our retail and festive gifting orders. Gift packaging is quoted per order." },
    ],
    links: [
      { label: "Urlis range", href: "/urlis", blurb: "Brass and copper urlis in one view" },
      { label: "Brass diyas", href: "/brass-diyas", blurb: "Matching festive pieces" },
      { label: "Request a wholesale quote", href: "/request-quote", blurb: "Written quotation with MOQ and lead time" },
    ],
  },
  "copper-urlis": {
    heading: "Copper urlis — wholesale from Moradabad",
    paragraphs: [
      "Copper urlis add a warmer tone to the traditional Moradabad vessel — offered in hammered and polished finishes for décor, pooja and gifting programmes. Each product page lists diameter, finish and MOQ.",
      "Larger quantities and custom sizes are quoted per enquiry. Request a written quotation with your requirement and we confirm price and lead time before production.",
    ],
    faqs: [
      { q: "What sizes are available?", a: "Several diameters are listed across the range — see each product page for exact dimensions." },
      { q: "Can copper urlis be custom sized?", a: "Custom diameters and finishes are quoted per enquiry like any wholesale order." },
      { q: "Do you supply brass urlis as well?", a: "Yes — the brass urli range sits alongside copper in the urlis category, with brass options on the brass-urlis pages." },
    ],
    links: [
      { label: "Brass urlis", href: "/brass-urlis", blurb: "The traditional brass version" },
      { label: "Copper collection", href: "/copper-collection", blurb: "All wholesale copper products" },
      { label: "Request a wholesale quote", href: "/request-quote", blurb: "Written quotation with MOQ and lead time" },
    ],
  },
  "brass-diyas": {
    heading: "Brass diyas and pooja items — bulk supply",
    paragraphs: [
      "Handcrafted brass diyas remain one of the highest-volume festive categories from Moradabad. This range covers traditional oil lamps, decorative diya stands and pooja pieces for retailers, temples and corporate gifting programmes.",
      "Festival orders are planned around your delivery date — include your event timeframe in the enquiry and we confirm MOQ, lead time and packaging in writing.",
    ],
    faqs: [
      { q: "Can diyas be ordered in bulk for festivals?", a: "Yes — festival bulk orders are our standard workflow. Share your quantity and required date in the enquiry and we confirm lead time in writing." },
      { q: "What finishes are available?", a: "Polished and antiqued brass finishes appear across the range. Check each product page for the specific finish." },
      { q: "Is gift packaging available?", a: "Gift-box presentation is available on selected sets and custom packaging is quoted per order." },
    ],
    links: [
      { label: "Diyas & lanterns", href: "/diyas-lanterns", blurb: "Festive lighting in one view" },
      { label: "Festival décor", href: "/festival-decor", blurb: "The complete festive range" },
      { label: "Brass collection", href: "/brass-collection", blurb: "All wholesale brass products" },
      { label: "Request a wholesale quote", href: "/request-quote", blurb: "Written quotation with MOQ and lead time" },
    ],
  },
  "metal-diyas": {
    heading: "Metal diyas — wholesale festive lighting",
    paragraphs: [
      "This metal diyas range combines brass and copper finishes across traditional and contemporary lamp designs for seasonal retail, events and gifting. Dimensions, finish and MOQ are listed per product page.",
      "Bulk festival quantities are quoted individually — include your required delivery date in the enquiry so lead time can be confirmed in writing.",
    ],
    faqs: [
      { q: "What is the difference between the brass and metal diya ranges?", a: "The metal diyas category mixes finishes and contemporary shapes; brass diyas focus on traditional brass lamp designs. Both list material on the product page." },
      { q: "Can I order for a specific festival date?", a: "Yes — mention your event date in the enquiry and we confirm whether the lead time works before you commit." },
      { q: "Are custom designs possible?", a: "Custom designs are quoted per enquiry through the custom manufacturing form." },
    ],
    links: [
      { label: "Brass diyas", href: "/brass-diyas", blurb: "Traditional brass oil lamps" },
      { label: "Festival décor", href: "/festival-decor", blurb: "Complete festive range" },
      { label: "Request a wholesale quote", href: "/request-quote", blurb: "Written quotation with MOQ and lead time" },
    ],
  },
  "brass-lanterns": {
    heading: "Brass lanterns — decorative lighting wholesale",
    paragraphs: [
      "Handcrafted brass lanterns serve retail, hospitality and festive décor buyers worldwide. The range spans traditional and contemporary frames, with dimensions, finish and MOQ published on each product page.",
      "Custom heights, finishes and glass options are quoted per enquiry. Send your specification with quantities for a written quotation covering price and lead time.",
    ],
    faqs: [
      { q: "Do lanterns include glass panels?", a: "Glass inclusion varies by design — each product page states what is supplied with the lantern." },
      { q: "Can lanterns be made in custom sizes?", a: "Custom heights and finishes are quoted per enquiry like any wholesale order." },
      { q: "What is the minimum order quantity?", a: "MOQ is listed per design on the product page. Mixed-design orders are quoted individually." },
    ],
    links: [
      { label: "Diyas & lanterns", href: "/diyas-lanterns", blurb: "Festive lighting in one view" },
      { label: "Brass collection", href: "/brass-collection", blurb: "All wholesale brass products" },
      { label: "Request a wholesale quote", href: "/request-quote", blurb: "Written quotation with MOQ and lead time" },
    ],
  },
  "decorative-bowls": {
    heading: "Decorative brass and metal bowls — wholesale",
    paragraphs: [
      "Decorative bowls in brass and mixed metal finishes serve table décor, hospitality buyers and retail shelves. Diameters, finishes and MOQ are listed on each product page.",
      "Set quantities, custom diameters and gift packaging are quoted per enquiry — add your requirement to a quote request for written pricing.",
    ],
    faqs: [
      { q: "What sizes are available?", a: "Several diameters are listed across the range — see each product page for exact dimensions." },
      { q: "Can bowls be supplied as sets?", a: "Set configurations and quantities are quoted per enquiry depending on the design." },
      { q: "Is custom finishing available?", a: "Custom finishes are quoted like any wholesale order — mention the finish you need in the enquiry." },
    ],
    links: [
      { label: "Metal home décor", href: "/metal-home-decor", blurb: "Vases, trays and wall pieces" },
      { label: "Brass collection", href: "/brass-collection", blurb: "All wholesale brass products" },
      { label: "Request a wholesale quote", href: "/request-quote", blurb: "Written quotation with MOQ and lead time" },
    ],
  },
  "festival-decor": {
    heading: "Festival décor — wholesale from Moradabad",
    paragraphs: [
      "The festival décor range gathers diyas, lanterns, urlis and festive metal pieces used by retailers and event buyers during Diwali, Christmas and seasonal campaigns. Each product page lists finish, dimensions and MOQ.",
      "Festival orders are scheduled around your required date — include it in the enquiry and lead time, packaging and price are confirmed in writing before production begins.",
    ],
    faqs: [
      { q: "How far in advance should festival orders be placed?", a: "Lead time depends on quantity and finish — include your required date in the enquiry and we confirm feasibility in writing before you commit." },
      { q: "Can the range be mixed across categories?", a: "Yes — mixed festive orders across diyas, lanterns and urlis are quoted per enquiry." },
      { q: "Is gift packaging available for festive orders?", a: "Gift-box presentation is available on selected pieces and custom packaging is quoted per order." },
    ],
    links: [
      { label: "Brass diyas", href: "/brass-diyas", blurb: "Traditional brass oil lamps" },
      { label: "Diyas & lanterns", href: "/diyas-lanterns", blurb: "Festive lighting in one view" },
      { label: "Gifting", href: "/gifting", blurb: "Corporate and festival gifting programmes" },
      { label: "Request a wholesale quote", href: "/request-quote", blurb: "Written quotation with MOQ and lead time" },
    ],
  },
  "corporate-gifting": {
    heading: "Corporate gifting — brass and copper at wholesale volume",
    paragraphs: [
      "Brass and copper pieces give corporate and festival gifting programmes a distinctive, long-lasting product. This category draws diyas, lanterns, urlis and homeware from across the catalogue — each product page lists MOQ so you can plan around your event date.",
      "Quantities above standard MOQ, custom engraving and branded packaging are quoted individually. Add the items, quantities and delivery timeframe to your enquiry for a written quotation.",
    ],
    faqs: [
      { q: "Can products be engraved with our company logo?", a: "Engraving and branding are available on bulk orders. Share your artwork with the enquiry and it is quoted with the order." },
      { q: "Do you offer gift packaging?", a: "Gift-box presentation is available on selected sets and custom packaging is quoted per order." },
      { q: "How are large gift programmes quoted?", a: "Programme quantities are quoted individually — include the item list, quantities and event date in the enquiry." },
    ],
    links: [
      { label: "Gifting range", href: "/gifting", blurb: "Corporate and festival gifting in one view" },
      { label: "Custom manufacturing", href: "/customisation", blurb: "Bespoke designs and private label" },
      { label: "Request a wholesale quote", href: "/request-quote", blurb: "Written quotation with MOQ and lead time" },
    ],
  },
  "custom-bulk-orders": {
    heading: "Custom and bulk orders — OEM metal manufacturing",
    paragraphs: [
      "New Look Impex handles custom and bulk metal handicraft orders — bespoke sizes, finishes, engraving and private label packaging — quoted individually against your brief. Share drawings, reference images or samples with the enquiry.",
      "Every custom order receives a written quotation covering price, MOQ, lead time and packaging before production begins. Existing catalogue items can also be ordered above their standard MOQ.",
    ],
    faqs: [
      { q: "What information do you need for a custom order?", a: "Product reference or drawing, dimensions, finish, quantity and required date. Samples can be arranged where the design requires them." },
      { q: "How are custom orders priced?", a: "Custom orders are quoted per brief — there is no fixed price list. The written quotation covers price, MOQ, lead time and packaging." },
      { q: "Can you handle private label and OEM packaging?", a: "Yes — private label and OEM packaging are available on bulk orders and are quoted with the order." },
    ],
    links: [
      { label: "Customisation & OEM", href: "/customisation", blurb: "How custom manufacturing works" },
      { label: "Bulk orders", href: "/bulk-orders", blurb: "Planning a large quantity order" },
      { label: "Request a wholesale quote", href: "/request-quote", blurb: "Written quotation with MOQ and lead time" },
    ],
  },
};
