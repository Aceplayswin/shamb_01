import { Inter, Outfit } from 'next/font/google';
import { BrandProvider } from '@/hooks/useBranding';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata = {
  title: 'Admin Console',
  description: 'Operator console for the gaming platform',
};

// The admin console is a standalone app: it renders its own chrome (AdminShell)
// and is dark-only, so there is no player ThemeShell here. BrandProvider only
// supplies the product name / logo shown in the console header.
export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <BrandProvider>{children}</BrandProvider>
      </body>
    </html>
  );
}
