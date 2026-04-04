/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        oat: "#f5efe4",
        bark: "#4a3427",
        roast: "#8c5c40",
        cream: "#fffaf2",
        pine: "#34584b",
        ember: "#ba4a2f",
        brass: "#d4a24d",
      },
      boxShadow: {
        panel: "0 24px 50px rgba(64, 37, 22, 0.12)",
      },
      fontFamily: {
        display: ["Georgia", "Cambria", "Times New Roman", "serif"],
        body: ["Trebuchet MS", "Gill Sans", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};
