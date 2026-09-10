'use client';

import { MessageCircle } from 'lucide-react';

const SUPPORT_URL = 'https://wa.link/ranamatch';

/**
 * Floating "chat with support" button, pinned bottom-right. Home page only —
 * every theme's Home renders it as the last child of its root element.
 *
 * `className` lets a theme lift the button above its own fixed chrome (theme1's
 * mobile tab bar, for example).
 */
export default function SupportFab({ className = '' }) {
  return (
    <a
      href={SUPPORT_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with support on WhatsApp"
      title="Chat with support"
      className={`fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/30 transition-transform duration-200 hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366] ${className}`}
    >
      <MessageCircle className="h-7 w-7" fill="currentColor" strokeWidth={0} />
    </a>
  );
}
