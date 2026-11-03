/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Premium purple/white palette inspired by Pinterest reference.
        navy: { DEFAULT: "#2E1846", dark: "#1A0E2A", light: "#4A2E6A" },
        ivory: "#FFFFFF",
        brass: { DEFAULT: "#B87345", dark: "#8F5A35", light: "#E8D4C4" },
        gold: { DEFAULT: "#C9A96E", dark: "#A68A52", light: "#E5D9B8" },
        petrol: "#2E1846",
        clay: { DEFAULT: "#B87345", dark: "#8F5A35", light: "#E8D4C4" },
        cream: "#FBF9FC",
        espresso: "#2E1846",
        olive: "#6F6E48",
        sand: "#F0ECF2",
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
