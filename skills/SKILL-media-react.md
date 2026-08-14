# SKILL: Wiring Data with `media-react`

## Purpose
This skill teaches an AI coding assistant how to correctly consume `@foto-owl/media-react`
when building UI that needs Pexels photo and video data.

Read this before writing any code that imports from `@foto-owl/media-react`.

---

## Package Overview

`@foto-owl/media-react` is a thin React adapter over `@foto-owl/media-core`.
It provides a `<MediaProvider>` and a set of data hooks.
It contains **no UI components** and **no styles**.

Dependency direction:
```
your-component → media-react → media-core
```
Never import `@foto-owl/media-core` directly in your components. Use the hooks.

---

## Step 1: Wrap Your App in `<MediaProvider>`

This **must** be an ancestor of every component that uses a hook.
Do it once, high in the tree (e.g., in `main.tsx` or your app root).

```tsx
import { MediaProvider } from '@foto-owl/media-react';

// API key comes from environment — never hardcoded in component code
const apiKey = import.meta.env.VITE_PEXELS_API_KEY;

createRoot(root).render(
  <MediaProvider apiKey={apiKey}>
    <App />
  </MediaProvider>
);
```

**Common mistake:** Calling any hook *before* `<MediaProvider>` renders will throw:
> `[media-react] useMediaContext() called outside of <MediaProvider>`

---

## Step 2: Fetch Photos and Videos with `useSearch`

```tsx
import { useSearch } from '@foto-owl/media-react';

function PhotoResults({ query }: { query: string }) {
  const { photos, videos, loading, error, loadMore, hasMore, reset } = useSearch(query, {
    perPage: 20,        // optional, default 20
    enabled: true,      // set false to defer fetching (e.g., while user is typing)
  });

  if (loading && photos.length === 0) return <p>Loading…</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <>
      {photos.map(photo => <img key={photo.id} src={photo.src.medium} alt={photo.alt} />)}
      {hasMore && <button onClick={loadMore}>Load more</button>}
    </>
  );
}
```

**Behaviour:**
- Changing `query` automatically resets `photos` and `videos` to page 1.
- `loadMore()` appends the next page — results accumulate for infinite scroll.
- Both photos AND videos are fetched in a single `useSearch` call (parallel requests).
- `enabled: false` prevents any fetch until you set it to `true`.

---

## Step 3: Trending Photos with `useCurated`

```tsx
import { useCurated } from '@foto-owl/media-react';

const { photos, loading, error, loadMore, hasMore } = useCurated({ perPage: 20 });
```

No query needed. Pexels curated feed. Same pagination pattern as `useSearch`.

---

## Step 4: Single Item Fetches

```tsx
import { usePhoto, useVideo } from '@foto-owl/media-react';

// Returns { photo: Photo | null, loading, error }
const { photo, loading, error } = usePhoto(photoId);

// Returns { video: Video | null, loading, error }
const { video, loading } = useVideo(videoId);
```

Pass `null` or `undefined` to either hook to reset (no fetch will occur).

---

## Step 5: Subscribe to Events with `useMediaEvents`

The SDK emits `download` and `view` events. The default console logger is installed
automatically in `media-core` — you don't need to set it up.

Use `useMediaEvents` to **add additional subscribers** (analytics, custom logging)
or to **emit events** when users take actions.

```tsx
import { useEffect } from 'react';
import { useMediaEvents } from '@foto-owl/media-react';

function MyComponent() {
  const { subscribe, emitView, emitDownload } = useMediaEvents();

  // Subscribe to events (e.g., for analytics)
  useEffect(() => {
    return subscribe('view', (payload) => {
      analytics.track('media_viewed', {
        mediaType: payload.mediaType,
        id: payload.id,
        timestamp: payload.timestamp,
      });
    });
    // The returned function unsubscribes on unmount
  }, [subscribe]);

  // Emit a view event when user opens a photo
  const handleOpen = (photo: Photo) => {
    emitView({ mediaType: 'photo', id: photo.id });
  };

  // Emit a download event when user downloads
  const handleDownload = (photo: Photo) => {
    emitDownload({ mediaType: 'photo', id: photo.id, url: photo.src.original });
  };
}
```

**Event payload shapes:**
```ts
// 'view' event
{ type: 'view'; mediaType: 'photo' | 'video'; id: number; timestamp: number }

// 'download' event
{ type: 'download'; mediaType: 'photo' | 'video'; id: number; url: string; timestamp: number }
```

**Important:** `subscribe()` returns an unsubscribe function. Always return it from
`useEffect` to avoid memory leaks.

---

## Step 6: Escape Hatch — `useMediaClient`

Only use this if the specific hooks don't cover your use case.

```tsx
import { useMediaClient } from '@foto-owl/media-react';

const client = useMediaClient();
const result = await client.searchPhotos({ query: 'cats', perPage: 5 });
```

---

## Full Type Reference

```ts
// Photo
interface Photo {
  id: number;
  width: number; height: number;
  url: string;
  photographer: string; photographerUrl: string; photographerId: number;
  avgColor: string | null;
  src: {
    original: string; large2x: string; large: string;
    medium: string; small: string; portrait: string;
    landscape: string; tiny: string;
  };
  liked: boolean;
  alt: string;
}

// Video
interface Video {
  id: number;
  width: number; height: number;
  url: string; image: string; duration: number;
  user: { id: number; name: string; url: string };
  videoFiles: Array<{ id: number; quality: 'sd'|'hd'|'uhd'; fileType: string; width: number|null; height: number|null; link: string }>;
  videoPictures: Array<{ id: number; picture: string; nr: number }>;
}
```

---

## Common Mistakes

| Mistake | Correct approach |
|---|---|
| `import { createClient } from '@foto-owl/media-core'` in a component | Use hooks from `media-react` instead |
| Calling a hook before `<MediaProvider>` renders | Ensure `<MediaProvider>` wraps the entire subtree |
| Forgetting to return `subscribe()` result from `useEffect` | Always `return subscribe(...)` for cleanup |
| Trying to emit events without `useMediaEvents` | Use `useMediaEvents().emitView()` or `emitDownload()` |
| Sharing one `useSearch` state across many components | Create one hook instance per feature, pass data as props |
| Calling `loadMore()` while `loading === true` | The hook guards against this, but avoid in UI too |
| Importing from `@foto-owl/media-react` in a UI component | The UI components in `@foto-owl/media-ui-react` must NOT import from here |
