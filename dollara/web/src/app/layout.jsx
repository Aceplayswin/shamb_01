import { Inter, Outfit } from 'next/font/google';
import { AuthHydrate } from '@/components/AuthHydrate';
import { ThemeHydrate, themeInitScript } from '@/components/ThemeHydrate';
import { BrandProvider } from '@/hooks/useBranding';
import { ProductThemeProvider } from '@/hooks/useProductTheme';
import { AuthModalProvider } from '@/hooks/useAuthModal';
import { ThemeShell } from '@/themes/ThemeShell';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata = {
  title: 'Online Gaming Platform',
  description: 'Play casino, sports, slots, lottery and AI games',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
      <head>
        {/* Sets the theme class before first paint to avoid a flash of the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans antialiased">
        <ThemeHydrate>
          <BrandProvider>
            <ProductThemeProvider>
              <AuthHydrate>
                <AuthModalProvider>
                  <ThemeShell>{children}</ThemeShell>
                </AuthModalProvider>
              </AuthHydrate>
            </ProductThemeProvider>
          </BrandProvider>
        </ThemeHydrate>
      </body>
    </html>
  );
}
