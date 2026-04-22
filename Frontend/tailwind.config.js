/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: "#020617",
        card: "#0f172a",
        brand: "#3b82f6",
      }
    },
  },
  plugins: [],
}