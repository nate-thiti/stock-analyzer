/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--bg)',
        card: 'var(--card)',
        border: 'var(--border)',
        primary: 'var(--primary)',
        accent: 'var(--accent)',
        success: 'var(--success)',
        danger: 'var(--danger)',
        warning: 'var(--warning)',
        foreground: 'var(--foreground)',
        muted: 'var(--muted)',
        surface: 'var(--surface)',
      }
    },
  },
  plugins: [],
}
