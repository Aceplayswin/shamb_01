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
          500: '#ff9800', // Primary orange from logo
          600: '#e67e00',
          700: '#bf5d00',
          800: '#994700',
          900: '#7d3c05',
          950: '#4a1e00',
        },
        surface: {
          900: '#121212', // Main background
          800: '#1a1a1a', // Secondary background (cards, etc.)
          700: '#242424', // Lighter borders/backgrounds
          600: '#333333',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255, 152, 0, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(255, 152, 0, 0.6)' },
        },
      },
    },
  },
  plugins: [],
};
