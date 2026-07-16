'use client';

// Home-page hero banner carousel. Fully image-driven and controlled by the
// product admin (/admin -> Banners). Theme-neutral so every theme can drop it
// in where its hero used to be. Renders nothing when there are no banners, so
// callers fall back to their own default hero.

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const AUTOPLAY_MS = 5000;

function BannerImage({ banner }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={banner.image_url}
      alt={banner.title || ''}
      className="h-full w-full object-cover"
      loading="eager"
      draggable={false}
    />
  );
}

function Slide({ banner }) {
  if (banner.link_url) {
    const external = /^https?:\/\//i.test(banner.link_url);
    if (external) {
      return (
        <a href={banner.link_url} target="_blank" rel="noreferrer" className="block h-full w-full">
          <BannerImage banner={banner} />
        </a>
      );
    }
    return (
      <Link href={banner.link_url} className="block h-full w-full">
        <BannerImage banner={banner} />
      </Link>
    );
  }
  return <BannerImage banner={banner} />;
}

export default function BannerCarousel({ banners, className = '', aspectClassName = 'aspect-[16/6]' }) {
  const [index, setIndex] = useState(0);
  const count = banners?.length ?? 0;

  const go = useCallback(
    (dir) => setIndex((i) => (i + dir + count) % count),
    [count],
  );

  // Keep the active index valid if the banner list shrinks.
  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  // Autoplay, paused while the pointer is over the carousel.
  const paused = useRef(false);
  useEffect(() => {
    if (count <= 1) return undefined;
    const id = setInterval(() => {
      if (!paused.current) setIndex((i) => (i + 1) % count);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [count]);

  if (count === 0) return null;

  return (
    <section
      className={`relative overflow-hidden rounded-3xl ${className}`}
      onMouseEnter={() => { paused.current = true; }}
      onMouseLeave={() => { paused.current = false; }}
      aria-roledescription="carousel"
    >
      <div className={`relative w-full ${aspectClassName}`}>
        {banners.map((banner, i) => (
          <div
            key={banner.id ?? i}
            className={`absolute inset-0 transition-opacity duration-700 ${i === index ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
            aria-hidden={i !== index}
          >
            <Slide banner={banner} />
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous banner"
            className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next banner"
            className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to banner ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
