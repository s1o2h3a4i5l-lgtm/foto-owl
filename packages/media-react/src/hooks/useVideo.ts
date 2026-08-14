import { useState, useEffect } from 'react';
import type { Video, MediaError } from '@foto-owl/media-core';
import { useMediaContext } from '../context.js';

export interface UseVideoResult {
  video: Video | null;
  loading: boolean;
  error: MediaError | Error | null;
}

/**
 * Fetches a single video by its Pexels ID.
 *
 * @example
 * ```tsx
 * const { video, loading, error } = useVideo(12345);
 * ```
 */
export function useVideo(id: number | null | undefined): UseVideoResult {
  const { client } = useMediaContext();

  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<MediaError | Error | null>(null);

  useEffect(() => {
    if (id === null || id === undefined) {
      setVideo(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    client
      .getVideo(id)
      .then((result) => {
        if (cancelled) return;
        setVideo(result);
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
  }, [client, id]);

  return { video, loading, error };
}
