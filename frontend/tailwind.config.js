/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Royal premium palette (New Look Impex international identity).
        navy: { DEFAULT: "#24221F", dark: "#141311", light: "#35322D" },
        ivory: "#F8F5EE",
        brass: { DEFAULT: "#A66A45", dark: "#7A4A2D", light: "#E8D4C4" },
        gold: { DEFAULT: "#B08D57", dark: "#9A7746", ink: "#87653A", light: "#F0E6D2" },
        petrol: "#24221F",
        clay: { DEFAULT: "#A66A45", dark: "#7A4A2D", light: "#E8D4C4" },
        cream: "#F8F5EE",
        espresso: "#211B17",
        olive: "#183D35",
        sand: "#EAE0D0",
        charcoal: "#24221F",
        gray: "#5B6472", // darkened for WCAG AA on ivory (4.44 -> 5.49)
        // Deep Emerald — primary button / secondary accent
        emerald: { DEFAULT: "#183D35", dark: "#0F2A24", light: "#2C5A4E" },
        // Royal editorial palette
        editorial: {
          bg: "#F8F5EE", // Royal Ivory
          secondary: "#EAE0D0", // Warm Champagne
          ink: "#24221F", // Deep Charcoal
          accent: "#7A4A2D", // Burnished Copper (AA contrast on ivory and brass-light chips)
          gold: "#B08D57", // Antique Gold
          dark: "#211B17", // Dark Espresso
          emerald: "#183D35", // Deep Emerald
        },
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Playfair Display", "Georgia", "serif"],
        sans: ["var(--font-jakarta)", "Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-jakarta)", "Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
        cormorant: ["var(--font-cormorant)", "Cormorant Garamond", "Georgia", "serif"],
        inter: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        "nli-marquee": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "nli-marquee": "nli-marquee 34s linear infinite",
      },
      maxWidth: { "8xl": "88rem" },
    },
  },
  plugins: [],
};
