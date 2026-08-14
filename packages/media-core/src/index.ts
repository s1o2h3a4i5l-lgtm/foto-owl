// Public API surface of @foto-owl/media-core
// Everything exported here is part of the stable contract.

export { createClient } from './client.js';

// Types — consumers need these for typing their own code
export type {
  // DTOs
  Photo,
  PhotoSrc,
  Video,
  VideoFile,
  VideoPicture,
  // Result shapes
  PhotoSearchResult,
  VideoSearchResult,
  CuratedPhotosResult,
  TrendingVideosResult,
  PaginationMeta,
  // Params
  SearchPhotosParams,
  SearchVideosParams,
  PaginationParams,
  // Events
  MediaEventType,
  MediaEventPayload,
  MediaEventHandler,
  DownloadEvent,
  ViewEvent,
  // Config
  ClientConfig,
  CacheConfig,
  // Client interface
  MediaClient,
} from './types.js';

// Errors — consumers should be able to instanceof-check these
export { MediaError, AuthError, NetworkError, NotFoundError, ApiError } from './errors.js';
