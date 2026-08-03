/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'rgb(var(--brand-50, 255 252 240) / <alpha-value>)',
          100: 'rgb(var(--brand-100, 255 246 214) / <alpha-value>)',
          200: 'rgb(var(--brand-200, 252 236 174) / <alpha-value>)',
          300: 'rgb(var(--brand-300, 249 223 128) / <alpha-value>)',
          400: 'rgb(var(--brand-400, 247 211 92) / <alpha-value>)',
          500: 'rgb(var(--brand-500, 245 197 66) / <alpha-value>)', // Primary Gold
          600: 'rgb(var(--brand-600, 255 184 0) / <alpha-value>)',
          700: 'rgb(var(--brand-700, 217 154 0) / <alpha-value>)',
          800: 'rgb(var(--brand-800, 166 119 0) / <alpha-value>)',
          900: 'rgb(var(--brand-900, 122 88 0) / <alpha-value>)',
          950: 'rgb(var(--brand-950, 67 47 0) / <alpha-value>)',
        },
        emerald: {
          300: '#7af0bb',
          400: '#34e08a',
          500: '#00D26A',
          600: '#00b25a',
        },
        danger: {
          300: '#ffb3b4',
          400: '#ff7a7b',
          500: '#FF4D4F',
          600: '#e63b3d',
        },
        // Rich Midnight Sapphire & Indigo Palette
        surface: {
          950: '#0A101C', // Deepest background
          900: '#0E1728', // Container dark
          800: '#16233B', // Glass card surface
          700: '#1E3050',
          600: '#2A436C',
        },
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
        glow: '0 0 30px rgba(245,197,66,0.35), 0 10px 45px -10px rgba(14,165,233,0.3)',
        card: '0 25px 60px -15px rgba(2,6,15,0.95)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2.4s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        'fade-up': 'fade-up 0.5s ease-out both',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(245, 197, 66, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(245, 197, 66, 0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
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
