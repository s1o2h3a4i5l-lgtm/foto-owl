# SKILL: Using Headless UI Components from `media-ui-react`

## Purpose
This skill teaches an AI coding assistant how to correctly consume `@foto-owl/media-ui-react`
when building UI for a media application.

Read this before writing any component that imports from `@foto-owl/media-ui-react`.

---

## Package Overview

`@foto-owl/media-ui-react` exports **three headless hooks**:
- `useGrid` — photo/video grid with infinite scroll
- `useLightbox` — image/video overlay with keyboard and focus management
- `useReelSwiper` — vertical snap scroll with active-item tracking

**Headless means:**
- These hooks return behavior props (event handlers, ARIA attributes, refs).
- They ship **zero styles** and **zero markup**.
- You supply all JSX and CSS.
- They have **zero knowledge of Pexels, media-core, or media-react**.

Dependency direction:
```
your-component → media-ui-react    (behavior only)
your-component → media-react       (data only — separate import)
```
**Never import `@foto-owl/media-react` or `@foto-owl/media-core` from within `media-ui-react`.**

---

## The Prop-Getter Pattern

Each hook returns "prop-getter" functions. Call them and spread their return value
onto your DOM elements. The hook decides what event handlers and ARIA attributes are needed;
you decide the element type, className, and styles.

```tsx
// ✅ Correct — spread getItemProps onto your element
<li {...getItemProps(photo, index)} className="my-grid-item">
  <img src={photo.src.medium} />
</li>

// ❌ Wrong — don't reconstruct props manually
<li onClick={() => onItemClick(photo, index)} className="my-grid-item">
```

---

## `useGrid` — Photo/Video Grid

### Props
```ts
interface UseGridProps<T extends GridItem> {
  items: T[];                         // your data array (must have id: number|string)
  onItemClick?: (item, index) => void; // called when user clicks or presses Enter/Space
  onLoadMore?: () => void;            // called when sentinel enters viewport
  hasMore?: boolean;                  // whether to observe the sentinel
  loading?: boolean;                  // suppresses observer while loading
}
```

### Returns
```ts
{
  getContainerProps: () => HTMLAttributes   // role="list"
  getItemProps: (item, index) => HTMLAttributes  // role, tabIndex, onClick, onKeyDown, aria-posinset
  getSentinelProps: () => { ref }           // attach IntersectionObserver
  isLoading: boolean
}
```

### Usage
```tsx
import { useGrid } from '@foto-owl/media-ui-react';

// photos come from useSearch/useCurated — NOT from this package
const { getContainerProps, getItemProps, getSentinelProps } = useGrid({
  items: photos,
  onItemClick: (photo, index) => openLightbox(index),
  onLoadMore: loadMore,
  hasMore,
  loading,
});

return (
  <ul {...getContainerProps()} className="photo-grid">
    {photos.map((photo, i) => (
      <li key={photo.id} {...getItemProps(photo, i)} className="photo-item">
        <img src={photo.src.medium} alt={photo.alt} />
      </li>
    ))}
    {/* Place sentinel AFTER all items */}
    <div {...getSentinelProps()} style={{ height: 1 }} aria-hidden="true" />
  </ul>
);
```

### CSS you must write
```css
.photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.photo-item { cursor: pointer; border-radius: 8px; overflow: hidden; }
.photo-item:focus-visible { outline: 2px solid #6366f1; }
```

### Accessibility notes
- `getContainerProps` adds `role="list"` — use `<ul>` or `<div>` consistently.
- `getItemProps` adds `role="listitem"`, `tabIndex={0}`, keyboard handler, and `aria-posinset` / `aria-setsize`.
- Do **not** override `tabIndex` or `role` on the item — that would break keyboard navigation.

---

## `useLightbox` — Image/Video Overlay

### Props
```ts
interface UseLightboxProps {
  items: LightboxItem[];     // { id, type: 'photo'|'video', src, alt?, videoSrc? }
  initialIndex?: number;     // which item to show first
  isOpen: boolean;           // controlled open state
  onClose: () => void;       // called by Escape key, close button, or click-outside
  onDownload?: (item) => void;
}
```

### Returns
```ts
{
  currentIndex: number
  currentItem: LightboxItem | null
  isOpen: boolean
  goTo: (index) => void
  goNext: () => void
  goPrev: () => void
  getOverlayProps: () => HTMLAttributes    // role=dialog, aria-modal, click-outside handler
  getContentProps: () => HTMLAttributes    // role=document, stopPropagation
  getCloseButtonProps: () => ButtonHTMLAttributes
  getPrevProps: () => ButtonHTMLAttributes
  getNextProps: () => ButtonHTMLAttributes
  getDownloadButtonProps: () => ButtonHTMLAttributes
  initialFocusRef: RefObject<HTMLButtonElement>
}
```

### Usage
```tsx
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useLightbox } from '@foto-owl/media-ui-react';

const [isOpen, setIsOpen] = useState(false);
const [index, setIndex] = useState(0);

const lb = useLightbox({
  items: lightboxItems,   // map your photos/videos to { id, type, src, alt }
  initialIndex: index,
  isOpen,
  onClose: () => setIsOpen(false),
  onDownload: (item) => window.open(item.src, '_blank'),
});

if (!lb.isOpen) return null;

return createPortal(
  <div {...lb.getOverlayProps()} className="overlay">
    <div {...lb.getContentProps()} className="lightbox">
      {/* Attach initialFocusRef to the FIRST button — focus moves here on open */}
      <button ref={lb.initialFocusRef} {...lb.getCloseButtonProps()} className="close-btn">✕</button>
      <button {...lb.getPrevProps()} className="nav-btn">‹</button>
      <img src={lb.currentItem?.src} alt={lb.currentItem?.alt} />
      <button {...lb.getNextProps()} className="nav-btn">›</button>
    </div>
  </div>,
  document.body
);
```

