/**
 * Per-country photography and visual theme for the 19 established market
 * pages. Kept separate from the copy configs so the same component can render
 * visibly different pages without touching SEO content or hreflang clusters.
 */
export interface MarketVisual {
  hero: string;
  gallery: string[];
  theme: 0 | 1 | 2 | 3;
  accent: string;
}

export const MARKET_VISUALS: Record<string, MarketVisual> = {
  // Short regional pages
  usa: { hero: "/home/festive-thanksgiving.jpg", gallery: ["/home/cat-tableware.jpg", "/nli-copper-bottle.jpg", "/gallery-copper-bottles.webp"], theme: 0, accent: "text-gold" },
  uk: { hero: "/slideshow-1.jpg", gallery: ["/home/cat-drinkware.jpg", "/nli-gift-set.jpg", "/home/journal-gifting.jpg"], theme: 1, accent: "text-clay" },
  uae: { hero: "/nli-copper-gift-set.jpg", gallery: ["/gallery-dispenser.webp", "/home/cat-corporate-gifting.jpg", "/home/festive-ramadan.jpg"], theme: 2, accent: "text-gold" },
  au: { hero: "/home/festive-summer.jpg", gallery: ["/home/cat-drinkware.jpg", "/nli-copper-bottle.jpg", "/gallery-copper-bottles.webp"], theme: 3, accent: "text-clay" },
  canada: { hero: "/home/festive-wedding.jpg", gallery: ["/home/cat-gift-sets.jpg", "/nli-brass-utensils.jpg", "/home/journal-styling.jpg"], theme: 0, accent: "text-gold" },
  "saudi-arabia": { hero: "/gallery-dispenser.webp", gallery: ["/nli-copper-gift-set.jpg", "/home/cat-corporate-gifting.jpg", "/gallery-festive-handi.jpg"], theme: 1, accent: "text-gold" },
  japan: { hero: "/home/journal-kansa.jpg", gallery: ["/home/material-brass.jpg", "/home/cat-urlis.jpg", "/nli-brass-masala-box.jpg"], theme: 2, accent: "text-clay" },
  singapore: { hero: "/home/story-artisan.jpg", gallery: ["/home/cat-gift-sets.jpg", "/gallery-poster-v1.jpg", "/nli-gift-set.jpg"], theme: 3, accent: "text-gold" },

  // Europe country pages
  germany: { hero: "/home/material-copper.jpg", gallery: ["/home/cat-kitchenware.jpg", "/nli-copper-utensils.jpg", "/home/cat-drinkware.jpg"], theme: 0, accent: "text-gold" },
  france: { hero: "/gallery-poster-v1.jpg", gallery: ["/home/cat-gift-sets.jpg", "/nli-brass-utensils.jpg", "/home/journal-gifting.jpg"], theme: 1, accent: "text-clay" },
  italy: { hero: "/home/manufacturing-artisan.jpg", gallery: ["/home/cat-cookware.jpg", "/gallery-poster-v2.jpg", "/nli-brass-masala-box.jpg"], theme: 2, accent: "text-gold" },
  netherlands: { hero: "/slideshow-2.jpg", gallery: ["/home/cat-tableware.jpg", "/nli-copper-bottle.jpg", "/home/export-banner.jpg"], theme: 3, accent: "text-clay" },
  spain: { hero: "/home/cat-pooja.jpg", gallery: ["/home/cat-diyas-lanterns.jpg", "/gallery-poster-v3.jpg", "/nli-brass-utensils.jpg"], theme: 0, accent: "text-gold" },
  belgium: { hero: "/home/cat-cookware.jpg", gallery: ["/nli-copper-utensils.jpg", "/home/cat-kitchenware.jpg", "/home/material-brass.jpg"], theme: 1, accent: "text-clay" },
  poland: { hero: "/slideshow-3.jpg", gallery: ["/home/cat-urlis.jpg", "/gallery-festive-handi.jpg", "/nli-gift-set.jpg"], theme: 2, accent: "text-gold" },
  sweden: { hero: "/home/journal-gifting.jpg", gallery: ["/home/material-brass.jpg", "/home/cat-urlis.jpg", "/nli-copper-bottle.jpg"], theme: 3, accent: "text-clay" },
  denmark: { hero: "/home/cat-tableware.jpg", gallery: ["/home/cat-diyas-lanterns.jpg", "/nli-brass-masala-box.jpg", "/home/story-artisan.jpg"], theme: 0, accent: "text-gold" },
  austria: { hero: "/hero-brass-kitchen.jpg", gallery: ["/home/cat-kitchenware.jpg", "/nli-brass-utensils.jpg", "/gallery-poster-v2.jpg"], theme: 1, accent: "text-clay" },
  switzerland: { hero: "/home/cat-kitchenware.jpg", gallery: ["/home/material-copper.jpg", "/nli-copper-gift-set.jpg", "/home/cat-drinkware.jpg"], theme: 2, accent: "text-gold" },
};

export function getMarketVisual(slug: string): MarketVisual {
  return MARKET_VISUALS[slug] ?? {
    hero: "/home/export-banner.jpg",
    gallery: ["/nli-copper-bottle.jpg", "/nli-brass-utensils.jpg", "/gallery-copper-bottles.webp"],
    theme: 0,
    accent: "text-gold",
  };
}
