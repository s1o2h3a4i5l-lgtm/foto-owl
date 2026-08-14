import { useMediaContext } from '../context.js';
import type { MediaClient } from '@foto-owl/media-core';

/** Escape hatch — returns the raw MediaClient. Prefer specific hooks when possible. */
export function useMediaClient(): MediaClient {
  return useMediaContext().client;
}
