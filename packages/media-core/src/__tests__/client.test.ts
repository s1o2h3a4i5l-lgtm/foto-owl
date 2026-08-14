/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '../client.js';
import type { DownloadEvent } from '../types.js';

// Mock Pexels photo response
const mockPhoto = {
  id: 1,
  width: 800,
  height: 600,
  url: 'https://pexels.com/photo/1',
  photographer: 'Test Photographer',
  photographer_url: 'https://pexels.com/photographer',
  photographer_id: 10,
  avg_color: '#aabbcc',
  src: {
    original: 'https://example.com/original.jpg',
    large2x: 'https://example.com/large2x.jpg',
    large: 'https://example.com/large.jpg',
    medium: 'https://example.com/medium.jpg',
    small: 'https://example.com/small.jpg',
    portrait: 'https://example.com/portrait.jpg',
    landscape: 'https://example.com/landscape.jpg',
    tiny: 'https://example.com/tiny.jpg',
  },
  liked: false,
  alt: 'A test photo',
};

const mockSearchResponse = {
  total_results: 100,
  page: 1,
  per_page: 20,
  photos: [mockPhoto],
  next_page: 'https://api.pexels.com/v1/search?page=2',
};

function makeFetcher(response: object, status = 200): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(response),
  } as Response);
}

describe('createClient', () => {
  it('throws if no apiKey is provided', () => {
    expect(() => createClient({ apiKey: '' })).toThrow();
  });

  it('searchPhotos returns mapped PhotoSearchResult', async () => {
    const fetcher = makeFetcher(mockSearchResponse);
    const client = createClient({ apiKey: 'test-key', fetcher });

    const result = await client.searchPhotos({ query: 'mountains' });

    expect(result.photos).toHaveLength(1);
    expect(result.photos[0]?.id).toBe(1);
    expect(result.photos[0]?.photographer).toBe('Test Photographer');
    expect(result.photos[0]?.src.medium).toBe('https://example.com/medium.jpg');
    expect(result.nextPage).toBe('https://api.pexels.com/v1/search?page=2');
    expect(result.totalResults).toBe(100);
  });

  it('deduplicates concurrent identical requests', async () => {
    const fetcher = makeFetcher(mockSearchResponse);
    const client = createClient({ apiKey: 'test-key', fetcher });

    const [r1, r2] = await Promise.all([
      client.searchPhotos({ query: 'cats', page: 1 }),
      client.searchPhotos({ query: 'cats', page: 1 }),
    ]);

    // Fetcher should only have been called once
    expect(fetcher).toHaveBeenCalledOnce();
    expect(r1).toEqual(r2); // Same resolved data from cache
  });

  it('serves subsequent identical requests from cache', async () => {
    const fetcher = makeFetcher(mockSearchResponse);
    const client = createClient({ apiKey: 'test-key', fetcher });

    await client.searchPhotos({ query: 'dogs' });
    await client.searchPhotos({ query: 'dogs' });

    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('throws AuthError on 401', async () => {
    const fetcher = makeFetcher({}, 401);
    const client = createClient({ apiKey: 'bad-key', fetcher });

    await expect(client.searchPhotos({ query: 'test' })).rejects.toMatchObject({
      name: 'AuthError',
    });
  });

  it('throws NotFoundError on 404', async () => {
    const fetcher = makeFetcher({}, 404);
    const client = createClient({ apiKey: 'test-key', fetcher });

    await expect(client.getPhoto(9999)).rejects.toMatchObject({
      name: 'NotFoundError',
    });
  });

  it('emits download event correctly', () => {
    const fetcher = makeFetcher(mockSearchResponse);
    const client = createClient({ apiKey: 'test-key', fetcher });
    const handler = vi.fn();

    client.on('download', handler);
    client.emit<DownloadEvent>('download', { mediaType: 'photo', id: 1, url: 'https://example.com/img.jpg' });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'download', mediaType: 'photo', id: 1 })
    );
  });

  it('on() returns unsubscribe, off() stops receiving events', () => {
    const client = createClient({ apiKey: 'test-key' });
    const handler = vi.fn();

    const unsub = client.on('view', handler);
    client.emit('view', { mediaType: 'photo', id: 1 });
    expect(handler).toHaveBeenCalledOnce();

    unsub();
    client.emit('view', { mediaType: 'photo', id: 2 });
    expect(handler).toHaveBeenCalledOnce(); // still once
  });
});