### Keyboard behaviour (built-in — do NOT re-implement)
| Key | Action |
|---|---|
| `Escape` | Close lightbox, restore focus |
| `ArrowLeft` | Go to previous item (wraps) |
| `ArrowRight` | Go to next item (wraps) |
| `Tab` | Cycles through focusable elements inside lightbox only (focus trap) |
| `Shift+Tab` | Reverse cycle |

### CSS you must write
```css
.overlay {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(0,0,0,0.9);
  display: flex; align-items: center; justify-content: center;
}
.lightbox { position: relative; max-width: 90vw; }
```

### Accessibility notes
- `getOverlayProps` sets `role="dialog"` and `aria-modal="true"` — required for screen readers to announce the modal.
- `getCloseButtonProps` includes `aria-label="Close lightbox"` — do not add another label.
- When the lightbox closes, focus returns automatically to the element that opened it.
- `initialFocusRef` **must** be attached to the close button (or first focusable element) — the hook uses it to move focus in.

### Video support
```tsx
{lb.currentItem?.type === 'video' && lb.currentItem.videoSrc ? (
  <video src={lb.currentItem.videoSrc} controls autoPlay poster={lb.currentItem.src} />
) : (
  <img src={lb.currentItem?.src} alt={lb.currentItem?.alt} />
)}
```

---

## `useReelSwiper` — Vertical Snap Scroll

### Props
```ts
interface UseReelSwiperProps<T extends ReelItem> {
  items: T[];                            // must have id: number|string
  onActiveChange?: (item, index) => void; // called when active slide changes
}
```

### Returns
```ts
{
  activeIndex: number
  getContainerProps: () => { ref, onScroll, ...HTMLAttributes }
  getSlideProps: (item, index) => HTMLAttributes   // includes aria-current
  scrollTo: (index) => void                        // programmatic scroll
}
```

### Usage
```tsx
import { useReelSwiper } from '@foto-owl/media-ui-react';

const { getContainerProps, getSlideProps, activeIndex, scrollTo } = useReelSwiper({
  items: videos,
  onActiveChange: (video, index) => console.log('Now showing:', video.id),
});

return (
  <div {...getContainerProps()} className="reel">
    {videos.map((video, i) => (
      <div key={video.id} {...getSlideProps(video, i)} className="reel-slide">
        {i === activeIndex && <video src={video.videoFiles[0]?.link} autoPlay loop muted />}
      </div>
    ))}
  </div>
);
```

### CSS you MUST write (the hook does not provide this)
```css
.reel {
  height: 100vh;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;  /* ← essential — hook does not add this */
  scrollbar-width: none;
}
.reel::-webkit-scrollbar { display: none; }

.reel-slide {
  scroll-snap-align: start;       /* ← essential */
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### Important: why you must write the CSS
`useReelSwiper` tracks active index via scroll position math (`scrollTop / clientHeight`).
It does not inject `scroll-snap-type` because:
1. The hook has no access to the DOM before the consumer renders it.
2. Different consumers may want different snap behaviors (mandatory vs proximity, different heights).

**If you forget `scroll-snap-type: y mandatory` on the container and `scroll-snap-align: start` on slides, `activeIndex` will still update correctly but there will be no snap behaviour.**

### Accessibility notes
- `getSlideProps` sets `aria-current="true"` on the active slide.
- Consider adding `aria-label` to the container: `<div {...getContainerProps()} aria-label="Video reels">`.

---

## Mapping SDK Types to Library Types

The UI hooks accept simple generic types (`GridItem`, `LightboxItem`, `ReelItem`),
not SDK-specific types. You must map at the wiring layer (in your app component):

```tsx
// In your wiring component (where you import from both packages):
import type { Photo } from '@foto-owl/media-react';
import type { LightboxItem } from '@foto-owl/media-ui-react';

function toLight boxItem(photo: Photo): LightboxItem {
  return {
    id: photo.id,
    type: 'photo',
    src: photo.src.large2x,
    alt: photo.alt || `Photo by ${photo.photographer}`,
  };
}
```

The UI library never knows about `Photo`, `Video`, or Pexels. Mapping is the app's job.

---

## Common Mistakes

| Mistake | Correct approach |
|---|---|
| Importing from `@foto-owl/media-react` inside a `media-ui-react` component | Map in the app wiring component; never import SDK in UI hooks |
| Forgetting `scroll-snap-type` CSS for ReelSwiper | The hook does not add it — you must add it in your CSS |
| Overriding `tabIndex` or `role` from `getItemProps` | These are required for accessibility; don't remove them |
| Not using `createPortal` for Lightbox | Without a portal, `overflow: hidden` ancestors will clip the overlay |
| Not attaching `initialFocusRef` to a button | Focus won't move into the lightbox on open — screen reader inaccessible |
| Re-implementing keyboard handlers alongside `getOverlayProps` | The hook's keyboard handler is already wired; don't duplicate |
| Passing SDK `Photo[]` directly to `useGrid` | Cast to `GridItem` or intersect types: `photo as Photo & GridItem` |
| Not rendering the sentinel element for `useGrid` | Without `getSentinelProps()` applied to a rendered element, infinite scroll won't trigger |
