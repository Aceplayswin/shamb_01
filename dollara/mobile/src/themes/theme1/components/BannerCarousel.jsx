// Home hero carousel — image-driven and controlled by the product admin
// (/api/v1/banners). Renders nothing when there are no banners, so the caller
// falls back to its own default hero.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useThemedStyles } from '../../useThemedStyles';
import { radius, spacing } from '../../palettes';

const AUTOPLAY_MS = 5000;
const ASPECT = 16 / 9;

const styles = (t) => ({
  wrap: { marginBottom: spacing.xxl },
  frame: { borderRadius: radius.xxl, overflow: 'hidden', backgroundColor: t.panel },
  image: { width: '100%', height: '100%' },
  dots: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  dot: { height: 5, width: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { width: 18, backgroundColor: '#fff' },
});

export function BannerCarousel({ banners, onNavigate }) {
  const s = useThemedStyles(styles);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const scrollRef = useRef(null);
  const count = banners?.length ?? 0;
  // Suspend autoplay while the player is dragging, so it can't yank the slide
  // out from under their finger.
  const interacting = useRef(false);

  const goTo = useCallback(
    (next) => {
      if (!width) return;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      setIndex(next);
    },
    [width],
  );

  useEffect(() => {
    if (count <= 1 || !width) return undefined;
    const id = setInterval(() => {
      if (interacting.current) return;
      setIndex((i) => {
        const next = (i + 1) % count;
        scrollRef.current?.scrollTo({ x: next * width, animated: true });
        return next;
      });
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [count, width]);

  // Keep the active index valid if the banner list shrinks under us.
  useEffect(() => {
    if (count && index >= count) goTo(0);
  }, [count, index, goTo]);

  if (!count) return null;

  const open = (banner) => {
    if (!banner.link_url) return;
    if (/^https?:\/\//i.test(banner.link_url)) Linking.openURL(banner.link_url).catch(() => {});
    else onNavigate?.(banner.link_url);
  };

  return (
    <View style={s.wrap}>
      <View
        style={[s.frame, { height: width ? width / ASPECT : undefined }]}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        {width ? (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScrollBeginDrag={() => {
              interacting.current = true;
            }}
            onScrollEndDrag={() => {
              interacting.current = false;
            }}
            onMomentumScrollEnd={(e) =>
              setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
            }
          >
            {banners.map((banner, i) => (
              <Pressable
                key={banner.id ?? i}
                onPress={() => open(banner)}
                disabled={!banner.link_url}
                accessibilityRole={banner.link_url ? 'link' : 'image'}
                accessibilityLabel={banner.title || `Banner ${i + 1}`}
                style={{ width, height: width / ASPECT }}
              >
                <Image
                  source={{ uri: banner.image_url }}
                  style={s.image}
                  resizeMode="cover"
                />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {count > 1 ? (
          <View pointerEvents="box-none" style={s.dots}>
            {banners.map((_, i) => (
              <Pressable
                key={i}
                onPress={() => goTo(i)}
                accessibilityRole="button"
                accessibilityLabel={`Go to banner ${i + 1}`}
                hitSlop={8}
                style={[s.dot, i === index && s.dotActive]}
              />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}
