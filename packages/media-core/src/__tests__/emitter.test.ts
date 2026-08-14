/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEmitter } from '../emitter.js';
import type { DownloadEvent } from '../types.js';

describe('createEmitter', () => {
  it('calls registered handler when event is emitted', () => {
    const emitter = createEmitter();
    const handler = vi.fn();
    emitter.on('view', handler);
    emitter.emit('view', { mediaType: 'photo', id: 1 });
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'view', mediaType: 'photo', id: 1 })
    );
  });

  it('stamps a timestamp on emitted events', () => {
    const emitter = createEmitter();
    const handler = vi.fn();
    emitter.on('download', handler);
    emitter.emit<DownloadEvent>('download', { mediaType: 'video', id: 2, url: 'http://example.com' });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(typeof handler.mock.calls[0]?.[0]?.timestamp).toBe('number');
  });

  it('off() removes the handler', () => {
    const emitter = createEmitter();
    const handler = vi.fn();
    emitter.on('view', handler);
    emitter.off('view', handler);
    emitter.emit('view', { mediaType: 'photo', id: 1 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('on() returns an unsubscribe function', () => {
    const emitter = createEmitter();
    const handler = vi.fn();
    const unsub = emitter.on('view', handler);
    unsub();
    emitter.emit('view', { mediaType: 'photo', id: 1 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('once() fires once and auto-unsubscribes', () => {
    const emitter = createEmitter();
    const handler = vi.fn();
    emitter.once('view', handler);
    emitter.emit('view', { mediaType: 'photo', id: 1 });
    emitter.emit('view', { mediaType: 'photo', id: 2 });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('multiple handlers can be registered for the same event', () => {
    const emitter = createEmitter();
    const h1 = vi.fn();
    const h2 = vi.fn();
    emitter.on('view', h1);
    emitter.on('view', h2);
    emitter.emit('view', { mediaType: 'photo', id: 1 });
    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it('handler errors do not prevent other handlers from running', () => {
    const emitter = createEmitter();
    const errHandler = vi.fn(() => { throw new Error('handler error'); });
    const okHandler = vi.fn();
    emitter.on('view', errHandler);
    emitter.on('view', okHandler);
    expect(() => emitter.emit('view', { mediaType: 'photo', id: 1 })).not.toThrow();
    expect(okHandler).toHaveBeenCalledOnce();
  });
});
