/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Corporate navy/amber palette for premium B2B export website.
        navy: { DEFAULT: "#0F172A", dark: "#020617", light: "#1E293B" },
        ivory: "#FFFFFF",
        brass: { DEFAULT: "#D97706", dark: "#B45309", light: "#FEF3C7" },
        gold: { DEFAULT: "#D97706", dark: "#B45309", light: "#FEF3C7" },
        petrol: "#0F172A",
        clay: { DEFAULT: "#D97706", dark: "#B45309", light: "#FEF3C7" },
        cream: "#F8FAFC",
        espresso: "#0F172A",
        olive: "#059669",
        sand: "#F1F5F9",
        charcoal: "#1E293B",
        gray: "#64748B",
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
