import { useState, useEffect, useCallback, useRef } from 'react';
import type { Photo, Video, SearchPhotosParams, SearchVideosParams, MediaError } from '@foto-owl/media-core';
import { useMediaContext } from '../context.js';

export interface UseSearchOptions {
  perPage?: number;
  enabled?: boolean;
}

export interface UseSearchResult {
  photos: Photo[];
  videos: Video[];
  loading: boolean;
  error: MediaError | Error | null;
  /**
   * Call this to load the next page.
   * In React Native, wire this to FlatList's onEndReached prop via useGrid.
   */
  loadMore: () => void;
  hasMore: boolean;
  reset: () => void;
}

/**
 * React Native version of useSearch.
 *
 * Identical API to media-react's useSearch. No IntersectionObserver —
 * load-more is triggered imperatively via the returned loadMore() function,
 * which is intended to be wired to FlatList's onEndReached.
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

  const queryRef = useRef(query);

  useEffect(() => {
    if (queryRef.current !== query) {
      queryRef.current = query;
      setPhotos([]);
      setVideos([]);
      setPage(1);
      setHasMore(false);
      setError(null);
    }
  }, [query]);

  useEffect(() => {
    if (!enabled || !query.trim()) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const params: SearchPhotosParams & SearchVideosParams = { query, page, perPage };

    Promise.all([client.searchPhotos(params), client.searchVideos(params)])
      .then(([photoResult, videoResult]) => {
        if (cancelled) return;
        setPhotos((prev) => (page === 1 ? photoResult.photos : [...prev, ...photoResult.photos]));
        setVideos((prev) => (page === 1 ? videoResult.videos : [...prev, ...videoResult.videos]));
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

    return () => { cancelled = true; };
  }, [client, query, page, perPage, enabled]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) setPage((p) => p + 1);
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
