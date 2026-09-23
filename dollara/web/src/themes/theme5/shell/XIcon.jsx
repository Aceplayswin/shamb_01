// Custom X glyph (Font Awesome 7 "brands" style) used only in the theme5
// footer, replacing the default lucide-react Twitter icon.

export function XIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 640 640" fill="currentColor" className={className} aria-hidden="true">
      <path d="M453.2 112L523.8 112L369.6 288.2L551 528L409 528L297.7 382.6L170.5 528L99.8 528L264.7 339.5L90.8 112L236.4 112L336.9 244.9L453.2 112zM428.4 485.8L467.5 485.8L215.1 152L173.1 152L428.4 485.8z" />
    </svg>
  );
}
