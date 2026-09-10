import { Inter, Outfit } from 'next/font/google';
import { AttributionCapture } from '@/components/AttributionCapture';
import { AuthHydrate } from '@/components/AuthHydrate';
import { ThemeHydrate, themeInitScript } from '@/components/ThemeHydrate';
import { BrandProvider } from '@/hooks/useBranding';
import { ProductThemeProvider } from '@/hooks/useProductTheme';
import { AuthModalProvider } from '@/hooks/useAuthModal';
import { InstallProvider } from '@/hooks/useInstallPrompt';
import { ThemeShell } from '@/themes/ThemeShell';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata = {
  title: 'Online Gaming Platform',
  description: 'Play casino, sports, slots, lottery and AI games',
  applicationName: 'Gaming App',
  // Installable PWA. The manifest itself is branded per product at /manifest.webmanifest
  // (src/app/manifest.js); these are the build-time defaults, re-pointed to the
  // brand's logo/name at runtime by useBranding.
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    // Opaque dark status bar so standalone content never hides under the notch.
    statusBarStyle: 'black',
    title: 'Gaming App',
  },
  icons: {
    // favicon.ico (multi-resolution, 16-256) is the default fallback: browsers
    // request /favicon.ico by path whether or not these tags render, so it is
    // what shows before branding loads and on any route that misses the head.
    // Both it and the square icon.png are the logo's emblem, cropped out of the
    // wide lockup — the wordmark beside it is unreadable at tab size.
    // useBranding swaps in the product's own favicon / app icon at runtime.
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icon.png', sizes: '512x512', type: 'image/png' }],
  },
  formatDetection: { telephone: false },
};

export const viewport = {
  themeColor: '#0B0F14',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
      <head>
        {/* Sets the theme class before first paint to avoid a flash of the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans antialiased">
        {/* Captures ?ref/&sub/&clk from an affiliate tracking link. Renders
            nothing, needs no context, and must run on every route because a
            tracking link can point at any landing page. */}
        <AttributionCapture />
        <InstallProvider>
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
        </InstallProvider>
      </body>
    </html>
  );
}
