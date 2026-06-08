import { Inter, Outfit } from 'next/font/google';
import { AuthHydrate } from '@/components/AuthHydrate';
import { ThemeHydrate, themeInitScript } from '@/components/ThemeHydrate';
import { AppFrame } from '@/components/layout/AppFrame';
import { BrandProvider } from '@/hooks/useBranding';
import { ActiveThemeProvider } from '@/hooks/useActiveTheme';
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
            <ActiveThemeProvider>
              <AuthHydrate>
                <AppFrame>{children}</AppFrame>
              </AuthHydrate>
            </ActiveThemeProvider>
          </BrandProvider>
        </ThemeHydrate>
      </body>
    </html>
  );
}
