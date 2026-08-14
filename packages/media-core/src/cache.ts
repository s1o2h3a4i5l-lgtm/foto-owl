import type { CacheConfig } from './types.js';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_MAX_SIZE = 200;

/**
 * In-memory cache with two layers:
 *
 * 1. `resultCache` — stores resolved data with a TTL timestamp.
 *    Used to avoid re-fetching identical requests.
 *
 * 2. `inflightCache` — stores in-progress Promise objects keyed by cache key.
 *    Used to deduplicate concurrent requests for the same resource
 *    (e.g., two components both mounting and calling getPhoto(42) simultaneously).
 *    The second call receives the same Promise, not a second fetch.
 *
 * Eviction: simple LRU-style — when maxSize is exceeded, the oldest entry is removed.
 * Keys are insertion-ordered in the Map, so the first key is oldest.
 */
export interface Cache {
  get<T>(key: string): T | undefined;
  set<T>(key: string, data: T): void;
  getInflight<T>(key: string): Promise<T> | undefined;
  setInflight<T>(key: string, promise: Promise<T>): void;
  deleteInflight(key: string): void;
  invalidate(key: string): void;
  clear(): void;
}

export function createCache(config: CacheConfig = {}): Cache {
  const ttl = config.ttl ?? DEFAULT_TTL;
  const maxSize = config.maxSize ?? DEFAULT_MAX_SIZE;

  const resultCache = new Map<string, CacheEntry<unknown>>();
  const inflightCache = new Map<string, Promise<unknown>>();

  function evictIfNeeded(): void {
    if (resultCache.size >= maxSize) {
      const firstKey = resultCache.keys().next().value;
      if (firstKey !== undefined) {
        resultCache.delete(firstKey);
      }
    }
  }

  function get<T>(key: string): T | undefined {
    const entry = resultCache.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.timestamp > ttl) {
      resultCache.delete(key);
      return undefined;
    }
    return entry.data as T;
  }

  function set<T>(key: string, data: T): void {
    // If key already exists, delete first to reset insertion order for LRU
    if (resultCache.has(key)) {
      resultCache.delete(key);
    }
    evictIfNeeded();
    resultCache.set(key, { data, timestamp: Date.now() });
  }

  function getInflight<T>(key: string): Promise<T> | undefined {
    return inflightCache.get(key) as Promise<T> | undefined;
  }

  function setInflight<T>(key: string, promise: Promise<T>): void {
    inflightCache.set(key, promise as Promise<unknown>);
  }

  function deleteInflight(key: string): void {
    inflightCache.delete(key);
  }

  function invalidate(key: string): void {
    resultCache.delete(key);
    inflightCache.delete(key);
  }

  function clear(): void {
    resultCache.clear();
    inflightCache.clear();
  }

  return { get, set, getInflight, setInflight, deleteInflight, invalidate, clear };
}
