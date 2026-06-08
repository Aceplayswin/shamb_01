/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fffcf0',
          100: '#fff6d6',
          200: '#fcecae',
          300: '#f9df80',
          400: '#f7d35c',
          500: '#F5C542', // Primary
          600: '#FFB800', // Primary hover
          700: '#d99a00',
          800: '#a67700',
          900: '#7a5800',
          950: '#432f00',
        },
        // Positive / live states — built from the success green
        emerald: {
          300: '#7af0bb',
          400: '#34e08a',
          500: '#00D26A', // Success
          600: '#00b25a',
        },
        // Errors / destructive actions
        danger: {
          300: '#ffb3b4',
          400: '#ff7a7b',
          500: '#FF4D4F', // Danger
          600: '#e63b3d',
        },
        red: {
          400: '#ff7a7b',
          500: '#FF4D4F',
          600: '#e63b3d',
        },
        surface: {
          950: '#0B0F14', // App background
          900: '#0e1318',
          800: '#151A21', // Cards / surfaces
          700: '#1e252e',
          600: '#2a323d',
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
        glow: '0 0 0 1px rgba(245,197,66,0.25), 0 10px 40px -10px rgba(245,197,66,0.45)',
        card: '0 20px 50px -20px rgba(0,0,0,0.8)',
      },
      backgroundImage: {
        'mesh-amber':
          'radial-gradient(120% 120% at 0% 0%, rgba(245,197,66,0.18) 0%, transparent 45%), radial-gradient(120% 120% at 100% 100%, rgba(255,184,0,0.14) 0%, transparent 50%)',
        'mesh-violet':
          'radial-gradient(120% 120% at 100% 0%, rgba(255,184,0,0.2) 0%, transparent 50%), radial-gradient(120% 120% at 0% 100%, rgba(0,210,106,0.1) 0%, transparent 55%)',
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
          '0%, 100%': { boxShadow: '0 0 20px rgba(245, 197, 66, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(245, 197, 66, 0.6)' },
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
