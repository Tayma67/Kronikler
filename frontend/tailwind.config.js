/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: {
          DEFAULT: '#E8D5B0',
          dim: '#B8A880',
          muted: '#7A6A4F',
        },
        obsidian: {
          DEFAULT: '#0D0A06',
          light: '#15110A',
          surface: '#1C160D',
          card: '#221A0F',
          border: '#2E2416',
        },
        gold: {
          bright: '#F0C040',
          DEFAULT: '#C9A84C',
          dim: '#8B6914',
          glow: '#D4AF37',
        },
        ember: '#C84B2A',
        jade: '#3A8A4A',
        azure: '#2A6FA8',
        amber: '#D4820A',
        violet: '#7B4FAF',
      },
      fontFamily: {
        display: ['"Cinzel"', 'Georgia', 'serif'],
        serif: ['"Crimson Text"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '18': '4.5rem',
      },
      boxShadow: {
        'gold-glow': '0 0 12px rgba(201, 168, 76, 0.4), 0 0 24px rgba(201, 168, 76, 0.15)',
        'gold-glow-sm': '0 0 6px rgba(201, 168, 76, 0.3)',
        'inner-dark': 'inset 0 2px 8px rgba(0,0,0,0.6)',
        'card': '0 4px 16px rgba(0,0,0,0.5), 0 1px 0 rgba(201,168,76,0.1)',
      },
    },
  },
  plugins: [],
}
