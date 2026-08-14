import React, { useMemo, type ReactNode } from 'react';
import { createClient } from '@foto-owl/media-core';
import type { CacheConfig } from '@foto-owl/media-core';
import { MediaContext } from './context.js';

export interface MediaProviderProps {
  /** Your Pexels API key. Passed to createClient() — never used directly in components. */
  apiKey: string;
  /** Optional cache configuration forwarded to media-core. */
  cache?: CacheConfig;
  children: ReactNode;
}

/**
 * <MediaProvider> — the root of the media data layer.
 *
 * Creates a MediaClient instance from media-core and provides it to all
 * descendant hooks via React context.
 *
 * The default console event logger is installed by createClient() itself
 * (inside media-core), not here. This provider does not attach any listeners.
 * The app layer can subscribe to additional events via useMediaEvents().
 *
 * @example
 * ```tsx
 * <MediaProvider apiKey={import.meta.env.VITE_PEXELS_API_KEY}>
 *   <App />
 * </MediaProvider>
 * ```
 */
export function MediaProvider({ apiKey, cache, children }: MediaProviderProps): React.JSX.Element {
  // useMemo ensures the client is created once per apiKey change,
  // not on every render. apiKey changing mid-session is an edge case
  // (e.g., dev hot-reload) but handled correctly.
  const client = useMemo(
    () => createClient({ apiKey, ...(cache !== undefined && { cache }) }),
    [apiKey] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <MediaContext.Provider value={{ client }}>
      {children}
    </MediaContext.Provider>
  );
}
