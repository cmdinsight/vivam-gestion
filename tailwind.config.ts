import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#1B2A4E",
        teal: "#2EA7A1",
        champagne: "#CFB589",
        crema: "#FBFAF7",
      },
      fontFamily: {
        display: ["Playfair Display", "serif"],
        body: ["Lato", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
