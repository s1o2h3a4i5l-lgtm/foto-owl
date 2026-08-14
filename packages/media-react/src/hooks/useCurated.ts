import { useState, useEffect, useCallback } from 'react';
import type { Photo, PaginationParams, MediaError } from '@foto-owl/media-core';
import { useMediaContext } from '../context.js';

export interface UseCuratedOptions {
  perPage?: number;
  enabled?: boolean;
}

export interface UseCuratedResult {
  photos: Photo[];
  loading: boolean;
  error: MediaError | Error | null;
  loadMore: () => void;
  hasMore: boolean;
}

/**
 * Fetches Pexels curated/trending photos with infinite scroll support.
 *
 * @example
 * ```tsx
 * const { photos, loading, loadMore, hasMore } = useCurated();
 * ```
 */
export function useCurated(options: UseCuratedOptions = {}): UseCuratedResult {
  const { client } = useMediaContext();
  const { perPage = 20, enabled = true } = options;

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<MediaError | Error | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const params: PaginationParams = { page, perPage };

    client
      .getCuratedPhotos(params)
      .then((result) => {
        if (cancelled) return;
        setPhotos((prev) => {
          if (page === 1) return result.photos;
          const existingIds = new Set(prev.map((p) => p.id));
          const filtered = result.photos.filter((p) => !existingIds.has(p.id));
          return [...prev, ...filtered];
        });
        setHasMore(result.nextPage !== null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err as Error);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [client, page, perPage, enabled]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage((p) => p + 1);
    }
  }, [loading, hasMore]);

  return { photos, loading, error, loadMore, hasMore };
}
