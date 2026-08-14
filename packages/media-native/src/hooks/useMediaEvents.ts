import { useCallback } from 'react';
import type { MediaEventPayload, MediaEventHandler, DownloadEvent, ViewEvent } from '@foto-owl/media-core';
import { useMediaContext } from '../context.js';

export interface UseMediaEventsResult {
  subscribe<T extends MediaEventPayload>(event: T['type'], handler: MediaEventHandler<T>): () => void;
  emit<T extends MediaEventPayload>(event: T['type'], payload: Omit<T, 'type' | 'timestamp'>): void;
  emitDownload(payload: Omit<DownloadEvent, 'type' | 'timestamp'>): void;
  emitView(payload: Omit<ViewEvent, 'type' | 'timestamp'>): void;
}

/** Exposes the SDK event system in React Native components. Identical API to media-react's useMediaEvents. */
export function useMediaEvents(): UseMediaEventsResult {
  const { client } = useMediaContext();

  const subscribe = useCallback(
    <T extends MediaEventPayload>(event: T['type'], handler: MediaEventHandler<T>) =>
      client.on(event, handler),
    [client]
  );

  const emit = useCallback(
    <T extends MediaEventPayload>(event: T['type'], payload: Omit<T, 'type' | 'timestamp'>) => {
      client.emit(event, payload);
    },
    [client]
  );

  const emitDownload = useCallback(
    (payload: Omit<DownloadEvent, 'type' | 'timestamp'>) => { client.emit('download', payload); },
    [client]
  );

  const emitView = useCallback(
    (payload: Omit<ViewEvent, 'type' | 'timestamp'>) => { client.emit('view', payload); },
    [client]
  );

  return { subscribe, emit, emitDownload, emitView };
}
