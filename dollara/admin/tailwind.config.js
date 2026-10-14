/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Backoffice console surface tokens (see globals.css). Fixed dark navy —
        // this console has no light mode, so these are plain CSS vars rather
        // than the alpha-capable RGB triplets the player apps use.
        bo: {
          bg: 'var(--bo-bg)',
          header: 'var(--bo-header)',
          nav: 'var(--bo-nav)',
          panel: 'var(--bo-panel)',
          panel2: 'var(--bo-panel-2)',
          field: 'var(--bo-field)',
          line: 'var(--bo-line)',
          ink: 'var(--bo-ink)',
          muted: 'var(--bo-muted)',
          accent: 'var(--bo-accent)',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-outfit)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.25s ease-out both',
      },
    },
  },
  plugins: [],
};
