import { Inter, Outfit } from 'next/font/google';
import { BrandProvider } from '@/hooks/useBranding';
import './globals.css';

// Outfit backs the `font-display` Tailwind family and Inter backs `font-sans`.
// Both are declared in tailwind.config.js as var(--font-inter) / var(--font-outfit);
// until these were loaded those variables were undefined, so every heading
// silently fell back to system-ui.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

// Static fallback title; useBranding sets the real product name at runtime
// once branding loads (Next.js metadata can't be dynamic from a client fetch).
export const metadata = {
  title: 'Affiliate Portal',
  description:
    'Partner portal for the affiliate programme — tracking links, '
    + 'referrals, commission and payouts.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <BrandProvider>{children}</BrandProvider>
      </body>
    </html>
  );
}
