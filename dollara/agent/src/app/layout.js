import { Roboto } from 'next/font/google';
import './globals.css';

// Roboto backs the `font-sans` Tailwind family, declared in tailwind.config.js
// as var(--font-roboto). Loading it here is what makes that variable defined;
// without it every screen silently falls back to system-ui.
const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-roboto',
});

export const metadata = {
  title: 'Dollara Agent Panel',
  description:
    'Downline console for Dollara agents — sport analysis, clients, players, '
    + 'credit and P&L reporting.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={roboto.variable} suppressHydrationWarning>
      <body className="bg-shell-bg font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
