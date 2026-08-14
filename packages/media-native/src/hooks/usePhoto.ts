import { useState, useEffect } from 'react';
import type { Photo, MediaError } from '@foto-owl/media-core';
import { useMediaContext } from '../context.js';

export interface UsePhotoResult { photo: Photo | null; loading: boolean; error: MediaError | Error | null; }

export function usePhoto(id: number | null | undefined): UsePhotoResult {
  const { client } = useMediaContext();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<MediaError | Error | null>(null);

  useEffect(() => {
    if (id === null || id === undefined) { setPhoto(null); setLoading(false); setError(null); return; }
    let cancelled = false;
    setLoading(true); setError(null);
    client.getPhoto(id)
      .then((result) => { if (cancelled) return; setPhoto(result); })
      .catch((err: unknown) => { if (cancelled) return; setError(err as Error); })
      .finally(() => { if (cancelled) return; setLoading(false); });
    return () => { cancelled = true; };
  }, [client, id]);

  return { photo, loading, error };
}
