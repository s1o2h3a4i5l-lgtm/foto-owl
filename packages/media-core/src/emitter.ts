import type { MediaEventPayload, MediaEventHandler, MediaEventType } from './types.js';

type HandlerMap = Map<string, Set<MediaEventHandler>>;

/**
 * Typed event emitter — hand-rolled, zero dependencies.
 *
 * Design decisions:
 * - Uses a Map<event, Set<handler>> internally for O(1) subscribe/unsubscribe.
 * - `on()` returns an unsubscribe function for easy cleanup in React effects.
 * - `once()` wraps the handler in a self-removing wrapper.
 * - Handlers are called synchronously — events are not queued/debounced.
 */
export interface TypedEmitter {
  on<T extends MediaEventPayload>(event: T['type'], handler: MediaEventHandler<T>): () => void;
  off<T extends MediaEventPayload>(event: T['type'], handler: MediaEventHandler<T>): void;
  once<T extends MediaEventPayload>(event: T['type'], handler: MediaEventHandler<T>): () => void;
  emit<T extends MediaEventPayload>(
    event: T['type'],
    payload: Omit<T, 'type' | 'timestamp'>
  ): void;
}

export function createEmitter(): TypedEmitter {
  const handlers: HandlerMap = new Map();

  function getSet(event: string): Set<MediaEventHandler> {
    let set = handlers.get(event);
    if (!set) {
      set = new Set();
      handlers.set(event, set);
    }
    return set;
  }

  function on<T extends MediaEventPayload>(
    event: T['type'],
    handler: MediaEventHandler<T>
  ): () => void {
    getSet(event).add(handler as MediaEventHandler);
    return () => off(event, handler);
  }

  function off<T extends MediaEventPayload>(
    event: T['type'],
    handler: MediaEventHandler<T>
  ): void {
    handlers.get(event)?.delete(handler as MediaEventHandler);
  }

  function once<T extends MediaEventPayload>(
    event: T['type'],
    handler: MediaEventHandler<T>
  ): () => void {
    const wrapper: MediaEventHandler<T> = (payload) => {
      handler(payload);
      off(event, wrapper);
    };
    return on(event, wrapper);
  }

  function emit<T extends MediaEventPayload>(
    event: T['type'],
    payload: Omit<T, 'type' | 'timestamp'>
  ): void {
    const fullPayload = {
      ...payload,
      type: event,
      timestamp: Date.now(),
    } as T;

    const set = handlers.get(event);
    if (!set) return;

    // Iterate over a copy so handlers can safely unsubscribe inside a handler
    for (const handler of [...set]) {
      try {
        handler(fullPayload);
      } catch (err) {
        // Swallow handler errors to prevent one bad listener from breaking others
        console.error('[media-core] Event handler threw:', err);
      }
    }
  }

  return { on, off, once, emit };
}

export type { MediaEventType };
