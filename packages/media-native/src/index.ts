export { MediaProvider } from './MediaProvider.js';
export type { MediaProviderProps } from './MediaProvider.js';

export { useSearch } from './hooks/useSearch.js';
export type { UseSearchResult, UseSearchOptions } from './hooks/useSearch.js';

export { useCurated } from './hooks/useCurated.js';
export type { UseCuratedResult, UseCuratedOptions } from './hooks/useCurated.js';

export { usePhoto } from './hooks/usePhoto.js';
export type { UsePhotoResult } from './hooks/usePhoto.js';

export { useVideo } from './hooks/useVideo.js';
export type { UseVideoResult } from './hooks/useVideo.js';

export { useMediaEvents } from './hooks/useMediaEvents.js';
export type { UseMediaEventsResult } from './hooks/useMediaEvents.js';

export { useMediaClient } from './hooks/useMediaClient.js';

export type {
  Photo,
  Video,
  PhotoSearchResult,
  VideoSearchResult,
  MediaClient,
  MediaEventPayload,
  DownloadEvent,
  ViewEvent,
} from '@foto-owl/media-core';
