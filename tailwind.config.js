/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        marca: { 50: '#eef4ff', 100: '#dbe6fe', 500: '#3b6fe0', 600: '#2a56c6', 700: '#2246a0', 900: '#172e63' },
      },
    },
  },
  plugins: [],
}
