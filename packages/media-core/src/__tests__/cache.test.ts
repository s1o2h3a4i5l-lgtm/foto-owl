/// <reference types="vitest" />
import { describe, it, expect } from 'vitest';
import { createCache } from '../cache.js';

describe('createCache', () => {
  it('returns undefined for a missing key', () => {
    const cache = createCache();
    expect(cache.get('missing')).toBeUndefined();
  });

  it('stores and retrieves a value', () => {
    const cache = createCache();
    cache.set('key', { data: 'hello' });
    expect(cache.get('key')).toEqual({ data: 'hello' });
  });

  it('returns undefined after TTL expires', async () => {
    const cache = createCache({ ttl: 10 }); // 10ms TTL
    cache.set('key', 'value');
    await new Promise((r) => setTimeout(r, 20));
    expect(cache.get('key')).toBeUndefined();
  });

  it('evicts oldest entry when maxSize is exceeded', () => {
    const cache = createCache({ maxSize: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3); // 'a' should be evicted
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
  });

  it('deduplicates inflight requests', async () => {
    const cache = createCache();
    const promise = Promise.resolve('result');
    cache.setInflight('key', promise);
    expect(cache.getInflight('key')).toBe(promise);
  });

  it('deleteInflight removes the inflight entry', () => {
    const cache = createCache();
    const promise = Promise.resolve('result');
    cache.setInflight('key', promise);
    cache.deleteInflight('key');
    expect(cache.getInflight('key')).toBeUndefined();
  });

  it('invalidate removes both result and inflight', () => {
    const cache = createCache();
    cache.set('key', 'data');
    cache.setInflight('key', Promise.resolve('x'));
    cache.invalidate('key');
    expect(cache.get('key')).toBeUndefined();
    expect(cache.getInflight('key')).toBeUndefined();
  });

  it('clear empties all caches', () => {
    const cache = createCache();
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
  });
});
