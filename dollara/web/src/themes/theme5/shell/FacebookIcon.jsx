// Custom Facebook glyph (Font Awesome 7 "brands" style) used only in the
// theme5 footer, replacing the default lucide-react Facebook icon.

export function FacebookIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 640 640" fill="currentColor" className={className} aria-hidden="true">
      <path d="M240 363.3L240 576L356 576L356 363.3L442.5 363.3L460.5 265.5L356 265.5L356 230.9C356 179.2 376.3 159.4 428.7 159.4C445 159.4 458.1 159.8 465.7 160.6L465.7 71.9C451.4 68 416.4 64 396.2 64C289.3 64 240 114.5 240 223.4L240 265.5L174 265.5L174 363.3L240 363.3z" />
    </svg>
  );
}
