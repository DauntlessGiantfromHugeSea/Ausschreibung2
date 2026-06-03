import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Firmenfarbe F&B Engineering: #92c57a (als brand-500), dunklere Töne
        // für kontrastreiche Buttons/Links.
        brand: {
          50: "#f2f8ec",
          100: "#e2f0d5",
          200: "#c7e2b2",
          400: "#a9d28f",
          500: "#92c57a",
          600: "#5f9e3f",
          700: "#4c7e33",
          900: "#2f4f20",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
