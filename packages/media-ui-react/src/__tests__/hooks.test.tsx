/// <reference types="vitest" />
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGrid } from '../Grid/useGrid.js';
import { useLightbox } from '../Lightbox/useLightbox.js';
import { useReelSwiper } from '../ReelSwiper/useReelSwiper.js';

// ─────────────────────────────────────────────────────────────────────────────
// useGrid
// ─────────────────────────────────────────────────────────────────────────────

describe('useGrid', () => {
  const items = [
    { id: 1, title: 'Photo 1' },
    { id: 2, title: 'Photo 2' },
    { id: 3, title: 'Photo 3' },
  ];

  it('getContainerProps returns role=list', () => {
    const { result } = renderHook(() => useGrid({ items }));
    expect(result.current.getContainerProps()).toMatchObject({ role: 'list' });
  });

  it('getItemProps returns correct ARIA and role attributes', () => {
    const { result } = renderHook(() => useGrid({ items }));
    const props = result.current.getItemProps(items[0]!, 0);
    expect(props.role).toBe('listitem');
    expect(props.tabIndex).toBe(0);
    expect(props['aria-posinset']).toBe(1);
    expect(props['aria-setsize']).toBe(3);
  });

  it('getItemProps onClick calls onItemClick', () => {
    const onItemClick = vi.fn();
    const { result } = renderHook(() => useGrid({ items, onItemClick }));
    const props = result.current.getItemProps(items[1]!, 1);
    props.onClick?.({} as React.MouseEvent<HTMLElement>);
    expect(onItemClick).toHaveBeenCalledWith(items[1], 1);
  });

  it('getItemProps onKeyDown Enter calls onItemClick', () => {
    const onItemClick = vi.fn();
    const { result } = renderHook(() => useGrid({ items, onItemClick }));
    const props = result.current.getItemProps(items[0]!, 0);
    props.onKeyDown?.({ key: 'Enter', preventDefault: vi.fn() } as unknown as React.KeyboardEvent<HTMLElement>);
    expect(onItemClick).toHaveBeenCalledWith(items[0], 0);
  });

  it('getItemProps onKeyDown Space calls onItemClick', () => {
    const onItemClick = vi.fn();
    const { result } = renderHook(() => useGrid({ items, onItemClick }));
    const props = result.current.getItemProps(items[0]!, 0);
    props.onKeyDown?.({ key: ' ', preventDefault: vi.fn() } as unknown as React.KeyboardEvent<HTMLElement>);
    expect(onItemClick).toHaveBeenCalledWith(items[0], 0);
  });

  it('getSentinelProps returns a ref object', () => {
    const { result } = renderHook(() => useGrid({ items }));
    const sentinelProps = result.current.getSentinelProps();
    expect(sentinelProps).toHaveProperty('ref');
  });

  it('isLoading reflects loading prop', () => {
    const { result } = renderHook(() => useGrid({ items, loading: true }));
    expect(result.current.isLoading).toBe(true);
  });

  it('ships no styles — getContainerProps has no style or className', () => {
    const { result } = renderHook(() => useGrid({ items }));
    const props = result.current.getContainerProps();
    expect(props).not.toHaveProperty('style');
    expect(props).not.toHaveProperty('className');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// useLightbox
// ─────────────────────────────────────────────────────────────────────────────

describe('useLightbox', () => {
  const items = [
    { id: 1, type: 'photo' as const, src: 'a.jpg', alt: 'Photo A' },
    { id: 2, type: 'photo' as const, src: 'b.jpg', alt: 'Photo B' },
    { id: 3, type: 'video' as const, src: 'poster.jpg', videoSrc: 'v.mp4' },
  ];

  it('currentItem is null when isOpen=false', () => {
    const { result } = renderHook(() =>
      useLightbox({ items, isOpen: false, onClose: vi.fn() })
    );
    expect(result.current.currentItem).toBeNull();
  });

  it('currentItem is the item at initialIndex when isOpen=true', () => {
    const { result } = renderHook(() =>
      useLightbox({ items, isOpen: true, initialIndex: 1, onClose: vi.fn() })
    );
    expect(result.current.currentItem?.id).toBe(2);
  });

  it('goNext advances to the next item', () => {
    const { result } = renderHook(() =>
      useLightbox({ items, isOpen: true, initialIndex: 0, onClose: vi.fn() })
    );
    act(() => result.current.goNext());
    expect(result.current.currentIndex).toBe(1);
  });

  it('goNext wraps around from last item to first', () => {
    const { result } = renderHook(() =>
      useLightbox({ items, isOpen: true, initialIndex: 2, onClose: vi.fn() })
    );
    act(() => result.current.goNext());
    expect(result.current.currentIndex).toBe(0);
  });

  it('goPrev wraps around from first item to last', () => {
    const { result } = renderHook(() =>
      useLightbox({ items, isOpen: true, initialIndex: 0, onClose: vi.fn() })
    );
    act(() => result.current.goPrev());
    expect(result.current.currentIndex).toBe(2);
  });

  it('getOverlayProps has role=dialog and aria-modal', () => {
    const { result } = renderHook(() =>
      useLightbox({ items, isOpen: true, onClose: vi.fn() })
    );
    const props = result.current.getOverlayProps();
    expect(props.role).toBe('dialog');
    expect(props['aria-modal']).toBe(true);
  });

  it('getCloseButtonProps calls onClose on click', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useLightbox({ items, isOpen: true, onClose })
    );
    const props = result.current.getCloseButtonProps();
    props.onClick?.({} as React.MouseEvent<HTMLButtonElement>);
    expect(onClose).toHaveBeenCalled();
  });

  it('getCloseButtonProps has aria-label', () => {
    const { result } = renderHook(() =>
      useLightbox({ items, isOpen: true, onClose: vi.fn() })
    );
    expect(result.current.getCloseButtonProps()['aria-label']).toBe('Close lightbox');
  });

  it('getDownloadButtonProps calls onDownload with current item', () => {
    const onDownload = vi.fn();
    const { result } = renderHook(() =>
      useLightbox({ items, isOpen: true, initialIndex: 0, onClose: vi.fn(), onDownload })
    );
    const props = result.current.getDownloadButtonProps();
    props.onClick?.({} as React.MouseEvent<HTMLButtonElement>);
    expect(onDownload).toHaveBeenCalledWith(items[0]);
  });

  it('ships no styles — getOverlayProps has no style or className', () => {
    const { result } = renderHook(() =>
      useLightbox({ items, isOpen: true, onClose: vi.fn() })
    );
    const props = result.current.getOverlayProps();
    expect(props).not.toHaveProperty('style');
    expect(props).not.toHaveProperty('className');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// useReelSwiper
// ─────────────────────────────────────────────────────────────────────────────

describe('useReelSwiper', () => {
  const items = [
    { id: 1, title: 'Video 1' },
    { id: 2, title: 'Video 2' },
    { id: 3, title: 'Video 3' },
  ];

  it('starts at activeIndex 0', () => {
    const { result } = renderHook(() => useReelSwiper({ items }));
    expect(result.current.activeIndex).toBe(0);
  });

  it('getContainerProps returns a ref and onScroll', () => {
    const { result } = renderHook(() => useReelSwiper({ items }));
    const props = result.current.getContainerProps();
    expect(props).toHaveProperty('ref');
    expect(typeof props.onScroll).toBe('function');
  });

  it('getSlideProps sets aria-current=true on active slide', () => {
    const { result } = renderHook(() => useReelSwiper({ items }));
    const activeProps = result.current.getSlideProps(items[0]!, 0);
    const inactiveProps = result.current.getSlideProps(items[1]!, 1);
    expect(activeProps['aria-current']).toBe('true');
    expect(inactiveProps['aria-current']).toBeUndefined();
  });

  it('ships no styles — getSlideProps has no style or className', () => {
    const { result } = renderHook(() => useReelSwiper({ items }));
    const props = result.current.getSlideProps(items[0]!, 0);
    expect(props).not.toHaveProperty('style');
    expect(props).not.toHaveProperty('className');
  });

  it('onActiveChange is called when activeIndex changes via scroll', () => {
    const onActiveChange = vi.fn();
    const { result } = renderHook(() => useReelSwiper({ items, onActiveChange }));

    // Simulate scroll to slide 1 (scrollTop = clientHeight)
    const container = { scrollTop: 500, clientHeight: 500 };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (result.current.getContainerProps().ref as any).current = container;

    act(() => {
      result.current.getContainerProps().onScroll();
    });

    expect(result.current.activeIndex).toBe(1);
    expect(onActiveChange).toHaveBeenCalledWith(items[1], 1);
  });
});
