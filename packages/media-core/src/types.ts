// ─────────────────────────────────────────────────────────────────────────────
// Public DTOs — Pexels API response shapes
// ─────────────────────────────────────────────────────────────────────────────

export interface PhotoSrc {
  original: string;
  large2x: string;
  large: string;
  medium: string;
  small: string;
  portrait: string;
  landscape: string;
  tiny: string;
}

export interface Photo {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographerUrl: string;
  photographerId: number;
  avgColor: string | null;
  src: PhotoSrc;
  liked: boolean;
  alt: string;
}

export interface VideoFile {
  id: number;
  quality: 'sd' | 'hd' | 'uhd';
  fileType: string;
  width: number | null;
  height: number | null;
  link: string;
}

export interface VideoPicture {
  id: number;
  picture: string;
  nr: number;
}

export interface Video {
  id: number;
  width: number;
  height: number;
  url: string;
  image: string;
  duration: number;
  user: {
    id: number;
    name: string;
    url: string;
  };
  videoFiles: VideoFile[];
  videoPictures: VideoPicture[];
}

export interface PaginationMeta {
  totalResults: number;
  page: number;
  perPage: number;
  prevPage: string | null;
  nextPage: string | null;
}

export interface PhotoSearchResult extends PaginationMeta {
  photos: Photo[];
}

export interface VideoSearchResult extends PaginationMeta {
  videos: Video[];
}

export interface CuratedPhotosResult extends PaginationMeta {
  photos: Photo[];
}

export interface TrendingVideosResult extends PaginationMeta {
  videos: Video[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Search parameters
// ─────────────────────────────────────────────────────────────────────────────

export interface SearchPhotosParams {
  query: string;
  orientation?: 'landscape' | 'portrait' | 'square';
  size?: 'large' | 'medium' | 'small';
  color?: string;
  locale?: string;
  page?: number;
  perPage?: number;
}

export interface SearchVideosParams {
  query: string;
  orientation?: 'landscape' | 'portrait' | 'square';
  size?: 'large' | 'medium' | 'small';
  locale?: string;
  page?: number;
  perPage?: number;
}

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Event system
// ─────────────────────────────────────────────────────────────────────────────

export type MediaEventType = 'download' | 'view';

export interface DownloadEvent {
  type: 'download';
  mediaType: 'photo' | 'video';
  id: number;
  url: string;
  timestamp: number;
}

export interface ViewEvent {
  type: 'view';
  mediaType: 'photo' | 'video';
  id: number;
  timestamp: number;
}

export type MediaEventPayload = DownloadEvent | ViewEvent;

export type MediaEventHandler<T extends MediaEventPayload = MediaEventPayload> = (
  payload: T
) => void;

// ─────────────────────────────────────────────────────────────────────────────
// Client configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface CacheConfig {
  /** TTL in milliseconds. Default: 5 minutes */
  ttl?: number;
  /** Maximum number of cached entries. Default: 200 */
  maxSize?: number;
}

export interface ClientConfig {
  apiKey: string;
  cache?: CacheConfig;
  /**
   * Inject a custom fetch implementation (useful for testing or non-browser environments).
   * Defaults to the global fetch.
   */
  fetcher?: typeof fetch;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public MediaClient interface
// ─────────────────────────────────────────────────────────────────────────────

export interface MediaClient {
  /** Search for photos */
  searchPhotos(params: SearchPhotosParams): Promise<PhotoSearchResult>;
  /** Search for videos */
  searchVideos(params: SearchVideosParams): Promise<VideoSearchResult>;
  /** Get curated/trending photos */
  getCuratedPhotos(params?: PaginationParams): Promise<CuratedPhotosResult>;
  /** Get trending videos */
  getTrendingVideos(params?: PaginationParams): Promise<TrendingVideosResult>;
  /** Get a single photo by ID */
  getPhoto(id: number): Promise<Photo>;
  /** Get a single video by ID */
  getVideo(id: number): Promise<Video>;

  /** Subscribe to an event. Returns an unsubscribe function. */
  on<T extends MediaEventPayload>(
    event: T['type'],
    handler: MediaEventHandler<T>
  ): () => void;
  /** Unsubscribe a handler */
  off<T extends MediaEventPayload>(event: T['type'], handler: MediaEventHandler<T>): void;
  /** Emit an event (app layer calls this to signal download/view) */
  emit<T extends MediaEventPayload>(event: T['type'], payload: Omit<T, 'type' | 'timestamp'>): void;
}
