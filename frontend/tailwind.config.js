/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Premium plum/cream palette inspired by reference design.
        navy: { DEFAULT: "#2D1B2E", dark: "#1A0F1A", light: "#4A334E" },
        ivory: "#FFFFFF",
        brass: { DEFAULT: "#B87345", dark: "#8F5A35", light: "#E8D4C4" },
        gold: { DEFAULT: "#C9A96E", dark: "#A68A52", light: "#E5D9B8" },
        petrol: "#2D1B2E",
        clay: { DEFAULT: "#B87345", dark: "#8F5A35", light: "#E8D4C4" },
        cream: "#F8EFE8",
        espresso: "#2D1B2E",
        olive: "#6F6E48",
        sand: "#F0EAE2",
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
