// Theme 2 — "Midnight": horizontal top-nav layout, full-width hero, game grid.
// A deliberately different skin from theme1 to exercise the theme system. Uses
// the same branding CSS vars and design tokens, so per-product colors still apply.

export { Header } from './Header';
export { Footer } from './Footer';
export { default as Home } from './Home';

// Top-nav chrome: only offset the fixed header height. No side-rail padding,
// no mobile bottom-tab padding (this theme uses a top nav on all breakpoints).
export const frameClassName = 'min-h-screen pt-16';
