import { useState, useEffect, useCallback } from 'react';
import type { Video, PaginationParams, MediaError } from '@foto-owl/media-core';
import { useMediaContext } from '../context.js';

export interface UseTrendingVideosOptions {
  perPage?: number;
  enabled?: boolean;
}

export interface UseTrendingVideosResult {
  videos: Video[];
  loading: boolean;
  error: MediaError | Error | null;
  loadMore: () => void;
  hasMore: boolean;
}

/**
 * Fetches Pexels trending videos with infinite scroll support.
 *
 * @example
 * ```tsx
 * const { videos, loading, loadMore, hasMore } = useTrendingVideos();
 * ```
 */
export function useTrendingVideos(options: UseTrendingVideosOptions = {}): UseTrendingVideosResult {
  const { client } = useMediaContext();
  const { perPage = 20, enabled = true } = options;

  const [videos, setVideos] = useState<Video[]>([]);
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
      .getTrendingVideos(params)
      .then((result) => {
        if (cancelled) return;
        setVideos((prev) => {
          if (page === 1) return result.videos;
          const existingIds = new Set(prev.map((v) => v.id));
          const filtered = result.videos.filter((v) => !existingIds.has(v.id));
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

  return { videos, loading, error, loadMore, hasMore };
}
