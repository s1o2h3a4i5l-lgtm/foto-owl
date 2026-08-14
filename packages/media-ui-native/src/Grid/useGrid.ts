import { useCallback } from 'react';
import type { FlatListProps } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GridItem {
  id: number | string;
  [key: string]: unknown;
}

export interface UseGridProps<T extends GridItem> {
  items: T[];
  onItemClick?: (item: T, index: number) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  /** Number of columns for the grid. Default: 2 */
  numColumns?: number;
}

export interface UseGridResult<T extends GridItem> {
  /**
   * Spread onto a FlatList or FlashList.
   * Provides: data, keyExtractor, onEndReached, onEndReachedThreshold,
   * numColumns, and accessibility props.
   */
  getFlatListProps: () => Partial<FlatListProps<T>>;

  /**
   * Returns props for each rendered item.
   * Provides: accessible, accessibilityRole, onPress (via TouchableOpacity wrapper).
   */
  getItemProps: (item: T, index: number) => {
    accessible: boolean;
    accessibilityRole: 'button';
    onPress: () => void;
  };

  isLoading: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * useGrid (React Native) — headless grid with load-more for FlatList.
 *
 * Instead of IntersectionObserver (web), this hook uses FlatList's
 * built-in onEndReached to trigger load-more.
 *
 * No styles are shipped. The consumer controls rendering via FlatList's
 * renderItem prop.
 *
 * @example
 * ```tsx
 * const { getFlatListProps, getItemProps } = useGrid({
 *   items: photos,
 *   onItemClick: (photo) => openLightbox(photo),
 *   onLoadMore: loadMore,
 *   hasMore,
 *   loading,
 * });
 *
 * return (
 *   <FlatList
 *     {...getFlatListProps()}
 *     renderItem={({ item, index }) => (
 *       <TouchableOpacity {...getItemProps(item, index)}>
 *         <Image source={{ uri: item.src.medium }} style={styles.image} />
 *       </TouchableOpacity>
 *     )}
 *   />
 * );
 * ```
 */
export function useGrid<T extends GridItem>({
  items,
  onItemClick,
  onLoadMore,
  hasMore = false,
  loading = false,
  numColumns = 2,
}: UseGridProps<T>): UseGridResult<T> {
  const getFlatListProps = useCallback(
    (): Partial<FlatListProps<T>> => ({
      data: items,
      keyExtractor: (item) => String(item.id),
      numColumns,
      onEndReached: hasMore && !loading ? onLoadMore : undefined,
      onEndReachedThreshold: 0.5,
      accessible: true,
      accessibilityLabel: 'Media grid',
    }),
    [items, numColumns, hasMore, loading, onLoadMore]
  );

  const getItemProps = useCallback(
    (item: T, index: number) => ({
      accessible: true as const,
      accessibilityRole: 'button' as const,
      onPress: () => onItemClick?.(item, index),
    }),
    [onItemClick]
  );

  return { getFlatListProps, getItemProps, isLoading: loading };
}
