import { createContext, useContext } from 'react';
import type { MediaClient } from '@foto-owl/media-core';

export interface MediaContextValue {
  client: MediaClient;
}

export const MediaContext = createContext<MediaContextValue | null>(null);

/**
 * Returns the MediaClient from context.
 * Throws a descriptive error if called outside <MediaProvider>.
 */
export function useMediaContext(): MediaContextValue {
  const ctx = useContext(MediaContext);
  if (!ctx) {
    throw new Error(
      '[media-react] useMediaContext() called outside of <MediaProvider>. ' +
        'Wrap your component tree with <MediaProvider apiKey="...">.'
    );
  }
  return ctx;
}
