import { useCallback } from 'react';
import type { MediaEventPayload, MediaEventHandler, DownloadEvent, ViewEvent } from '@foto-owl/media-core';
import { useMediaContext } from '../context.js';

export interface UseMediaEventsResult {
  /**
   * Subscribe to a media event. Returns an unsubscribe function.
   * Call the returned function (or use it in a useEffect cleanup) to unsubscribe.
   *
   * @example
   * ```tsx
   * useEffect(() => {
   *   return subscribe('view', (payload) => {
   *     analytics.track('media_view', payload);
   *   });
   * }, [subscribe]);
   * ```
   */
  subscribe<T extends MediaEventPayload>(
    event: T['type'],
    handler: MediaEventHandler<T>
  ): () => void;

  /**
   * Emit a media event from the app layer.
   * Call this when the user downloads or views an item.
   *
   * @example
   * ```tsx
   * emit('download', { mediaType: 'photo', id: photo.id, url: photo.src.original });
   * emit('view',     { mediaType: 'video', id: video.id });
   * ```
   */
  emit<T extends MediaEventPayload>(
    event: T['type'],
    payload: Omit<T, 'type' | 'timestamp'>
  ): void;

  /** Convenience — emit a download event for a photo or video */
  emitDownload(payload: Omit<DownloadEvent, 'type' | 'timestamp'>): void;

  /** Convenience — emit a view event for a photo or video */
  emitView(payload: Omit<ViewEvent, 'type' | 'timestamp'>): void;
}

/**
 * Exposes the SDK event system to React components.
 *
 * The default console logger is already running (installed in createClient()).
 * Use this hook to add additional subscribers (analytics, logging, etc.)
 * or to emit events when the user performs an action.
 */
export function useMediaEvents(): UseMediaEventsResult {
  const { client } = useMediaContext();

  const subscribe = useCallback(
    <T extends MediaEventPayload>(event: T['type'], handler: MediaEventHandler<T>) => {
      return client.on(event, handler);
    },
    [client]
  );

  const emit = useCallback(
    <T extends MediaEventPayload>(
      event: T['type'],
      payload: Omit<T, 'type' | 'timestamp'>
    ) => {
      client.emit(event, payload);
    },
    [client]
  );

  const emitDownload = useCallback(
    (payload: Omit<DownloadEvent, 'type' | 'timestamp'>) => {
      client.emit('download', payload);
    },
    [client]
  );

  const emitView = useCallback(
    (payload: Omit<ViewEvent, 'type' | 'timestamp'>) => {
      client.emit('view', payload);
    },
    [client]
  );

  return { subscribe, emit, emitDownload, emitView };
}
