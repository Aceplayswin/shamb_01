export function GameThumbnail({ src, alt, className = '', imgClassName = 'h-full w-full object-cover' }) {
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt ?? ''} className={`${imgClassName} ${className}`.trim()} loading="lazy" />
  );
}
