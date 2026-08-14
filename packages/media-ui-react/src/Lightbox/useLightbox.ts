import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type HTMLAttributes,
  type ButtonHTMLAttributes,
  type RefObject,
} from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface LightboxItem {
  id: number | string;
  type: 'photo' | 'video';
  /** URL for image display or video poster */
  src: string;
  /** Accessible description */
  alt?: string;
  /** For video items — the playable video URL */
  videoSrc?: string;
}

export interface UseLightboxProps {
  items: LightboxItem[];
  /** Index to open at. Pass -1 or undefined when closed. */
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (item: LightboxItem) => void;
}

export interface UseLightboxResult {
  currentIndex: number;
  currentItem: LightboxItem | null;
  isOpen: boolean;
  goTo: (index: number) => void;
  goNext: () => void;
  goPrev: () => void;

  /**
   * Spread on the outer overlay/backdrop element.
   * Handles: role="dialog", aria-modal, aria-label, click-outside-to-close.
   */
  getOverlayProps: () => HTMLAttributes<HTMLElement>;

  /**
   * Spread on the inner content container.
   * Stops click propagation so clicking content doesn't close the overlay.
   */
  getContentProps: () => HTMLAttributes<HTMLElement>;

  /** Close button — aria-label, onClick */
  getCloseButtonProps: () => ButtonHTMLAttributes<HTMLButtonElement>;

  /** Previous button — aria-label, onClick, aria-disabled */
  getPrevProps: () => ButtonHTMLAttributes<HTMLButtonElement>;

  /** Next button — aria-label, onClick, aria-disabled */
  getNextProps: () => ButtonHTMLAttributes<HTMLButtonElement>;

  /** Download button — aria-label, onClick */
  getDownloadButtonProps: () => ButtonHTMLAttributes<HTMLButtonElement>;

  /** Ref for focus management — attach to the first focusable element inside the lightbox */
  initialFocusRef: RefObject<HTMLButtonElement>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Focus trap utility
// ─────────────────────────────────────────────────────────────────────────────

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS));
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * useLightbox — headless lightbox with keyboard navigation and focus trap.
 *
 * Behavior provided:
 * - Open/close state
 * - Previous/next navigation (wraps around)
 * - Keyboard: Escape = close, ArrowLeft = prev, ArrowRight = next, Tab = focus trap
 * - ARIA: role="dialog", aria-modal="true", aria-label on buttons
 * - Focus: moves to the close button when lightbox opens; trapped while open
 * - Click outside: clicking the overlay closes the lightbox
 *
 * No markup, no styles shipped. Consumer supplies all JSX and CSS.
 *
 * @example
 * ```tsx
 * const lb = useLightbox({ items, isOpen, onClose });
 *
 * if (!lb.isOpen) return null;
 * return (
 *   <div {...lb.getOverlayProps()} className="overlay">
 *     <div {...lb.getContentProps()} className="content">
 *       <button ref={lb.initialFocusRef} {...lb.getCloseButtonProps()}>✕</button>
 *       <button {...lb.getPrevProps()}>‹</button>
 *       <img src={lb.currentItem?.src} alt={lb.currentItem?.alt} />
 *       <button {...lb.getNextProps()}>›</button>
 *     </div>
 *   </div>
 * );
 * ```
 */
export function useLightbox({
  items,
  initialIndex = 0,
  isOpen,
  onClose,
  onDownload,
}: UseLightboxProps): UseLightboxResult {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const overlayRef = useRef<HTMLElement | null>(null);
  const initialFocusRef = useRef<HTMLButtonElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Sync index when initialIndex prop changes (e.g., clicking a different item)
  useEffect(() => {
    if (isOpen) setCurrentIndex(initialIndex);
  }, [isOpen, initialIndex]);

  // Move focus into lightbox when it opens
  useEffect(() => {
    if (!isOpen) return;
    // Defer to allow the DOM to render
    const raf = requestAnimationFrame(() => {
      initialFocusRef.current?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [isOpen]);

  // Keyboard handler: Escape, ArrowLeft, ArrowRight, Tab (focus trap)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onCloseRef.current();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setCurrentIndex((i) => (i > 0 ? i - 1 : items.length - 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setCurrentIndex((i) => (i < items.length - 1 ? i + 1 : 0));
          break;
        case 'Tab': {
          const overlay = overlayRef.current;
          if (!overlay) break;
          const focusable = getFocusableElements(overlay);
          if (focusable.length === 0) break;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            }
          } else {
            if (document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, items.length]);

  // Restore focus to the element that opened the lightbox on close
  const triggerRef = useRef<Element | null>(null);
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
    } else {
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
    }
  }, [isOpen]);

  const currentItem = isOpen ? (items[currentIndex] ?? null) : null;

  const goTo = useCallback(
    (index: number) => setCurrentIndex(Math.max(0, Math.min(index, items.length - 1))),
    [items.length]
  );

  const goNext = useCallback(
    () => setCurrentIndex((i) => (i < items.length - 1 ? i + 1 : 0)),
    [items.length]
  );

  const goPrev = useCallback(
    () => setCurrentIndex((i) => (i > 0 ? i - 1 : items.length - 1)),
    [items.length]
  );

  const getOverlayProps = useCallback(
    (): HTMLAttributes<HTMLElement> => ({
      role: 'dialog',
      'aria-modal': true,
      'aria-label': 'Media lightbox',
      ref: (el: HTMLElement | null) => { overlayRef.current = el; },
      onClick: (e) => {
        // Close only when clicking the overlay itself, not its children
        if (e.target === e.currentTarget) onCloseRef.current();
      },
    } as HTMLAttributes<HTMLElement>),
    []
  );

  const getContentProps = useCallback(
    (): HTMLAttributes<HTMLElement> => ({
      role: 'document',
      onClick: (e) => e.stopPropagation(),
    }),
    []
  );

  const getCloseButtonProps = useCallback(
    (): ButtonHTMLAttributes<HTMLButtonElement> => ({
      type: 'button',
      'aria-label': 'Close lightbox',
      onClick: onClose,
    }),
    [onClose]
  );

  const getPrevProps = useCallback(
    (): ButtonHTMLAttributes<HTMLButtonElement> => ({
      type: 'button',
      'aria-label': 'Previous item',
      'aria-disabled': items.length <= 1,
      onClick: goPrev,
    }),
    [goPrev, items.length]
  );

  const getNextProps = useCallback(
    (): ButtonHTMLAttributes<HTMLButtonElement> => ({
      type: 'button',
      'aria-label': 'Next item',
      'aria-disabled': items.length <= 1,
      onClick: goNext,
    }),
    [goNext, items.length]
  );

  const getDownloadButtonProps = useCallback(
    (): ButtonHTMLAttributes<HTMLButtonElement> => ({
      type: 'button',
      'aria-label': `Download ${currentItem?.type ?? 'item'}`,
      onClick: () => currentItem && onDownload?.(currentItem),
    }),
    [currentItem, onDownload]
  );

  return {
    currentIndex,
    currentItem,
    isOpen,
    goTo,
    goNext,
    goPrev,
    getOverlayProps,
    getContentProps,
    getCloseButtonProps,
    getPrevProps,
    getNextProps,
    getDownloadButtonProps,
    initialFocusRef: initialFocusRef as unknown as RefObject<HTMLButtonElement>,
  };
}
