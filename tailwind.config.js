/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--c-text)',
        muted: 'var(--c-text-secondary)',
        canvas: 'var(--c-bg)',
        panel: 'var(--c-sponsored)',
        accent: 'var(--c-accent)',
        border: 'var(--c-border)'
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(214,40,39,0.22), 0 18px 60px rgba(0,0,0,0.28)'
      }
    }
  },
  plugins: []
};
