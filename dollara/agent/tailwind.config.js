/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // The panel is a single dark console, not a themeable surface — an
        // operator works in it all day and a light mode was never asked for.
        // Named by role so a screen never hardcodes a hex.
        shell: {
          bg: '#131a2b',      // page
          nav: '#232c43',     // top navigation bar
          rail: '#2a3450',    // the collapse strip under the nav
          foot: '#1e2739',    // footer
        },
        panel: {
          DEFAULT: '#212b42', // cards, tables
          sunken: '#1b2439',  // filter blocks inside a card
          head: '#2a3550',    // table headers
          hover: '#28324c',
        },
        hairline: '#374362',
        ink: {
          DEFAULT: '#e6eaf3',
          muted: '#9aa5bd',
          faint: '#6d7996',
        },
        // Result colours. Positive money is green, negative is red, everywhere.
        up: '#4ade80',
        down: '#f87171',
      },
      fontFamily: {
        sans: ['var(--font-roboto)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0, 0, 0, 0.35)',
        menu: '0 12px 32px -8px rgba(0, 0, 0, 0.7)',
      },
      animation: {
        'fade-up': 'fade-up 0.25s ease-out both',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
