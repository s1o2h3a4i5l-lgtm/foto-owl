import { useState, useEffect, useCallback, useRef } from 'react';
import type { NativeSyntheticEvent, NativeScrollEvent, ScrollViewProps } from 'react-native';

export interface ReelItem {
  id: number | string;
  [key: string]: unknown;
}

export interface UseReelSwiperProps<T extends ReelItem> {
  items: T[];
  onActiveChange?: (item: T, index: number) => void;
  /** Height of each slide in pixels (required for scroll math) */
  slideHeight: number;
}

export interface UseReelSwiperResult<T extends ReelItem> {
  activeIndex: number;

  /**
   * Spread onto a ScrollView.
   * Provides: pagingEnabled, showsVerticalScrollIndicator=false,
   * onScroll handler, scrollEventThrottle, ref.
   *
   * The consumer must set a fixed height matching slideHeight.
   */
  getScrollViewProps: () => Partial<ScrollViewProps> & {
    ref: React.RefObject<import('react-native').ScrollView | null>;
  };

  /**
   * Returns props for each slide.
   * Provides: accessible, aria-current equivalent (accessibilityState.selected)
   */
  getSlideProps: (item: T, index: number) => {
    accessible: boolean;
    accessibilityState: { selected: boolean };
    style: { height: number };
  };

  /** Programmatically scroll to a specific slide */
  scrollTo: (index: number) => void;
}

/**
 * useReelSwiper (React Native) — headless vertical paging scroll.
 *
 * Uses ScrollView with pagingEnabled instead of CSS scroll-snap.
 * Tracks active index via onScroll position.
 *
 * Note: Requires slideHeight prop because RN scroll math needs the pixel value.
 *
 * Zero styles — the consumer controls all visual presentation.
 */
export function useReelSwiper<T extends ReelItem>({
  items,
  onActiveChange,
  slideHeight,
}: UseReelSwiperProps<T>): UseReelSwiperResult<T> {
  const [activeIndex, setActiveIndex] = useState(0);
  // We use a ref instead of importing ScrollView to avoid type coupling issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scrollViewRef = useRef<any>(null);
  const onActiveChangeRef = useRef(onActiveChange);
  onActiveChangeRef.current = onActiveChange;

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e.nativeEvent.contentOffset.y;
      const newIndex = Math.round(offsetY / slideHeight);
      const clamped = Math.max(0, Math.min(newIndex, items.length - 1));
      if (clamped !== activeIndex) {
        setActiveIndex(clamped);
        const item = items[clamped];
        if (item) onActiveChangeRef.current?.(item, clamped);
      }
    },
    [activeIndex, items, slideHeight]
  );

  const scrollTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, items.length - 1));
      scrollViewRef.current?.scrollTo({ y: clamped * slideHeight, animated: true });
    },
    [items.length, slideHeight]
  );

  const getScrollViewProps = useCallback(
    () => ({
      ref: scrollViewRef,
      pagingEnabled: true,
      showsVerticalScrollIndicator: false,
      onScroll: handleScroll,
      scrollEventThrottle: 16,
    }),
    [handleScroll]
  );

  const getSlideProps = useCallback(
    (_item: T, index: number) => ({
      accessible: true,
      accessibilityState: { selected: index === activeIndex },
      style: { height: slideHeight },
    }),
    [activeIndex, slideHeight]
  );

  return { activeIndex, getScrollViewProps, getSlideProps, scrollTo };
}
