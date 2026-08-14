import type {
  Photo,
  PhotoSearchResult,
  CuratedPhotosResult,
  SearchPhotosParams,
  PaginationParams,
} from '../types.js';
import { AuthError, NetworkError, NotFoundError, ApiError } from '../errors.js';
import type { Cache } from '../cache.js';
import type { Auth } from '../auth.js';

const BASE_URL = 'https://api.pexels.com/v1';

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildCacheKey(path: string, params: Record<string, unknown>): string {
  const sorted = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `${path}?${new URLSearchParams(sorted.map(([k, v]) => [k, String(v)])).toString()}`;
}

async function apiFetch<T>(
  url: string,
  headers: Record<string, string>,
  fetcher: typeof fetch,
  cache: Cache,
  cacheKey: string
): Promise<T> {
  // 1. Cache hit (resolved result)
  const cached = cache.get<T>(cacheKey);
  if (cached !== undefined) return cached;

  // 2. Inflight deduplication
  const inflight = cache.getInflight<T>(cacheKey);
  if (inflight) return inflight;

  // 3. New request
  const promise = (async (): Promise<T> => {
    try {
      const response = await fetcher(url, { headers });

      if (response.status === 401) throw new AuthError();
      if (response.status === 404) throw new NotFoundError(url);
      if (!response.ok) throw new ApiError(response.status);

      const data = (await response.json()) as T;
      cache.set(cacheKey, data);
      return data;
    } catch (err) {
      if (
        err instanceof AuthError ||
        err instanceof NotFoundError ||
        err instanceof ApiError
      ) {
        throw err;
      }
      throw new NetworkError(undefined, err);
    } finally {
      cache.deleteInflight(cacheKey);
    }
  })();

  cache.setInflight(cacheKey, promise);
  return promise;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pexels response → internal DTO mappers
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPhoto(raw: any): Photo {
  return {
    id: raw.id as number,
    width: raw.width as number,
    height: raw.height as number,
    url: raw.url as string,
    photographer: raw.photographer as string,
    photographerUrl: raw.photographer_url as string,
    photographerId: raw.photographer_id as number,
    avgColor: (raw.avg_color as string | null) ?? null,
    src: raw.src as Photo['src'],
    liked: Boolean(raw.liked),
    alt: (raw.alt as string) ?? '',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPhotoPage(raw: any, photos: Photo[]): Omit<PhotoSearchResult, 'photos'> {
  return {
    totalResults: raw.total_results as number,
    page: raw.page as number,
    perPage: raw.per_page as number,
    prevPage: (raw.prev_page as string | undefined) ?? null,
    nextPage: (raw.next_page as string | undefined) ?? null,
    photos,
  } as PhotoSearchResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API functions — all pure, injected deps, no global state
// ─────────────────────────────────────────────────────────────────────────────

export async function searchPhotos(
  params: SearchPhotosParams,
  auth: Auth,
  cache: Cache,
  fetcher: typeof fetch
): Promise<PhotoSearchResult> {
  const query: Record<string, unknown> = {
    query: params.query,
    page: params.page ?? 1,
    per_page: params.perPage ?? 20,
    ...(params.orientation !== undefined && { orientation: params.orientation }),
    ...(params.size !== undefined && { size: params.size }),
    ...(params.color !== undefined && { color: params.color }),
    ...(params.locale !== undefined && { locale: params.locale }),
  };

  const cacheKey = buildCacheKey('/v1/search', query);
  const url = `${BASE_URL}/search?${new URLSearchParams(
    Object.entries(query).map(([k, v]) => [k, String(v)])
  ).toString()}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await apiFetch<any>(url, auth.getHeaders(), fetcher, cache, cacheKey);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const photos: Photo[] = (raw.photos as unknown[]).map(mapPhoto);
  return mapPhotoPage(raw, photos) as PhotoSearchResult;
}

export async function getCuratedPhotos(
  params: PaginationParams = {},
  auth: Auth,
  cache: Cache,
  fetcher: typeof fetch
): Promise<CuratedPhotosResult> {
  const query: Record<string, unknown> = {
    page: params.page ?? 1,
    per_page: params.perPage ?? 20,
  };

  const cacheKey = buildCacheKey('/v1/curated', query);
  const url = `${BASE_URL}/curated?${new URLSearchParams(
    Object.entries(query).map(([k, v]) => [k, String(v)])
  ).toString()}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await apiFetch<any>(url, auth.getHeaders(), fetcher, cache, cacheKey);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const photos: Photo[] = (raw.photos as unknown[]).map(mapPhoto);
  return mapPhotoPage(raw, photos) as CuratedPhotosResult;
}

export async function getPhoto(
  id: number,
  auth: Auth,
  cache: Cache,
  fetcher: typeof fetch
): Promise<Photo> {
  const cacheKey = `/v1/photos/${id}`;
  const url = `${BASE_URL}/photos/${id}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await apiFetch<any>(url, auth.getHeaders(), fetcher, cache, cacheKey);
  return mapPhoto(raw);
}
