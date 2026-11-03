/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Premium artisan palette: deep charcoal + warm cream + copper/brass accents.
        navy: { DEFAULT: "#1A1A1A", dark: "#0A0A0A", light: "#2A2A2A" },
        ivory: "#FFFFFF",
        brass: { DEFAULT: "#B87333", dark: "#8B5A2B", light: "#E8D4C4" },
        gold: { DEFAULT: "#C5A059", dark: "#A07C3A", light: "#F0E6D2" },
        petrol: "#1A1A1A",
        clay: { DEFAULT: "#B87333", dark: "#8B5A2B", light: "#E8D4C4" },
        cream: "#FBF9F5",
        espresso: "#1A1A1A",
        olive: "#059669",
        sand: "#F5F3F0",
        charcoal: "#1A1A1A",
        gray: "#6B7280",
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Playfair Display", "Georgia", "serif"],
        sans: ["var(--font-jakarta)", "Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-jakarta)", "Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
      },
      maxWidth: { "8xl": "88rem" },
    },
  },
  plugins: [],
};
