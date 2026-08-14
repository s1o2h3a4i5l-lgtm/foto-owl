import { useState, useEffect, useCallback, useRef } from 'react';
import type { Photo, Video, SearchPhotosParams, SearchVideosParams, MediaError } from '@foto-owl/media-core';
import { useMediaContext } from '../context.js';

export interface UseSearchOptions {
  perPage?: number;
  /** If false, the hook won't fetch until set to true. Useful for deferred queries. */
  enabled?: boolean;
}

export interface UseSearchResult {
  photos: Photo[];
  videos: Video[];
  loading: boolean;
  error: MediaError | Error | null;
  /** Load the next page and append results */
  loadMore: () => void;
  hasMore: boolean;
  /** Reset back to page 1 */
  reset: () => void;
}

/**
 * Searches Pexels for both photos and videos matching the query.
 *
 * - Results are accumulated (new pages appended) for infinite-scroll patterns.
 * - Changing `query` resets accumulated results back to page 1.
 * - Set `enabled: false` to hold the fetch (e.g., while the user is still typing).
 *
 * @example
 * ```tsx
 * const { photos, loading, loadMore, hasMore } = useSearch('mountains');
 * ```
 */
export function useSearch(
  query: string,
  options: UseSearchOptions = {}
): UseSearchResult {
  const { client } = useMediaContext();
  const { perPage = 20, enabled = true } = options;

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<MediaError | Error | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Track the current query to detect changes and reset
  const queryRef = useRef(query);

  useEffect(() => {
    if (!enabled || !query.trim()) {
      setPhotos([]);
      setVideos([]);
      setPage(1);
      setHasMore(false);
      return;
    }

    let activePage = page;
    if (queryRef.current !== query) {
      queryRef.current = query;
      activePage = 1;
      setPage(1);
      setPhotos([]);
      setVideos([]);
      setHasMore(false);
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const params: SearchPhotosParams & SearchVideosParams = {
      query,
      page: activePage,
      perPage,
    };

    Promise.all([
      client.searchPhotos(params),
      client.searchVideos(params),
    ])
      .then(([photoResult, videoResult]) => {
        if (cancelled) return;

        setPhotos((prev) => {
          if (activePage === 1) return photoResult.photos;
          const existingIds = new Set(prev.map((p) => p.id));
          const filtered = photoResult.photos.filter((p) => !existingIds.has(p.id));
          return [...prev, ...filtered];
        });

        setVideos((prev) => {
          if (activePage === 1) return videoResult.videos;
          const existingIds = new Set(prev.map((v) => v.id));
          const filtered = videoResult.videos.filter((v) => !existingIds.has(v.id));
          return [...prev, ...filtered];
        });

        setHasMore(photoResult.nextPage !== null || videoResult.nextPage !== null);
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
  }, [client, query, page, perPage, enabled]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage((p) => p + 1);
    }
  }, [loading, hasMore]);

  const reset = useCallback(() => {
    setPhotos([]);
    setVideos([]);
    setPage(1);
    setHasMore(false);
    setError(null);
  }, []);

  return { photos, videos, loading, error, loadMore, hasMore, reset };
}
