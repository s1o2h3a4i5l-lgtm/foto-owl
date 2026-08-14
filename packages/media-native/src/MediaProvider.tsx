import React, { useMemo, type ReactNode } from 'react';
import { createClient } from '@foto-owl/media-core';
import type { CacheConfig } from '@foto-owl/media-core';
import { MediaContext } from './context.js';

export interface MediaProviderProps {
  /** Your Pexels API key. */
  apiKey: string;
  cache?: CacheConfig;
  children: ReactNode;
}

/**
 * <MediaProvider> for React Native.
 *
 * Identical contract to media-react's MediaProvider. The default console
 * event logger is installed by createClient() in media-core, not here.
 *
 * Note: Does NOT depend on Expo. Works in any React Native project.
 *
 * @example
 * ```tsx
 * <MediaProvider apiKey={PEXELS_API_KEY}>
 *   <App />
 * </MediaProvider>
 * ```
 */
export function MediaProvider({ apiKey, cache, children }: MediaProviderProps): React.JSX.Element {
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
