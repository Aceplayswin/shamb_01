import { Inter, Outfit } from 'next/font/google';
import './globals.css';

// Outfit backs the `font-display` Tailwind family and Inter backs `font-sans`.
// Both are declared in tailwind.config.js as var(--font-inter) / var(--font-outfit);
// until these were loaded those variables were undefined, so every heading
// silently fell back to system-ui.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata = {
  title: 'Dollara Affiliates',
  description:
    'Partner portal for the Dollara affiliate programme — tracking links, '
    + 'referrals, commission and payouts.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
