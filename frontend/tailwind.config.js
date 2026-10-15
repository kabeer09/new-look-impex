/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // NY NOW-inspired combination: monochrome ink + institutional blue,
        // white surfaces. Gold is retained as the metallic brand accent
        // (logo mark, placeholders, footer headings).
        navy: { DEFAULT: "#141414", dark: "#000000", light: "#2E2E2E" },
        ivory: "#FFFFFF",
        brass: { DEFAULT: "#0058A9", dark: "#00417E", light: "#D7E7F5" },
        gold: { DEFAULT: "#B08D57", dark: "#8F6F43", light: "#C9AC7C" },
        petrol: "#184056",
        // Warm artisan storefront (editorial cream + terracotta + olive).
        clay: { DEFAULT: "#B0512C", dark: "#7E3B1F", light: "#F3E2D2" },
        cream: "#FAF5EC",
        espresso: "#2E2118",
        olive: "#6F6E48",
        sand: "#F0F0F0",
        charcoal: "#1B1B1B",
        gray: "#6B7280",
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Arial", "sans-serif"],
      },
      maxWidth: { "8xl": "88rem" },
    },
  },
  plugins: [],
};
