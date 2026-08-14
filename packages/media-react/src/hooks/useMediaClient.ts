import { useMediaContext } from '../context.js';
import type { MediaClient } from '@foto-owl/media-core';

/**
 * Returns the raw MediaClient instance — an escape hatch for advanced usage
 * not covered by the provided hooks.
 *
 * Prefer the specific hooks (useSearch, useCurated, etc.) when possible.
 *
 * @example
 * ```tsx
 * const client = useMediaClient();
 * const result = await client.searchPhotos({ query: 'cats', perPage: 5 });
 * ```
 */
export function useMediaClient(): MediaClient {
  return useMediaContext().client;
}
