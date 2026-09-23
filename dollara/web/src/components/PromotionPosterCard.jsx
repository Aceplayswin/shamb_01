'use client';

// Shared promotion poster tile — image-driven offer card from admin
// Content → Promotions. Optional link; non-clickable when link_url is empty.

import Link from 'next/link';

function PosterImage({ poster, className = '' }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={poster.image_url}
      alt={poster.title || 'Promotion'}
      className={`h-full w-full object-cover ${className}`}
    />
  );
}

export default function PromotionPosterCard({ poster, className = '' }) {
  const frame = `block overflow-hidden rounded-xl ${className}`;

  // The admin-entered title is shown on the card. It used to exist only as the
  // image's alt text, so a promotion saved with a title rendered as a bare
  // image and the title never appeared on the site.
  const body = (
    <>
      <div className="aspect-[16/9] w-full bg-black/20">
        <PosterImage poster={poster} />
      </div>
      {poster.title && (
        <div className="bg-white/[0.04] px-3 py-2">
          <p className="truncate text-sm font-black text-current">{poster.title}</p>
        </div>
      )}
    </>
  );

  if (!poster.link_url) {
    return <div className={frame}>{body}</div>;
  }

  const external = /^https?:\/\//i.test(poster.link_url);
  if (external) {
    return (
      <a href={poster.link_url} target="_blank" rel="noreferrer" className={frame}>
        {body}
      </a>
    );
  }

  return (
    <Link href={poster.link_url} className={frame}>
      {body}
    </Link>
  );
}
