import { useRef, useEffect, useCallback, type HTMLAttributes, type RefObject } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GridItem {
  id: number | string;
  [key: string]: unknown;
}

export interface UseGridProps<T extends GridItem> {
  /** The array of items to render in the grid */
  items: T[];
  /** Called when the user clicks/activates an item */
  onItemClick?: (item: T, index: number) => void;
  /** Called when the scroll sentinel enters the viewport (infinite scroll trigger) */
  onLoadMore?: () => void;
  /** Whether there are more pages to load */
  hasMore?: boolean;
  /** Whether a page is currently loading */
  loading?: boolean;
}

export interface UseGridResult<T extends GridItem> {
  /**
   * Spread onto your grid container element.
   * Provides role="list" for accessibility.
   */
  getContainerProps: () => HTMLAttributes<HTMLElement>;

  /**
   * Spread onto each grid item element. Provides:
   * - role="listitem"
   * - onClick handler
   * - onKeyDown handler (Enter/Space activate the item — keyboard a11y)
   * - tabIndex={0} for keyboard focus
   * - aria-posinset and aria-setsize
   */
  getItemProps: (item: T, index: number) => HTMLAttributes<HTMLElement>;

  /**
   * Spread onto a sentinel element placed after the last grid item.
   * The hook attaches an IntersectionObserver to this ref.
   * When the sentinel enters the viewport, onLoadMore() is called.
   *
   * @example
   * ```tsx
   * const { getSentinelProps } = useGrid({ ... });
   * // ...
   * <div {...getSentinelProps()} aria-hidden="true" />
   * ```
   */
  getSentinelProps: () => { ref: RefObject<HTMLDivElement> };

  isLoading: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * useGrid — headless grid with infinite scroll via IntersectionObserver.
 *
 * This hook provides ONLY behavior:
 * - Prop-getters for container and items (ARIA + event handlers)
 * - A sentinel ref that triggers onLoadMore when visible
 *
 * It provides ZERO styles. The consumer owns all markup and CSS.
 *
 * @example
 * ```tsx
 * const { getContainerProps, getItemProps, getSentinelProps } = useGrid({
 *   items: photos,
 *   onItemClick: (photo) => openLightbox(photo),
 *   onLoadMore: loadMore,
 *   hasMore,
 *   loading,
 * });
 *
 * return (
 *   <ul {...getContainerProps()} className="my-grid">
 *     {photos.map((photo, i) => (
 *       <li key={photo.id} {...getItemProps(photo, i)} className="my-grid-item">
 *         <img src={photo.src.medium} alt={photo.alt} />
 *       </li>
 *     ))}
 *     <div {...getSentinelProps()} />
 *   </ul>
 * );
 * ```
 */
export function useGrid<T extends GridItem>({
  items,
  onItemClick,
  onLoadMore,
  hasMore = false,
  loading = false,
}: UseGridProps<T>): UseGridResult<T> {
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setSentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      sentinelRef.current = node;

      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      if (node && hasMore && !loading) {
        const observer = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            if (entry?.isIntersecting) {
              onLoadMoreRef.current?.();
            }
          },
          { threshold: 0.1 }
        );
        observer.observe(node);
        observerRef.current = observer;
      }
    },
    [hasMore, loading]
  );

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const getContainerProps = useCallback(
    (): HTMLAttributes<HTMLElement> => ({
      role: 'list',
    }),
    []
  );

  const getItemProps = useCallback(
    (item: T, index: number): HTMLAttributes<HTMLElement> => ({
      role: 'listitem',
      tabIndex: 0,
      'aria-posinset': index + 1,
      'aria-setsize': items.length,
      onClick: () => onItemClick?.(item, index),
      onKeyDown: (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onItemClick?.(item, index);
        }
      },
    }),
    [items.length, onItemClick]
  );

  const getSentinelProps = useCallback(
    () => ({ ref: setSentinelRef as unknown as RefObject<HTMLDivElement> }),
    [setSentinelRef]
  );

  return {
    getContainerProps,
    getItemProps,
    getSentinelProps,
    isLoading: loading,
  };
}
