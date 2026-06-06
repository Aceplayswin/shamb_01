/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff8eb',
          100: '#ffefc6',
          200: '#ffdf88',
          300: '#ffcb4a',
          400: '#ffb218',
          500: '#ff9800', // Primary amber from logo
          600: '#e67e00',
          700: '#bf5d00',
          800: '#994700',
          900: '#7d3c05',
          950: '#4a1e00',
        },
        // Secondary accent — violet. Pairs with amber for a premium, non-generic look.
        accent: {
          50: '#f3f0ff',
          100: '#e9e3ff',
          200: '#d6cbff',
          300: '#b8a3ff',
          400: '#9670ff',
          500: '#7c4dff',
          600: '#6a35f0',
          700: '#5a26cc',
          800: '#4a21a6',
          900: '#3e1f85',
          950: '#251056',
        },
        // Positive / live states
        emerald: {
          400: '#34d399',
          500: '#10d27a',
          600: '#06b36a',
        },
        surface: {
          950: '#08070d', // Deepest base
          900: '#0d0b14', // Main background (cool near-black)
          800: '#15131f', // Cards
          700: '#211d30', // Raised / borders
          600: '#322c46',
        },
        // Theme-aware tokens — values swap between dark/light via CSS vars in globals.css.
        // Use these (instead of `surface-*` / `white` / `slate-*`) for chrome that should
        // adapt to the active theme; keep `surface-*` where a fixed dark tone is required
        // (e.g. ink on bright gradient buttons, which must stay legible in both themes).
        app: {
          bg: 'rgb(var(--color-app-bg) / <alpha-value>)',
          fg: 'rgb(var(--color-app-fg) / <alpha-value>)',
        },
        rail: 'rgb(var(--color-rail) / <alpha-value>)',
        panel: {
          DEFAULT: 'rgb(var(--color-panel) / <alpha-value>)',
          strong: 'rgb(var(--color-panel-strong) / <alpha-value>)',
        },
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        hairline: 'rgb(var(--color-hairline) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,152,0,0.25), 0 10px 40px -10px rgba(255,152,0,0.45)',
        'glow-violet': '0 0 0 1px rgba(124,77,255,0.3), 0 10px 40px -10px rgba(124,77,255,0.55)',
        card: '0 20px 50px -20px rgba(0,0,0,0.8)',
      },
      backgroundImage: {
        'mesh-amber':
          'radial-gradient(120% 120% at 0% 0%, rgba(255,152,0,0.18) 0%, transparent 45%), radial-gradient(120% 120% at 100% 100%, rgba(124,77,255,0.16) 0%, transparent 50%)',
        'mesh-violet':
          'radial-gradient(120% 120% at 100% 0%, rgba(124,77,255,0.22) 0%, transparent 50%), radial-gradient(120% 120% at 0% 100%, rgba(16,210,122,0.1) 0%, transparent 55%)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2.4s ease-in-out infinite',
        marquee: 'marquee 28s linear infinite',
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        'fade-up': 'fade-up 0.5s ease-out both',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255, 152, 0, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(255, 152, 0, 0.6)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
