// Official Instagram brand glyph (full-color gradient mark) used only in the
// theme5 footer, replacing the flat currentColor Instagram icon.

export function InstagramIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="theme5-instagram-gradient" cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="5%" stopColor="#fdf497" />
          <stop offset="45%" stopColor="#fd5949" />
          <stop offset="60%" stopColor="#d6249f" />
          <stop offset="90%" stopColor="#285aeb" />
        </radialGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#theme5-instagram-gradient)" />
      <rect x="13" y="13" width="22" height="22" rx="6" fill="none" stroke="#fff" strokeWidth="2.5" />
      <circle cx="24" cy="24" r="6.2" fill="none" stroke="#fff" strokeWidth="2.5" />
      <circle cx="31.6" cy="16.4" r="1.6" fill="#fff" />
    </svg>
  );
}
