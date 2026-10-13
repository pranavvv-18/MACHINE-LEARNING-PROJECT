/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0b0f1a",
        panel: "rgba(255,255,255,0.04)",
        accent: "#7c9dff",
        accent2: "#7ce0c9",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

