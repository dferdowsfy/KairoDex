/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        'real-estate-red': '#dc2626',
        'real-estate-red-dark': '#b91c1c',
      }
    },
  },
  plugins: [],
} 