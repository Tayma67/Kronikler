/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Premium RPG identity colors ──────────────────────────
        parchment: {
          DEFAULT: '#E8D5B0',
          dim:     '#B8A880',
          muted:   '#7A6A4F',
        },
        obsidian: {
          DEFAULT: '#0D0A06',
          light:   '#15110A',
          surface: '#1C160D',
          card:    '#221A0F',
          border:  '#2E2416',
        },
        gold: {
          bright:  '#F0C040',
          DEFAULT: '#C9A84C',
          dim:     '#8B6914',
          glow:    '#D4AF37',
        },
        ember: '#C84B2A',
        jade:  '#3A8A4A',
        azure: '#2A6FA8',

        // ── Override Tailwind stone → dark parchment/obsidian ────
        // All existing pages using stone-* automatically get the theme
        stone: {
          50:  '#F8F4EE',
          100: '#E8D5B0',
          200: '#D8C59A',
          300: '#B8A880',
          400: '#8A7A60',
          500: '#6A5A42',
          600: '#4E3E2C',
          700: '#3A2C1C',
          800: '#2E2416',
          900: '#1C160D',
          950: '#0D0A06',
        },

        // ── Override amber → gold ────────────────────────────────
        amber: {
          50:  '#FDF6DC',
          100: '#F8E8A0',
          200: '#F0D070',
          300: '#E8B840',
          400: '#C9A84C',
          500: '#A88430',
          600: '#8B6914',
          700: '#6A4E10',
          800: '#4A360C',
          900: '#2E2008',
          950: '#1C160D',
        },

        // ── Override orange → ember/gold-dim ─────────────────────
        orange: {
          50:  '#FDF2E8',
          100: '#F8D8B0',
          200: '#F0B870',
          300: '#E89840',
          400: '#C9A84C',
          500: '#A07828',
          600: '#8B6914',
          700: '#6A5010',
          800: '#4A3820',
          900: '#2E2416',
          950: '#1C160D',
        },

        // ── Override red → ember red ─────────────────────────────
        red: {
          400: '#D45040',
          500: '#C84040',
          600: '#A83030',
          700: '#882020',
          800: '#6A1818',
          900: '#4A1010',
          950: '#2A0808',
        },

        // ── Override emerald/green → jade ────────────────────────
        emerald: {
          300: '#5ACA7A',
          400: '#4AAA5A',
          500: '#3A8A4A',
          600: '#2A6A3A',
          700: '#1E5030',
          800: '#142818',
          900: '#0A1A0E',
          950: '#061208',
        },

        // ── Override sky/blue → azure ────────────────────────────
        sky: {
          300: '#6AACDC',
          400: '#4A8CC8',
          700: '#2A5A8A',
          900: '#0E2A4A',
        },

        // ── Override violet/purple → muted purple ────────────────
        violet: {
          400: '#8B5FC8',
          950: '#1A0E28',
        },
        purple: {
          400: '#7B4FAF',
          950: '#18102A',
        },
        pink: {
          400: '#C4528A',
          950: '#28101C',
        },
        teal: {
          400: '#3A9A8A',
          950: '#081A18',
        },
      },
      fontFamily: {
        display: ['"Cinzel"', 'Georgia', 'serif'],
        serif:   ['"Crimson Text"', 'Georgia', 'serif'],
        sans:    ['"Inter"', 'system-ui', 'sans-serif'],
        heading: ['"Cinzel"', 'Georgia', 'serif'],  // legacy alias
      },
      spacing: {
        '4.5': '1.125rem',
        '13':  '3.25rem',
        '18':  '4.5rem',
      },
      boxShadow: {
        'gold-glow':    '0 0 12px rgba(201,168,76,0.40), 0 0 24px rgba(201,168,76,0.15)',
        'gold-glow-sm': '0 0 6px rgba(201,168,76,0.30)',
        'inner-dark':   'inset 0 2px 8px rgba(0,0,0,0.60)',
        'card':         '0 4px 16px rgba(0,0,0,0.50), 0 1px 0 rgba(201,168,76,0.10)',
      },
      borderRadius: {
        'sm': '4px',
      },
    },
  },
  plugins: [],
}
