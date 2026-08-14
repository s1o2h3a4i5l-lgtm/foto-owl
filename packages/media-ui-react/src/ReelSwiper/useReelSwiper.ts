import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type HTMLAttributes,
  type RefObject,
} from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ReelItem {
  id: number | string;
  [key: string]: unknown;
}

export interface UseReelSwiperProps<T extends ReelItem> {
  items: T[];
  /** Called when the active (centered) item changes */
  onActiveChange?: (item: T, index: number) => void;
}

export interface UseReelSwiperResult<T extends ReelItem> {
  /** The index of the currently visible/centered slide */
  activeIndex: number;

  /**
   * Spread on the scroll container.
   *
   * The hook tracks scroll position to compute activeIndex.
   * The consumer is responsible for making the container a vertical snap
   * scroll container via CSS. Example:
   *
   * ```css
   * .reel-container {
   *   height: 100vh;
   *   overflow-y: scroll;
   *   scroll-snap-type: y mandatory;
   * }
   * ```
   */
  getContainerProps: () => {
    ref: RefObject<HTMLDivElement>;
    onScroll: () => void;
  } & HTMLAttributes<HTMLElement>;

  /**
   * Spread on each slide element.
   * Provides aria-current="true" on the active slide.
   *
   * ```css
   * .reel-slide {
   *   scroll-snap-align: start;
   *   height: 100vh;
   * }
   * ```
   */
  getSlideProps: (item: T, index: number) => HTMLAttributes<HTMLElement>;

  /** Programmatically scroll to a specific slide */
  scrollTo: (index: number) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * useReelSwiper — headless vertical snap scroll with active-item tracking.
 *
 * This hook provides:
 * - A ref + onScroll handler to track which slide is currently centered
 * - A scrollTo() helper for programmatic navigation
 * - aria-current on the active slide
 *
 * It does NOT provide any CSS. The consumer must implement scroll-snap
 * on the container and size each slide appropriately.
 *
 * @example
 * ```tsx
 * const { getContainerProps, getSlideProps, activeIndex } = useReelSwiper({
 *   items: videos,
 *   onActiveChange: (video) => emitView({ mediaType: 'video', id: video.id }),
 * });
 *
 * return (
 *   <div {...getContainerProps()} className="reel">
 *     {videos.map((video, i) => (
 *       <div key={video.id} {...getSlideProps(video, i)} className="reel-slide">
 *         <video src={video.videoFiles[0]?.link} />
 *       </div>
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useReelSwiper<T extends ReelItem>({
  items,
  onActiveChange,
}: UseReelSwiperProps<T>): UseReelSwiperResult<T> {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const onActiveChangeRef = useRef(onActiveChange);
  onActiveChangeRef.current = onActiveChange;

  // Derive active index from scroll position
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, clientHeight } = container;
    // Which slide is closest to center
    const newIndex = clientHeight > 0 ? Math.round(scrollTop / clientHeight) : 0;
    const clamped = Math.max(0, Math.min(newIndex, items.length - 1));

    if (clamped !== activeIndex) {
      setActiveIndex(clamped);
      const item = items[clamped];
      if (item) onActiveChangeRef.current?.(item, clamped);
    }
  }, [activeIndex, items]);

  // Initial call to set correct active index on mount
  useEffect(() => {
    handleScroll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollTo = useCallback(
    (index: number) => {
      const container = containerRef.current;
      if (!container) return;
      const clamped = Math.max(0, Math.min(index, items.length - 1));
      container.scrollTo({
        top: clamped * container.clientHeight,
        behavior: 'smooth',
      });
    },
    [items.length]
  );

  const getContainerProps = useCallback(
    () => ({
      ref: containerRef,
      onScroll: handleScroll,
    }),
    [handleScroll]
  );

  const getSlideProps = useCallback(
    (_item: T, index: number): HTMLAttributes<HTMLElement> => ({
      'aria-current': index === activeIndex ? ('true' as const) : undefined,
    }),
    [activeIndex]
  );

  return {
    activeIndex,
    getContainerProps,
    getSlideProps,
    scrollTo,
  };
}
