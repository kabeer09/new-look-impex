/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Premium burgundy/cream palette inspired by Pinterest reference.
        navy: { DEFAULT: "#470916", dark: "#2A050D", light: "#6B1220" },
        ivory: "#FFFFFF",
        brass: { DEFAULT: "#B87345", dark: "#8F5A35", light: "#E8D4C4" },
        gold: { DEFAULT: "#C9A96E", dark: "#A68A52", light: "#E5D9B8" },
        petrol: "#470916",
        clay: { DEFAULT: "#B87345", dark: "#8F5A35", light: "#E8D4C4" },
        cream: "#FBF6F2",
        espresso: "#470916",
        olive: "#6F6E48",
        sand: "#F2EAE4",
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
