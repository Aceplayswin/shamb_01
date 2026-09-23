'use client';

// Floating WhatsApp support button — a round icon button pinned to the bottom
// -right of the viewport.
//
// HOME ROUTE ONLY: mounted in the theme5 shell and self-gated on the pathname,
// so it renders on "/" and on no other page.
//
// The mark is the WhatsApp glyph inlined as an SVG: the button carries no label,
// so the icon alone has to identify the channel, and lucide ships no brand
// icons (its MessageCircle is a generic speech bubble). Colour is the same
// green as the WhatsApp Support button in the footer.

import { usePathname } from 'next/navigation';
import { useSocialLinks } from '@/hooks/useSocialLinks';

function WhatsAppGlyph({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.896 9.83 9.83 0 0 1 2.892 6.994c-.003 5.45-4.437 9.884-9.884 9.884m8.413-18.297A11.8 11.8 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.548 4.142 1.588 5.945L.057 24l6.305-1.654a11.9 11.9 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.82 11.82 0 0 0 20.464 3.49" />
    </svg>
  );
}

export function WhatsAppButton() {
  const pathname = usePathname();
  const { whatsappUrl } = useSocialLinks();

  // Home only. Next normalises the route to "/" (a trailing-slash variant is
  // tolerated here so the button never silently disappears).
  if (pathname !== '/' && pathname !== '') return null;
  if (!whatsappUrl) return null;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp Support"
      title="WhatsApp Support"
      // theme5 has no fixed bottom bar (its rails are sticky, in normal flow),
      // so the button sits at the plain bottom-right inset. z-50 keeps it above
      // page chrome but below the z-[100] auth modals.
      className="fixed bottom-5 right-4 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#22a34a] text-white shadow-lg transition hover:brightness-110 sm:right-5"
    >
      <WhatsAppGlyph className="h-7 w-7" />
    </a>
  );
}
