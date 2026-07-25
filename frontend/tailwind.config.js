/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0F19',
        card: '#161C2C',
        border: '#232D42',
        primary: '#3B82F6',
        success: '#10B981',
        danger: '#EF4444',
      }
    },
  },
  plugins: [],
}
