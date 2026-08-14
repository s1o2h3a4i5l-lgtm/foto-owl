/// <reference types="vitest" />
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { MediaProvider } from '../MediaProvider.js';
import { useSearch } from '../hooks/useSearch.js';
import { useMediaEvents } from '../hooks/useMediaEvents.js';
import { MediaContext } from '../context.js';
import type { MediaClient, Photo } from '@foto-owl/media-core';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const mockPhoto: Photo = {
  id: 1,
  width: 800,
  height: 600,
  url: 'https://pexels.com/photo/1',
  photographer: 'Test',
  photographerUrl: 'https://pexels.com/test',
  photographerId: 10,
  avgColor: null,
  src: {
    original: 'o.jpg',
    large2x: 'l2.jpg',
    large: 'l.jpg',
    medium: 'm.jpg',
    small: 's.jpg',
    portrait: 'p.jpg',
    landscape: 'land.jpg',
    tiny: 't.jpg',
  },
  liked: false,
  alt: 'Test photo',
};

function makeClient(overrides: Partial<MediaClient> = {}): MediaClient {
  return {
    searchPhotos: vi.fn().mockResolvedValue({
      photos: [mockPhoto],
      videos: [],
      totalResults: 1,
      page: 1,
      perPage: 20,
      prevPage: null,
      nextPage: null,
    }),
    searchVideos: vi.fn().mockResolvedValue({
      videos: [],
      totalResults: 0,
      page: 1,
      perPage: 20,
      prevPage: null,
      nextPage: null,
    }),
    getCuratedPhotos: vi.fn().mockResolvedValue({
      photos: [mockPhoto],
      totalResults: 1,
      page: 1,
      perPage: 20,
      prevPage: null,
      nextPage: null,
    }),
    getTrendingVideos: vi.fn().mockResolvedValue({
      videos: [],
      totalResults: 0,
      page: 1,
      perPage: 20,
      prevPage: null,
      nextPage: null,
    }),
    getPhoto: vi.fn().mockResolvedValue(mockPhoto),
    getVideo: vi.fn().mockRejectedValue(new Error('not found')),
    on: vi.fn().mockReturnValue(() => undefined),
    off: vi.fn(),
    emit: vi.fn(),
    ...overrides,
  } as unknown as MediaClient;
}

function wrapper(client: MediaClient) {
  // We need to bypass createClient in MediaProvider — so we inject via a custom provider
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MediaContext.Provider value={{ client }}>
        {children}
      </MediaContext.Provider>
    );
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('useSearch', () => {
  it('fetches photos and videos on mount when query is non-empty', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useSearch('mountains'), { wrapper: wrapper(client) });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.photos).toHaveLength(1);
    expect(result.current.photos[0]?.id).toBe(1);
  });

  it('does not fetch when enabled is false', async () => {
    const client = makeClient();
    renderHook(() => useSearch('cats', { enabled: false }), { wrapper: wrapper(client) });

    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });

    expect(client.searchPhotos).not.toHaveBeenCalled();
  });

  it('does not fetch when query is empty', async () => {
    const client = makeClient();
    renderHook(() => useSearch(''), { wrapper: wrapper(client) });

    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });

    expect(client.searchPhotos).not.toHaveBeenCalled();
  });

  it('supports pagination, appends results, and updates hasMore/termination', async () => {
    const client = makeClient({
      searchPhotos: vi.fn()
        .mockResolvedValueOnce({
          photos: [mockPhoto],
          videos: [],
          totalResults: 2,
          page: 1,
          perPage: 1,
          prevPage: null,
          nextPage: 'https://api.pexels.com/v1/search?page=2&per_page=1&query=mountains',
        })
        .mockResolvedValueOnce({
          photos: [{ ...mockPhoto, id: 2 }],
          videos: [],
          totalResults: 2,
          page: 2,
          perPage: 1,
          prevPage: 'https://api.pexels.com/v1/search?page=1&per_page=1&query=mountains',
          nextPage: null,
        }),
    });

    const { result } = renderHook(() => useSearch('mountains'), { wrapper: wrapper(client) });

    // Wait for first page to load
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.photos).toHaveLength(1);
    expect(result.current.hasMore).toBe(true);

    // Load page 2
    act(() => {
      result.current.loadMore();
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.photos).toHaveLength(2);
    expect(result.current.photos[0]?.id).toBe(1);
    expect(result.current.photos[1]?.id).toBe(2);
    expect(result.current.hasMore).toBe(false); // second page nextPage is null
  });

  it('filters out duplicate IDs in appended results', async () => {
    const client = makeClient({
      searchPhotos: vi.fn()
        .mockResolvedValueOnce({
          photos: [mockPhoto],
          videos: [],
          totalResults: 2,
          page: 1,
          perPage: 1,
          prevPage: null,
          nextPage: 'some-next-page-link',
        })
        .mockResolvedValueOnce({
          // Returns mockPhoto again (duplicate ID: 1)
          photos: [mockPhoto],
          videos: [],
          totalResults: 2,
          page: 2,
          perPage: 1,
          prevPage: 'some-prev-page-link',
          nextPage: null,
        }),
    });

    const { result } = renderHook(() => useSearch('mountains'), { wrapper: wrapper(client) });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.photos).toHaveLength(1);

    act(() => {
      result.current.loadMore();
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    // Should still have length 1 because ID: 1 was a duplicate
    expect(result.current.photos).toHaveLength(1);
  });
});

describe('useMediaEvents', () => {
  it('subscribe registers a handler and returns unsubscribe', () => {
    const client = makeClient();
    const unsubFn = vi.fn();
    (client.on as ReturnType<typeof vi.fn>).mockReturnValue(unsubFn);

    const { result } = renderHook(() => useMediaEvents(), { wrapper: wrapper(client) });

    const handler = vi.fn();
    const unsub = result.current.subscribe('view', handler);

    expect(client.on).toHaveBeenCalledWith('view', handler);
    unsub();
    expect(unsubFn).toHaveBeenCalled();
  });

  it('emitView calls client.emit with correct payload shape', () => {
    const client = makeClient();
    const { result } = renderHook(() => useMediaEvents(), { wrapper: wrapper(client) });

    act(() => {
      result.current.emitView({ mediaType: 'photo', id: 42 });
    });

    expect(client.emit).toHaveBeenCalledWith('view', { mediaType: 'photo', id: 42 });
  });

  it('emitDownload calls client.emit with correct payload shape', () => {
    const client = makeClient();
    const { result } = renderHook(() => useMediaEvents(), { wrapper: wrapper(client) });

    act(() => {
      result.current.emitDownload({ mediaType: 'video', id: 7, url: 'https://example.com/v.mp4' });
    });

    expect(client.emit).toHaveBeenCalledWith('download', {
      mediaType: 'video',
      id: 7,
      url: 'https://example.com/v.mp4',
    });
  });
});

describe('MediaProvider', () => {
  it('throws a descriptive error when hook is used outside provider', () => {
    expect(() => {
      renderHook(() => useSearch('test'));
    }).toThrow('[media-react] useMediaContext()');
  });
});
