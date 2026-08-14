import type {
  Video,
  VideoFile,
  VideoPicture,
  VideoSearchResult,
  TrendingVideosResult,
  SearchVideosParams,
  PaginationParams,
} from '../types.js';
import { AuthError, NetworkError, NotFoundError, ApiError } from '../errors.js';
import type { Cache } from '../cache.js';
import type { Auth } from '../auth.js';

const BASE_URL = 'https://api.pexels.com/videos';

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers (shared pattern with photos — kept local to each module
// to avoid a shared util that might be misused)
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
  const cached = cache.get<T>(cacheKey);
  if (cached !== undefined) return cached;

  const inflight = cache.getInflight<T>(cacheKey);
  if (inflight) return inflight;

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
      if (err instanceof AuthError || err instanceof NotFoundError || err instanceof ApiError) {
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
// Mappers
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapVideoFile(raw: any): VideoFile {
  return {
    id: raw.id as number,
    quality: raw.quality as VideoFile['quality'],
    fileType: raw.file_type as string,
    width: (raw.width as number | null) ?? null,
    height: (raw.height as number | null) ?? null,
    link: raw.link as string,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapVideoPicture(raw: any): VideoPicture {
  return {
    id: raw.id as number,
    picture: raw.picture as string,
    nr: raw.nr as number,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapVideo(raw: any): Video {
  return {
    id: raw.id as number,
    width: raw.width as number,
    height: raw.height as number,
    url: raw.url as string,
    image: raw.image as string,
    duration: raw.duration as number,
    user: {
      id: raw.user.id as number,
      name: raw.user.name as string,
      url: raw.user.url as string,
    },
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    videoFiles: (raw.video_files as unknown[]).map(mapVideoFile),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    videoPictures: (raw.video_pictures as unknown[]).map(mapVideoPicture),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapVideoPage(raw: any, videos: Video[]): VideoSearchResult {
  return {
    totalResults: raw.total_results as number,
    page: raw.page as number,
    perPage: raw.per_page as number,
    prevPage: (raw.prev_page as string | undefined) ?? null,
    nextPage: (raw.next_page as string | undefined) ?? null,
    videos,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API functions
// ─────────────────────────────────────────────────────────────────────────────

export async function searchVideos(
  params: SearchVideosParams,
  auth: Auth,
  cache: Cache,
  fetcher: typeof fetch
): Promise<VideoSearchResult> {
  const query: Record<string, unknown> = {
    query: params.query,
    page: params.page ?? 1,
    per_page: params.perPage ?? 20,
    ...(params.orientation !== undefined && { orientation: params.orientation }),
    ...(params.size !== undefined && { size: params.size }),
    ...(params.locale !== undefined && { locale: params.locale }),
  };

  const cacheKey = buildCacheKey('/videos/search', query);
  const url = `${BASE_URL}/search?${new URLSearchParams(
    Object.entries(query).map(([k, v]) => [k, String(v)])
  ).toString()}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await apiFetch<any>(url, auth.getHeaders(), fetcher, cache, cacheKey);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const videos: Video[] = (raw.videos as unknown[]).map(mapVideo);
  return mapVideoPage(raw, videos);
}

export async function getTrendingVideos(
  params: PaginationParams = {},
  auth: Auth,
  cache: Cache,
  fetcher: typeof fetch
): Promise<TrendingVideosResult> {
  const query: Record<string, unknown> = {
    page: params.page ?? 1,
    per_page: params.perPage ?? 20,
  };

  const cacheKey = buildCacheKey('/videos/popular', query);
  const url = `${BASE_URL}/popular?${new URLSearchParams(
    Object.entries(query).map(([k, v]) => [k, String(v)])
  ).toString()}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await apiFetch<any>(url, auth.getHeaders(), fetcher, cache, cacheKey);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const videos: Video[] = (raw.videos as unknown[]).map(mapVideo);
  return mapVideoPage(raw, videos) as TrendingVideosResult;
}

export async function getVideo(
  id: number,
  auth: Auth,
  cache: Cache,
  fetcher: typeof fetch
): Promise<Video> {
  const cacheKey = `/videos/${id}`;
  const url = `${BASE_URL}/videos/${id}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await apiFetch<any>(url, auth.getHeaders(), fetcher, cache, cacheKey);
  return mapVideo(raw);
}
