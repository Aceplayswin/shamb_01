// Theme 1 — "Aurora" (default). The original Dollara design, unchanged.
// Chrome is the existing layout components; only the homepage body moved here.

export { Header } from '@/components/layout/Header';
export { Footer } from '@/components/layout/Footer';
export { default as Home } from './Home';

// Original app-shell offsets: top bar (h-16), desktop side rail (w-[92px]),
// mobile bottom tab bar.
export const frameClassName = 'min-h-screen pt-16 pb-20 lg:pb-0 lg:pl-[92px]';
