import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        display: ["var(--font-display)", "sans-serif"],
      },
      colors: {
        // Sophisticated Olive Palette
        brand: {
          50: "#f7f9f5",
          100: "#ecf3e8",
          200: "#dae8d3",
          300: "#bdd6b3",
          400: "#98bf8a",
          500: "#76a465",
          600: "#5c824d", // Main Brand Olive
          700: "#49673e",
          800: "#3d5235",
          900: "#33442d",
        },
        stone: {
          50: "#fafaf9",
          100: "#f5f5f4",
          200: "#e7e5e4",
          300: "#d6d3d1",
          400: "#a8a29e",
          500: "#78716c",
          600: "#57534e",
          700: "#44403c",
          800: "#292524",
          900: "#1c1917",
        },
      },
      backgroundImage: {
        "gradient-olive": "linear-gradient(to bottom right, #f7f9f5, #ecf3e8)",
      },
    },
  },
  plugins: [],
};

export default config;

