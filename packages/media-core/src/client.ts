import type {
  ClientConfig,
  MediaClient,
  SearchPhotosParams,
  SearchVideosParams,
  PaginationParams,
  PhotoSearchResult,
  VideoSearchResult,
  CuratedPhotosResult,
  TrendingVideosResult,
  Photo,
  Video,
  MediaEventPayload,
  MediaEventHandler,
  DownloadEvent,
  ViewEvent,
} from './types.js';
import { createAuth } from './auth.js';
import { createCache } from './cache.js';
import { createEmitter } from './emitter.js';
import {
  searchPhotos,
  getCuratedPhotos,
  getPhoto,
} from './api/photos.js';
import {
  searchVideos,
  getTrendingVideos,
  getVideo,
} from './api/videos.js';

/**
 * Creates and returns a configured MediaClient.
 *
 * This is the single entry point for the SDK.
 *
 * Default behaviour — installed here in core, not in any wrapper:
 *   - A console logger is attached for `download` and `view` events.
 *     This means the SDK logs activity correctly even when used from a CLI
 *     or any non-React environment, with no wrapper involved.
 *
 * @example
 * ```ts
 * import { createClient } from '@foto-owl/media-core';
 *
 * const client = createClient({ apiKey: 'YOUR_PEXELS_KEY' });
 * const result = await client.searchPhotos({ query: 'mountains' });
 * ```
 */
export function createClient(config: ClientConfig): MediaClient {
  const auth = createAuth(config.apiKey);
  const cache = createCache(config.cache);
  const emitter = createEmitter();
  const fetcher = config.fetcher ?? fetch;

  // ─────────────────────────────────────────────────────────────────────────
  // DEFAULT EVENT LOGGER — lives in core, not in any platform wrapper.
  // The app layer (or wrapper) may subscribe additional listeners via client.on().
  // ─────────────────────────────────────────────────────────────────────────
  emitter.on<DownloadEvent>('download', (payload) => {
    console.log(
      `[media-core] download — ${payload.mediaType} #${payload.id} at ${new Date(payload.timestamp).toISOString()}`
    );
  });

  emitter.on<ViewEvent>('view', (payload) => {
    console.log(
      `[media-core] view — ${payload.mediaType} #${payload.id} at ${new Date(payload.timestamp).toISOString()}`
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  // API methods — delegate to pure api/* functions with injected deps
  // ─────────────────────────────────────────────────────────────────────────

  function _searchPhotos(params: SearchPhotosParams): Promise<PhotoSearchResult> {
    return searchPhotos(params, auth, cache, fetcher);
  }

  function _searchVideos(params: SearchVideosParams): Promise<VideoSearchResult> {
    return searchVideos(params, auth, cache, fetcher);
  }

  function _getCuratedPhotos(params?: PaginationParams): Promise<CuratedPhotosResult> {
    return getCuratedPhotos(params, auth, cache, fetcher);
  }

  function _getTrendingVideos(params?: PaginationParams): Promise<TrendingVideosResult> {
    return getTrendingVideos(params, auth, cache, fetcher);
  }

  function _getPhoto(id: number): Promise<Photo> {
    return getPhoto(id, auth, cache, fetcher);
  }

  function _getVideo(id: number): Promise<Video> {
    return getVideo(id, auth, cache, fetcher);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Event API — delegate to emitter
  // ─────────────────────────────────────────────────────────────────────────

  function on<T extends MediaEventPayload>(
    event: T['type'],
    handler: MediaEventHandler<T>
  ): () => void {
    return emitter.on(event, handler);
  }

  function off<T extends MediaEventPayload>(
    event: T['type'],
    handler: MediaEventHandler<T>
  ): void {
    emitter.off(event, handler);
  }

  function emit<T extends MediaEventPayload>(
    event: T['type'],
    payload: Omit<T, 'type' | 'timestamp'>
  ): void {
    emitter.emit(event, payload);
  }

  return {
    searchPhotos: _searchPhotos,
    searchVideos: _searchVideos,
    getCuratedPhotos: _getCuratedPhotos,
    getTrendingVideos: _getTrendingVideos,
    getPhoto: _getPhoto,
    getVideo: _getVideo,
    on,
    off,
    emit,
  };
}
