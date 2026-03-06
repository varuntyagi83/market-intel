/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0c0c14",
        surface: "#151521",
        "surface-2": "#1c1c2e",
        accent: "#5bafff",
        green: "#34d399",
        red: "#f87171",
        muted: "#9090ac",
        border: "#252540",
      },
      fontFamily: {
        mono: ["var(--font-jetbrains)", "JetBrains Mono", "monospace"],
      },
      animation: {
        "dots": "dots 1.4s infinite",
      },
      keyframes: {
        dots: {
          "0%, 80%, 100%": { opacity: "0.1" },
          "40%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
