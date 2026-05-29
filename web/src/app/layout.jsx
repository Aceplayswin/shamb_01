import { Inter, Outfit } from 'next/font/google';
import { AuthHydrate } from '@/components/AuthHydrate';
import { AppFrame } from '@/components/layout/AppFrame';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata = {
  title: 'DOLLARA - Online Gaming Platform',
  description: 'Play casino, sports, slots, lottery and AI games',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className="font-sans antialiased">
        <AuthHydrate>
          <AppFrame>{children}</AppFrame>
        </AuthHydrate>
      </body>
    </html>
  );
}
